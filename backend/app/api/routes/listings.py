# backend/app/api/routes/listings.py
# POST /api/listings — Create C2C listing
# GET  /api/listings — Fetch all C2C listings

import boto3
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import S3_BUCKET_IMAGES, AWS_REGION
from app.db.models import C2CListing as C2CListingORM, HealthCard as HealthCardORM
from app.db.database import get_db
from app.schemas.schemas import (
    C2CListingRequest,
    C2CListingResponse,
    HealthCard,
    Defect,
)

router = APIRouter(prefix="/api", tags=["listings"])

IST = timezone(timedelta(hours=5, minutes=30))
s3_client = boto3.client("s3", region_name=AWS_REGION)

PRESIGNED_EXPIRY = 604800  # 7 days


def _extract_s3_key(url: str) -> Optional[str]:
    """If url is an S3 object URL, return the key part (everything after
    .amazonaws.com/). Returns None for non-S3 URLs (blob:, unsplash, etc.)."""
    if not url or not isinstance(url, str):
        return None
    marker = f"{S3_BUCKET_IMAGES}.s3.{AWS_REGION}.amazonaws.com/"
    idx = url.find(marker)
    if idx == -1:
        return None
    return url[idx + len(marker) :]


def _presigned_url(s3_key: str) -> str:
    """Generate a presigned GET URL for a private S3 object."""
    return s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET_IMAGES, "Key": s3_key},
        ExpiresIn=PRESIGNED_EXPIRY,
    )


def _resolve_image_url(url: str) -> str:
    """If the stored value is an S3 key (or a full S3 URL), convert to a
    presigned URL. Otherwise, return the raw value unchanged."""
    key = _extract_s3_key(url)
    if key:
        try:
            return _presigned_url(key)
        except Exception:
            return url  # fallback — return what we have
    # Not an S3 URL: return as-is (blob:, unsplash, empty)
    return url or ""


def _resolve_image_list(urls: list) -> list[str]:
    """Apply _resolve_image_url to every item in the list."""
    if not urls:
        return []
    return [_resolve_image_url(u) for u in urls]


def _hydrate_health_card(row: C2CListingORM, db: Session) -> Optional[HealthCard]:
    if not hasattr(row, "health_card_uuid"):
        return None
    uuid_val = getattr(row, "health_card_uuid", None)
    if not uuid_val:
        return None
    hc = db.query(HealthCardORM).filter_by(card_uuid=uuid_val).first()
    if hc is None:
        return None
    defects = [Defect(**d) for d in (hc.defects or [])]
    return HealthCard(
        card_id=hc.card_id,
        item_id=hc.item_id,
        card_uuid=hc.card_uuid,
        card_url=hc.card_url,
        condition_grade=hc.condition_grade,
        defects=defects,
        brand_guess=hc.brand_guess,
        product_category=hc.product_category,
        confidence=hc.confidence,
        seller_name=hc.seller_name,
        seller_city=hc.seller_city,
        amazon_guarantee=hc.amazon_guarantee,
        generated_at=hc.generated_at,
        grading_model_version=hc.grading_model_version,
        qr_code_base64=hc.qr_code_base64,
        condition_summary=hc.condition_summary,
        usage_estimate=hc.usage_estimate,
        care_recommendation=hc.care_recommendation,
        seller_usage_description=hc.seller_usage_description,
        review_status=hc.review_status or "auto_approved",
        review_reason=hc.review_reason,
        declaration_timestamp=hc.declaration_timestamp,
        declaration_all_checked=hc.declaration_all_checked or False,
    )


@router.get("/listings")
def list_c2c(db: Session = Depends(get_db)):
    try:
        rows = db.query(C2CListingORM).order_by(C2CListingORM.created_at.desc()).all()
        results = []
        for r in rows:
            hc = _hydrate_health_card(r, db)
            results.append(
                C2CListingResponse(
                    id=r.id,
                    name=r.name,
                    category=r.category,
                    listed_by=r.listed_by,
                    location=r.location,
                    asking_price=r.asking_price,
                    original_price=r.original_price or 0.0,
                    condition=r.condition,
                    years_used=r.years_used,
                    image_url=_resolve_image_url(r.image_url),
                    uploaded_images=_resolve_image_list(r.uploaded_images or []),
                    video_url=r.video_url,
                    description=r.description,
                    health_card=hc,
                    created_at=r.created_at,
                )
            )
        return {"status": "ok", "count": len(results), "listings": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/listings")
def create_c2c(body: C2CListingRequest, db: Session = Depends(get_db)):
    try:
        listing_id = (
            body.id
            or f"c2c-{body.name.lower().replace(' ', '-')[:30]}-{datetime.now(IST).strftime('%H%M%S')}"
        )
        existing = (
            db.query(C2CListingORM).filter_by(id=listing_id).first()
            if listing_id
            else None
        )
        if existing:
            db.rollback()
            raise HTTPException(
                status_code=409, detail=f"Listing already exists: {listing_id}"
            )

        # Extract raw S3 keys from URLs before storing (so presigned URLs
        # can be generated fresh on every GET).
        stored_image_url = _extract_s3_key(body.image_url) or body.image_url
        stored_uploaded = []
        for u in body.uploaded_images or []:
            stored_uploaded.append(_extract_s3_key(u) or u)

        row = C2CListingORM(
            id=listing_id,
            name=body.name,
            category=body.category,
            listed_by=body.listed_by,
            location=body.location,
            asking_price=body.asking_price,
            original_price=body.original_price or 0.0,
            condition=body.condition,
            years_used=body.years_used or "",
            image_url=stored_image_url or "",
            uploaded_images=stored_uploaded,
            video_url=body.video_url,
            description=body.description or "",
            health_card_uuid=body.health_card_uuid,
            created_at=datetime.now(IST),
        )
        db.add(row)
        db.flush()
        db.commit()

        hc = _hydrate_health_card(row, db)
        return {
            "status": "ok",
            "listing": C2CListingResponse(
                id=row.id,
                name=row.name,
                category=row.category,
                listed_by=row.listed_by,
                location=row.location,
                asking_price=row.asking_price,
                original_price=row.original_price or 0.0,
                condition=row.condition,
                years_used=row.years_used,
                image_url=_resolve_image_url(row.image_url),
                uploaded_images=_resolve_image_list(row.uploaded_images or []),
                video_url=row.video_url,
                description=row.description,
                health_card=hc,
                created_at=row.created_at,
            ),
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
