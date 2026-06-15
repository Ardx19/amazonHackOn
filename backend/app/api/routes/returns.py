# backend/app/api/routes/returns.py
# POST /api/initiate-return — Full return pipeline (grade + path + float listing)
# POST /api/advance-ring — Move item to next checkpoint (simulation)

import uuid as _uuid

import boto3
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.core.config import (
    S3_BUCKET_IMAGES,
    AWS_REGION,
    PINCODE_COORDS,
    DEFAULT_USER_COORDS,
)
from app.db.database import get_db
from app.db.models import FloatingDiscount as FloatingDiscountORM
from app.services.return_service import (
    initiate_return,
    get_next_checkpoint,
    pincode_to_coords,
)
from app.services.routing_service import advance_to_next_ring

router = APIRouter(prefix="/api", tags=["returns"])
s3_client = boto3.client("s3", region_name=AWS_REGION)


# ─── Initiate Return ──────────────────────────────────────────────────────────


class InitiateReturnResponse(BaseModel):
    status: str = "ok"
    grading: dict
    route: dict
    trajectory_id: str
    checkpoints: list[dict]
    total_distance_km: float


@router.post("/initiate-return", response_model=InitiateReturnResponse)
async def api_initiate_return(
    images: list[UploadFile] = File(...),
    item_id: str = Form(...),
    product_name: str = Form(...),
    category: str = Form(...),
    original_price_inr: float = Form(...),
    pincode: str = Form("400069"),
    return_reason: str = Form(""),
    db: Session = Depends(get_db),
):
    """Priya confirms her return. We grade the product, generate the return path,
    and create the floating discount listing — all in one call. Priya's refund
    is issued; she never sees the float pricing."""
    if not images:
        raise HTTPException(status_code=400, detail="At least one image required")

    s3_keys = []
    try:
        for img in images[:3]:
            content = await img.read()
            unique_key = f"{_uuid.uuid4().hex}/{img.filename}"
            s3_client.put_object(
                Bucket=S3_BUCKET_IMAGES,
                Key=unique_key,
                Body=content,
                ContentType=img.content_type,
            )
            s3_keys.append(unique_key)

        user_lat, user_lng = pincode_to_coords(pincode)

        result = initiate_return(
            db=db,
            item_id=item_id,
            product_name=product_name,
            category=category,
            original_price_inr=original_price_inr,
            s3_keys=s3_keys,
            user_lat=user_lat,
            user_lng=user_lng,
            return_reason=return_reason,
        )

        return InitiateReturnResponse(
            grading=result["grading_report"],
            route=result["route_result"],
            trajectory_id=result["trajectory_id"],
            checkpoints=result["checkpoints"],
            total_distance_km=result["total_distance_km"],
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Advance Ring (Simulation) ────────────────────────────────────────────────


class AdvanceRingRequest(BaseModel):
    item_id: str
    category: str


class AdvanceRingResponse(BaseModel):
    status: str = "ok"
    item_id: str
    listing_id: str
    ring_index: int
    sale_price_inr: float
    radius_km: float
    discount_pct: float
    hub_id: str
    hub_name: str | None = None
    reached_rc: bool = False


@router.post("/advance-ring", response_model=AdvanceRingResponse)
def api_advance_ring(body: AdvanceRingRequest, db: Session = Depends(get_db)):
    """Move the item's listing to the next checkpoint. Called manually from the
    simulation page to demo the floating discount cascade."""
    try:
        listing = (
            db.query(FloatingDiscountORM)
            .filter_by(item_id=body.item_id, status="active")
            .first()
        )
        if not listing:
            raise HTTPException(
                status_code=404, detail=f"No active listing for item {body.item_id}"
            )

        current_ring = listing.ring_index or 0
        next_cp = get_next_checkpoint(db, body.item_id, current_ring)

        if next_cp is None:
            # Item has reached the Return Center — mark listing as expired
            listing.status = "expired"
            db.commit()
            return AdvanceRingResponse(
                item_id=body.item_id,
                listing_id=listing.listing_id,
                ring_index=current_ring,
                sale_price_inr=listing.current_sale_price_inr,
                radius_km=0,
                discount_pct=0,
                hub_id="RC_BHIWANDI",
                hub_name="Bhiwandi Return Center",
                reached_rc=True,
            )

        result = advance_to_next_ring(
            db=db,
            item_id=body.item_id,
            listing_id=listing.listing_id,
            next_hub_id=next_cp["hub_id"],
            distance_to_rc_km=next_cp["distance_to_warehouse_km"],
            category=body.category,
            next_hub_name=next_cp.get("hub_name"),
            next_hub_lat=next_cp.get("lat"),
            next_hub_lng=next_cp.get("lng"),
        )
        db.commit()

        return AdvanceRingResponse(
            item_id=result["item_id"],
            listing_id=result["listing_id"],
            ring_index=result["ring_index"],
            sale_price_inr=result["sale_price_inr"],
            radius_km=result["radius_km"],
            discount_pct=result["discount_pct"],
            hub_id=next_cp["hub_id"],
            hub_name=next_cp.get("hub_name"),
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
