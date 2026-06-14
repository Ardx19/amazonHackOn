# backend/app/api/routes/admin.py
# Admin endpoints — no authentication for demo.
#
# GET  /api/admin/review-queue          — items pending human review
# PATCH /api/admin/review-queue/{uuid}  — approve or reject a listing
# POST /api/transactions/{id}/rate      — buyer rates seller after delivery

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import HealthCard as HealthCardORM, Item, Transaction

router = APIRouter(prefix="/api", tags=["admin"])

# Transaction rating has its own prefix for clean URL structure
TRUST_ROUTER = APIRouter(prefix="/api", tags=["trust"])


# ─── Review Queue ─────────────────────────────────────────────────────────────

class ReviewItem(BaseModel):
    card_uuid: str
    item_id: str
    product_category: Optional[str] = None
    seller_name: Optional[str] = None
    condition_grade: str
    confidence: float
    review_status: str
    review_reason: Optional[str] = None
    declaration_all_checked: bool = False
    declaration_timestamp: Optional[datetime] = None
    generated_at: datetime


class ReviewQueueResponse(BaseModel):
    status: str = "ok"
    count: int
    items: list[ReviewItem]


@router.get("/admin/review-queue", response_model=ReviewQueueResponse)
def get_review_queue(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Returns all health cards pending human review (or optionally all by status)."""
    query = db.query(HealthCardORM)
    filter_status = status or "pending_review"
    query = query.filter_by(review_status=filter_status)
    rows = query.order_by(HealthCardORM.generated_at.asc()).all()

    items = [
        ReviewItem(
            card_uuid=r.card_uuid,
            item_id=r.item_id,
            product_category=r.product_category,
            seller_name=r.seller_name,
            condition_grade=r.condition_grade,
            confidence=r.confidence,
            review_status=r.review_status or "pending_review",
            review_reason=r.review_reason,
            declaration_all_checked=r.declaration_all_checked or False,
            declaration_timestamp=r.declaration_timestamp,
            generated_at=r.generated_at,
        )
        for r in rows
    ]
    return ReviewQueueResponse(count=len(items), items=items)


class ReviewDecision(BaseModel):
    decision: str  # "approved" | "rejected"
    note: Optional[str] = None


@router.patch("/admin/review-queue/{card_uuid}")
def decide_review(
    card_uuid: str,
    body: ReviewDecision,
    db: Session = Depends(get_db),
):
    """Approve or reject a listing in the review queue."""
    if body.decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="decision must be 'approved' or 'rejected'")

    row = db.query(HealthCardORM).filter_by(card_uuid=card_uuid).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Health card not found: {card_uuid}")

    row.review_status = f"reviewed_{body.decision}"
    if body.note:
        row.review_reason = body.note
    db.commit()

    return {
        "status": "ok",
        "card_uuid": card_uuid,
        "review_status": row.review_status,
        "note": body.note,
    }


# ─── Trust Score Rating ───────────────────────────────────────────────────────

class RatingPayload(BaseModel):
    rating: float = Field(..., ge=1.0, le=5.0, description="Rating 1.0–5.0")
    seller_id: str


@router.post("/transactions/{transaction_id}/rate")
def rate_seller(
    transaction_id: str,
    body: RatingPayload,
    db: Session = Depends(get_db),
):
    """Buyer rates seller after a completed transaction.
    Running-average trust score is stored on the seller's Item row."""
    txn = db.query(Transaction).filter_by(transaction_id=transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail=f"Transaction not found: {transaction_id}")
    if txn.status != "completed":
        raise HTTPException(status_code=400, detail="Can only rate completed transactions")

    seller = db.query(Item).filter_by(item_id=body.seller_id).first()
    if not seller:
        raise HTTPException(status_code=404, detail=f"Seller not found: {body.seller_id}")

    current_score = seller.trust_score or 0.0
    current_count = seller.trust_score_count or 0
    new_score = ((current_score * current_count) + body.rating) / (current_count + 1)

    seller.trust_score = round(new_score, 2)
    seller.trust_score_count = current_count + 1
    db.commit()

    return {
        "status": "ok",
        "seller_id": body.seller_id,
        "new_trust_score": seller.trust_score,
        "total_ratings": seller.trust_score_count,
    }


@TRUST_ROUTER.post("/transactions/{transaction_id}/rate")
def rate_seller_trust(
    transaction_id: str,
    body: RatingPayload,
    db: Session = Depends(get_db),
):
    """Buyer rates seller after a completed transaction (TRUST_ROUTER variant)."""
    txn = db.query(Transaction).filter_by(transaction_id=transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail=f"Transaction not found: {transaction_id}")

    seller = db.query(Item).filter_by(item_id=body.seller_id).first()
    if not seller:
        raise HTTPException(status_code=404, detail=f"Seller not found: {body.seller_id}")

    current_score = seller.trust_score or 0.0
    current_count = seller.trust_score_count or 0
    new_score = ((current_score * current_count) + body.rating) / (current_count + 1)

    seller.trust_score = round(new_score, 2)
    seller.trust_score_count = current_count + 1
    db.commit()

    return {
        "status": "ok",
        "seller_id": body.seller_id,
        "new_trust_score": seller.trust_score,
        "total_ratings": seller.trust_score_count,
    }
