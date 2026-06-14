# backend/app/schemas/schemas.py
# Pydantic v2 models — API validation layer.
# These are the canonical shapes for all FastAPI request/response bodies.

from datetime import datetime
from typing import Literal, Optional
from uuid import uuid4

from pydantic import BaseModel


# ─── ItemPhoto ────────────────────────────────────────────────────────────────


class ItemPhoto(BaseModel):
    s3_key: str
    s3_bucket: str
    uploaded_at: datetime


# ─── Defect ───────────────────────────────────────────────────────────────────


class Defect(BaseModel):
    defect_type: str
    severity: Literal["minor", "moderate", "major"]
    location: str


# ─── GradingReport ────────────────────────────────────────────────────────────


class GradingReport(BaseModel):
    report_id: str
    item_id: str
    product_category: str
    brand_guess: Optional[str] = None
    condition_grade: Literal["Like New", "Good", "Fair", "Poor"]
    defects: list[Defect]
    completeness: Literal["complete", "incomplete", "accessories_missing"]
    confidence: float
    estimated_retail_inr: float
    suggested_resale_band_inr: tuple[float, float]
    recommended_route: str
    routing_reason: str
    manual_review_recommended: bool = False
    graded_at: datetime
    rekognition_labels: list[str] = []


# ─── HubCheckpoint ────────────────────────────────────────────────────────────


class HubCheckpoint(BaseModel):
    checkpoint_id: str
    item_id: str
    hub_id: str
    hub_name: str
    arrived_at: datetime
    c_remaining_inr: float
    distance_to_warehouse_km: float


# ─── FloatingDiscount ─────────────────────────────────────────────────────────


class FloatingDiscount(BaseModel):
    listing_id: str
    item_id: str
    current_hub_id: str
    ring_index: int = 0
    original_price_inr: float
    v_graded_inr: float
    c_remaining_inr: float
    mvsp_inr: float
    current_sale_price_inr: float
    discount_pct: float
    radius_km: float
    expires_at: datetime
    status: Literal["active", "sold", "expired", "donated", "recycled"]


# ─── HealthCard ───────────────────────────────────────────────────────────────


class HealthCard(BaseModel):
    card_id: str
    item_id: str
    card_uuid: str
    card_url: str
    condition_grade: str
    defects: list[Defect]
    brand_guess: Optional[str] = None
    product_category: str
    confidence: float
    seller_name: str
    seller_city: str
    amazon_guarantee: bool = True
    generated_at: datetime
    grading_model_version: str
    qr_code_base64: Optional[str] = None
    # AI-written (or templated) honest condition prose
    condition_summary: Optional[str] = None
    usage_estimate: Optional[str] = None  # AI visual wear-level description
    care_recommendation: Optional[str] = None
    seller_usage_description: Optional[str] = None  # seller's own declaration
    # ── Seller accountability (Phase 3) ──
    review_status: str = "auto_approved"  # auto_approved | pending_review | reviewed_approved | reviewed_rejected
    review_reason: Optional[str] = None
    declaration_timestamp: Optional[datetime] = None
    declaration_all_checked: bool = False
    seller_trust_score: Optional[float] = None
    seller_trust_count: int = 0


# ─── Transaction ──────────────────────────────────────────────────────────────


class Transaction(BaseModel):
    transaction_id: str
    listing_id: str
    buyer_id: str
    seller_id: str
    amount_inr: float
    listing_type: Literal["reroute_deal", "relist"]
    status: Literal["pending", "completed", "disputed", "refunded"]
    created_at: datetime
    completed_at: Optional[datetime] = None


# ─── Persona ──────────────────────────────────────────────────────────────────


class Persona(BaseModel):
    user_id: str
    name: str
    role: Literal["returner", "seller", "buyer"]
    city: str
    address_hash: str
    payment_instrument_hash: str
    return_history: list[dict]


# ─── Request/Response Schemas ─────────────────────────────────────────────────


class GradeRequest(BaseModel):
    item_id: str
    original_price_inr: float
    category: str
    product_name: str


class RouteRequest(BaseModel):
    item_id: str
    original_price_inr: float
    category: str
    current_location: dict
    ring_index: int = 0


class HealthCardRequest(BaseModel):
    item_id: str
    seller_id: str
    seller_name: str
    seller_city: str
    seller_usage_description: Optional[str] = None
    declaration_all_checked: bool = False
    declaration_timestamp: Optional[datetime] = None


class RoutingResponse(BaseModel):
    item_id: str
    final_route: str
    ring_index: int
    sale_price_inr: float
    profitable_radius_km: float
    listing_id: str
    routing_reason: str
    mvsp_inr: float
    overhead_ratio: float
    entered_reroute: bool
    # Floating-discount economic breakdown (Scenario 1). Optional for back-compat.
    mrp_inr: float = 0.0
    cogs_inr: float = 0.0
    discount_pct: float = 0.0
    sale_case: str = ""


# ─── Helper ───────────────────────────────────────────────────────────────────


def generate_card_uuid(city_code: str = "MUM") -> str:
    return f"HC-2026-{city_code}-{uuid4().hex[:8].upper()}"
