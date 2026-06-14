# backend/app/db/models.py
# SQLAlchemy ORM models — persistence layer.
# FK constraints enforce data integrity that DynamoDB couldn't.

from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
import uuid

from app.db.database import Base


def _new_uuid():
    return str(uuid.uuid4())


class Item(Base):
    __tablename__ = "items"

    item_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    brand = Column(String)
    original_price_inr = Column(Float, nullable=False)
    image_filename = Column(String)
    demo_condition_preset = Column(String)
    demo_defects_preset = Column(JSON, default=list)
    is_trajectory_product = Column(Boolean, default=False)
    trajectory_id = Column(String)
    record_type = Column(String)  # 'persona' for persona records
    trust_score = Column(Float, nullable=True)  # null = new seller
    trust_score_count = Column(Integer, default=0)

    grading_reports = relationship("GradingReport", back_populates="item")
    floating_discounts = relationship("FloatingDiscount", back_populates="item")
    hub_checkpoints = relationship("HubCheckpoint", back_populates="item")
    health_cards = relationship("HealthCard", back_populates="item")


class GradingReport(Base):
    __tablename__ = "grading_reports"

    report_id = Column(String, primary_key=True, default=_new_uuid)
    item_id = Column(String, ForeignKey("items.item_id"), nullable=False)
    product_category = Column(String)
    brand_guess = Column(String)
    condition_grade = Column(String, nullable=False)
    defects = Column(JSON, default=list)
    completeness = Column(String, default="complete")
    confidence = Column(Float, nullable=False)
    estimated_retail_inr = Column(Float)
    suggested_resale_band_inr = Column(JSON)
    recommended_route = Column(String)
    routing_reason = Column(String)
    manual_review_recommended = Column(Boolean, default=False)
    graded_at = Column(DateTime, nullable=False)
    rekognition_labels = Column(JSON, default=list)

    item = relationship("Item", back_populates="grading_reports")


class FloatingDiscount(Base):
    __tablename__ = "floating_discounts"

    listing_id = Column(String, primary_key=True, default=_new_uuid)
    item_id = Column(String, ForeignKey("items.item_id"), nullable=False)
    current_hub_id = Column(String)
    ring_index = Column(Integer, default=0)
    original_price_inr = Column(Float, nullable=False)
    v_graded_inr = Column(Float, nullable=False)
    c_remaining_inr = Column(Float, nullable=False)
    mvsp_inr = Column(Float, nullable=False)
    current_sale_price_inr = Column(Float, nullable=False)
    discount_pct = Column(Float, nullable=False)
    radius_km = Column(Float, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    status = Column(String, default="active")
    product_name = Column(String)
    current_hub_name = Column(String)
    hub_lat = Column(Float)
    hub_lng = Column(Float)
    trajectory = Column(JSON)

    item = relationship("Item", back_populates="floating_discounts")


class HubCheckpoint(Base):
    __tablename__ = "hub_checkpoints"

    checkpoint_id = Column(String, primary_key=True, default=_new_uuid)
    item_id = Column(String, ForeignKey("items.item_id"), nullable=False)
    trajectory_id = Column(String)
    hub_id = Column(String, nullable=False)
    hub_name = Column(String)
    arrived_at = Column(DateTime, nullable=False)
    c_remaining_inr = Column(Float, nullable=False)
    distance_to_warehouse_km = Column(Float, nullable=False)
    lat = Column(Float)
    lng = Column(Float)

    item = relationship("Item", back_populates="hub_checkpoints")


class HealthCard(Base):
    __tablename__ = "health_cards"

    card_uuid = Column(String, primary_key=True)
    item_id = Column(String, ForeignKey("items.item_id"), nullable=False)
    card_id = Column(String)
    card_url = Column(String)
    condition_grade = Column(String, nullable=False)
    defects = Column(JSON, default=list)
    brand_guess = Column(String)
    product_category = Column(String)
    confidence = Column(Float, nullable=False)
    seller_name = Column(String)
    seller_city = Column(String)
    amazon_guarantee = Column(Boolean, default=True)
    generated_at = Column(DateTime, nullable=False)
    grading_model_version = Column(String)
    condition_summary = Column(Text)
    usage_estimate = Column(String)
    care_recommendation = Column(Text)
    seller_usage_description = Column(Text)
    qr_code_base64 = Column(Text, nullable=True)
    # ── Seller accountability (Phase 3) ──
    review_status = Column(
        String, default="auto_approved"
    )  # auto_approved | pending_review | reviewed_approved | reviewed_rejected
    review_reason = Column(Text, nullable=True)
    declaration_timestamp = Column(DateTime, nullable=True)
    declaration_all_checked = Column(Boolean, default=False)

    item = relationship("Item", back_populates="health_cards")


class C2CListing(Base):
    __tablename__ = "c2c_listings"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    listed_by = Column(String, nullable=False)
    location = Column(String, nullable=False)
    asking_price = Column(Float, nullable=False)
    original_price = Column(Float, default=0.0)
    condition = Column(String, nullable=False)
    years_used = Column(String)
    image_url = Column(String)
    uploaded_images = Column(JSON, default=list)
    video_url = Column(String)
    description = Column(Text)
    health_card_uuid = Column(String)  # FK to health_cards.card_uuid — nullable
    created_at = Column(DateTime, nullable=False)


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(String, primary_key=True, default=_new_uuid)
    listing_id = Column(String, nullable=False)
    buyer_id = Column(String, nullable=False)
    seller_id = Column(String, nullable=False)
    amount_inr = Column(Float, nullable=False)
    listing_type = Column(String, nullable=False)
    status = Column(String, default="pending")
    created_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime)


class AbuseFlag(Base):
    __tablename__ = "abuse_flags"

    account_id = Column(String, primary_key=True)
    rule_triggered = Column(String, primary_key=True)
    flagged_at = Column(DateTime, nullable=False)
