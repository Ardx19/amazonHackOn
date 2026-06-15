# backend/app/api/routes/routing.py
# POST /api/evaluate-route — Cascade routing
# GET /api/deals — Marketplace listings (with optional location filtering)

import math
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.services.routing_service import evaluate_route
from app.db.models import (
    FloatingDiscount as FloatingDiscountORM,
    HubCheckpoint as HubCheckpointORM,
)
from app.db.database import get_db
from app.schemas.schemas import RouteRequest, RoutingResponse
from app.core.config import (
    HUB_ZONES,
    RETURN_CENTER,
    PINCODE_COORDS,
    DEFAULT_USER_COORDS,
)

router = APIRouter(prefix="/api", tags=["routing"])


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _hub_coords(hub_id: str) -> tuple[float, float] | None:
    """Get lat/lng for a hub_id from config or return center."""
    if hub_id in HUB_ZONES:
        h = HUB_ZONES[hub_id]
        return (h["lat"], h["lng"])
    if hub_id == RETURN_CENTER["hub_id"]:
        return (RETURN_CENTER["lat"], RETURN_CENTER["lng"])
    # For dynamic checkpoints (H0_USER, CP_x), look up from hub_checkpoints later
    return None


class RouteResult(BaseModel):
    status: str = "ok"
    result: RoutingResponse


@router.post("/evaluate-route", response_model=RouteResult)
def route_product(body: RouteRequest, db: Session = Depends(get_db)):
    try:
        result = evaluate_route(
            db=db,
            item_id=body.item_id,
            original_price=body.original_price_inr,
            category=body.category,
            current_location=body.current_location,
            ring_index=body.ring_index,
        )
        db.commit()
        return RouteResult(result=RoutingResponse(**result))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


class DealItem(BaseModel):
    listing_id: str
    item_id: str
    product_name: Optional[str] = None
    current_hub_id: Optional[str] = None
    current_hub_name: Optional[str] = None
    ring_index: int = 0
    original_price_inr: float
    current_sale_price_inr: float
    discount_pct: float
    radius_km: float
    status: str


class DealsResponse(BaseModel):
    status: str = "ok"
    count: int
    deals: list[DealItem]


@router.get("/deals", response_model=DealsResponse)
def list_deals(
    hub_id: Optional[str] = Query(None),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    pincode: Optional[str] = Query(None),
    exclude_item_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    try:
        query = db.query(FloatingDiscountORM).filter_by(status="active")
        if hub_id:
            query = query.filter_by(current_hub_id=hub_id)
        if exclude_item_id:
            query = query.filter(FloatingDiscountORM.item_id != exclude_item_id)
        # Exclude returns with "not working" reasons
        bad_keywords = [
            "defective",
            "not working",
            "broken",
            "damaged",
            "doesn't work",
            "ineffective",
        ]
        for kw in bad_keywords:
            query = query.filter(
                or_(
                    FloatingDiscountORM.return_reason == None,
                    ~FloatingDiscountORM.return_reason.ilike(f"%{kw}%"),
                )
            )
        results = query.order_by(FloatingDiscountORM.discount_pct.desc()).all()

        # Resolve user coords: explicit lat/lng > pincode > no filter
        user_lat, user_lng = None, None
        if lat is not None and lng is not None:
            user_lat, user_lng = lat, lng
        elif pincode:
            user_lat, user_lng = PINCODE_COORDS.get(pincode, DEFAULT_USER_COORDS)

        deals = []
        for r in results:
            deal = DealItem(
                listing_id=r.listing_id,
                item_id=r.item_id,
                product_name=getattr(r, "product_name", None),
                current_hub_id=r.current_hub_id,
                current_hub_name=getattr(r, "current_hub_name", None),
                ring_index=r.ring_index or 0,
                original_price_inr=r.original_price_inr,
                current_sale_price_inr=r.current_sale_price_inr,
                discount_pct=r.discount_pct,
                radius_km=r.radius_km,
                status=r.status,
            )

            # Location filter: only show if user is within the deal's radius
            if user_lat is not None and user_lng is not None:
                # Prefer the listing's stored coords (precise). Fall back to
                # the hub registry for older/seeded listings.
                hub_coords = None
                if r.hub_lat is not None and r.hub_lng is not None:
                    hub_coords = (r.hub_lat, r.hub_lng)
                else:
                    hub_coords = _hub_coords(r.current_hub_id)
                if hub_coords:
                    dist = _haversine_km(
                        user_lat, user_lng, hub_coords[0], hub_coords[1]
                    )
                    if dist > r.radius_km:
                        continue  # User is outside the profitable radius
                # If coords can't be resolved at all, include by default

            deals.append(deal)

        return DealsResponse(count=len(deals), deals=deals)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
