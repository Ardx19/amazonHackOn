# backend/app/api/routes/health_card.py
# POST /api/health-card — Generate Health Card + QR code

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.services.health_card_service import generate_health_card, generate_qr_code
from app.services.routing_service import load_grading_report
from app.db.models import HealthCard as HealthCardORM, Item
from app.db.database import get_db
from app.schemas.schemas import HealthCard, HealthCardRequest, Defect

router = APIRouter(prefix="/api", tags=["health-card"])


class HealthCardResponse(BaseModel):
    status: str = "ok"
    card: HealthCard


@router.post("/health-card", response_model=HealthCardResponse)
def create_health_card(body: HealthCardRequest, db: Session = Depends(get_db)):
    try:
        grading_report = load_grading_report(db, body.item_id)

        card = generate_health_card(
            item_id=body.item_id,
            grading_report=grading_report,
            seller_id=body.seller_id,
            seller_name=body.seller_name,
            seller_city=body.seller_city,
            seller_usage_description=body.seller_usage_description,
        )

        # ── Seller accountability: confidence threshold → human review ─────
        review_status = "auto_approved"
        review_reason = None
        if grading_report.confidence < 0.85 or grading_report.manual_review_recommended:
            review_status = "pending_review"
            review_reason = (
                f"AI confidence {grading_report.confidence:.0%} — below 85% threshold"
            )

        # ── Load seller trust score ──────────────────────────────────────
        seller_trust = None
        seller_trust_count = 0
        if body.seller_id:
            seller_row = db.query(Item).filter_by(item_id=body.seller_id).first()
            if seller_row and seller_row.trust_score is not None:
                seller_trust = round(seller_row.trust_score, 1)
                seller_trust_count = seller_row.trust_score_count or 0

        db_card = HealthCardORM(
            card_uuid=card.card_uuid,
            item_id=card.item_id,
            card_id=card.card_id,
            card_url=card.card_url,
            condition_grade=card.condition_grade,
            defects=[d.model_dump() for d in card.defects] if card.defects else [],
            brand_guess=card.brand_guess,
            product_category=card.product_category,
            confidence=card.confidence,
            seller_name=card.seller_name,
            seller_city=card.seller_city,
            amazon_guarantee=card.amazon_guarantee,
            generated_at=card.generated_at,
            grading_model_version=card.grading_model_version,
            condition_summary=card.condition_summary,
            usage_estimate=card.usage_estimate,
            care_recommendation=card.care_recommendation,
            seller_usage_description=card.seller_usage_description,
            qr_code_base64=card.qr_code_base64,
            review_status=review_status,
            review_reason=review_reason,
        )
        db.merge(db_card)  # merge = upsert, so re-generating a card won't crash
        db.commit()

        card.review_status = review_status
        card.review_reason = review_reason
        card.seller_trust_score = seller_trust
        card.seller_trust_count = seller_trust_count

        return HealthCardResponse(card=card)

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health-card/{card_uuid}", response_model=HealthCardResponse)
def get_health_card(card_uuid: str, db: Session = Depends(get_db)):
    """Public verification endpoint — the QR code resolves here. Lets any UI
    render the tamper-proof card by its ID."""
    row = db.query(HealthCardORM).filter_by(card_uuid=card_uuid).first()
    if row is None:
        raise HTTPException(
            status_code=404, detail=f"Health card not found: {card_uuid}"
        )

    defects = [Defect(**d) for d in (row.defects or [])]
    card = HealthCard(
        card_id=row.card_id,
        item_id=row.item_id,
        card_uuid=row.card_uuid,
        card_url=row.card_url,
        condition_grade=row.condition_grade,
        defects=defects,
        brand_guess=row.brand_guess,
        product_category=row.product_category,
        confidence=row.confidence,
        seller_name=row.seller_name,
        seller_city=row.seller_city,
        amazon_guarantee=row.amazon_guarantee,
        generated_at=row.generated_at,
        grading_model_version=row.grading_model_version,
        qr_code_base64=row.qr_code_base64 or generate_qr_code(row.card_url),
        condition_summary=row.condition_summary,
        usage_estimate=row.usage_estimate,
        care_recommendation=row.care_recommendation,
        seller_usage_description=row.seller_usage_description,
        review_status=row.review_status or "auto_approved",
        review_reason=row.review_reason,
        declaration_timestamp=row.declaration_timestamp,
        declaration_all_checked=row.declaration_all_checked or False,
        seller_trust_score=None,
        seller_trust_count=0,
    )
    return HealthCardResponse(card=card)
