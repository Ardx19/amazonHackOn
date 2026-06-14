# backend/app/api/routes/admin.py
# Admin routes — review queue and transaction rating.
# No auth for demo purposes. # TODO: add auth in production.

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.models import HealthCard as HealthCardORM, Item, Transaction
from app.db.database import get_db

router = APIRouter(prefix="/api/admin", tags=["admin"])


class ReviewQueueItem(BaseModel):
    card_uuid: str
    item_id: str
    seller_name: str
    seller_city: str
    condition_grade: str
    confidence: float
    review_reason: str | None
    defects: list[dict]
    declaration_timestamp: str | None
    generated_at: str
    seller_trust_score: float | None
    seller_trust_count: int


class ReviewDecision(BaseModel):
    decision: str  # "approved" or "rejected"
    note: str | None = None


@router.get("/review-queue")
def get_review_queue(db: Session = Depends(get_db)):
    rows = (
        db.query(HealthCardORM)
        .filter_by(review_status="pending_review")
        .order_by(HealthCardORM.generated_at.desc())
        .all()
    )

    items = []
    for r in rows:
        trust_score = None
        trust_count = 0
        if r.seller_name:
            seller = (
                db.query(Item)
                .filter_by(name=r.seller_name, record_type="persona")
                .first()
            )
            if seller and seller.trust_score is not None:
                trust_score = round(seller.trust_score, 1)
                trust_count = seller.trust_score_count or 0

        items.append(
            ReviewQueueItem(
                card_uuid=r.card_uuid,
                item_id=r.item_id,
                seller_name=r.seller_name or "",
                seller_city=r.seller_city or "",
                condition_grade=r.condition_grade or "",
                confidence=r.confidence or 0,
                review_reason=r.review_reason,
                defects=r.defects or [],
                declaration_timestamp=r.declaration_timestamp.isoformat()
                if r.declaration_timestamp
                else None,
                generated_at=r.generated_at.isoformat() if r.generated_at else "",
                seller_trust_score=trust_score,
                seller_trust_count=trust_count,
            )
        )

    return {
        "status": "ok",
        "count": len(items),
        "items": [i.model_dump() for i in items],
    }


@router.patch("/review-queue/{card_uuid}")
def decide_review(card_uuid: str, body: ReviewDecision, db: Session = Depends(get_db)):
    if body.decision not in ("approved", "rejected"):
        raise HTTPException(
            status_code=400, detail="Decision must be 'approved' or 'rejected'"
        )

    row = db.query(HealthCardORM).filter_by(card_uuid=card_uuid).first()
    if row is None:
        raise HTTPException(
            status_code=404, detail=f"Health card not found: {card_uuid}"
        )

    new_status = (
        "reviewed_approved" if body.decision == "approved" else "reviewed_rejected"
    )
    row.review_status = new_status
    if body.note:
        row.review_reason = (row.review_reason or "") + f" | Admin note: {body.note}"

    db.commit()
    return {
        "status": "ok",
        "card_uuid": card_uuid,
        "review_status": new_status,
        "note": body.note,
    }


# ── Transaction rating ──────────────────────────────────────────────────────

TRUST_ROUTER = APIRouter(prefix="/api", tags=["transactions"])


class RatingPayload(BaseModel):
    rating: float  # 1.0 – 5.0


@TRUST_ROUTER.post("/transactions/{transaction_id}/rate")
def rate_transaction(
    transaction_id: str, body: RatingPayload, db: Session = Depends(get_db)
):
    if body.rating < 1.0 or body.rating > 5.0:
        raise HTTPException(
            status_code=400, detail="Rating must be between 1.0 and 5.0"
        )

    txn = db.query(Transaction).filter_by(transaction_id=transaction_id).first()
    if txn is None:
        raise HTTPException(
            status_code=404, detail=f"Transaction not found: {transaction_id}"
        )

    seller = db.query(Item).filter_by(item_id=txn.seller_id).first()
    if seller is None:
        raise HTTPException(
            status_code=404, detail=f"Seller not found: {txn.seller_id}"
        )

    old_score = seller.trust_score or 0.0
    old_count = seller.trust_score_count or 0
    new_score = round(((old_score * old_count) + body.rating) / (old_count + 1), 2)
    seller.trust_score = new_score
    seller.trust_score_count = old_count + 1
    db.commit()

    return {
        "status": "ok",
        "seller_id": txn.seller_id,
        "trust_score": new_score,
        "trust_score_count": old_count + 1,
    }
