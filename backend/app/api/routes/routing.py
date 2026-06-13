# backend/app/api/routes/routing.py
# POST /api/evaluate-route — Cascade routing
# GET /api/deals — Marketplace listings

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.services.routing_service import evaluate_route
from app.db.models import FloatingDiscount as FloatingDiscountORM
from app.db.database import get_db
from app.schemas.schemas import RouteRequest, RoutingResponse

router = APIRouter(prefix="/api", tags=["routing"])


class RouteResult(BaseModel):
    status: str = "ok"
    result: RoutingResponse


@router.post("/evaluate-route", response_model=RouteResult)
def route_product(body: RouteRequest):
    db = next(get_db())
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
    finally:
        db.close()


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
def list_deals(hub_id: Optional[str] = Query(None)):
    db = next(get_db())
    try:
        query = db.query(FloatingDiscountORM).filter_by(status="active")
        if hub_id:
            query = query.filter_by(current_hub_id=hub_id)
        results = query.order_by(FloatingDiscountORM.discount_pct.desc()).all()

        deals = [
            DealItem(
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
            for r in results
        ]

        return DealsResponse(count=len(deals), deals=deals)
    finally:
        db.close()
