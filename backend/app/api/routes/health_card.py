# backend/app/api/routes/health_card.py
# POST /api/health-card — Generate Health Card + QR code

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.health_card_service import generate_health_card
from app.services.routing_service import load_grading_report
from app.db.models import HealthCard as HealthCardORM
from app.db.database import get_db
from app.schemas.schemas import HealthCard, HealthCardRequest

router = APIRouter(prefix="/api", tags=["health-card"])


class HealthCardResponse(BaseModel):
    status: str = "ok"
    card: HealthCard


@router.post("/health-card", response_model=HealthCardResponse)
def create_health_card(body: HealthCardRequest):
    db = next(get_db())
    try:
        grading_report = load_grading_report(db, body.item_id)

        card = generate_health_card(
            item_id=body.item_id,
            grading_report=grading_report,
            seller_id=body.seller_id,
            seller_name=body.seller_name,
            seller_city=body.seller_city,
        )

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
        )
        db.add(db_card)
        db.commit()

        return HealthCardResponse(card=card)

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
