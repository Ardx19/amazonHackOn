# tests/test_routing_service.py
# Unit tests for routing_service.py — pure formula logic + DB interactions.

import pytest
from datetime import datetime, timedelta
from app.services.routing_service import (
    compute_full_return_cost,
    should_enter_reroute,
    compute_profitable_radius,
    compute_ring_price,
    evaluate_route,
    advance_to_next_ring,
)
from app.db.models import Item, GradingReport, FloatingDiscount
from app.core.config import (
    OVERHEAD_RATIO_THRESHOLD,
    GRADING_CONFIDENCE_THRESHOLD,
    CONDITION_MULTIPLIERS,
    OPERATING_CHARGE_PCT,
    MIN_PROFIT_MARGIN,
    MAX_RADIUS_KM,
)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import Base


# ─── Module-scoped SQLite engine shared across all tests in this file ─────────

@pytest.fixture(scope="module")
def _engine():
    eng = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=eng)
    yield eng
    eng.dispose()


@pytest.fixture
def db(_engine):
    conn = _engine.connect()
    txn = conn.begin()
    Session = sessionmaker(bind=conn)
    session = Session()
    yield session
    session.close()
    txn.rollback()
    conn.close()


@pytest.fixture
def seeded_item(db):
    item = Item(
        item_id="TEST_001", name="Nike Test Shoes", category="footwear",
        brand="Nike", original_price_inr=599.0, is_trajectory_product=False,
    )
    db.add(item)
    db.flush()
    return item


@pytest.fixture
def grading_report_good(db, seeded_item):
    report = GradingReport(
        report_id="RPT_GOOD_001", item_id="TEST_001",
        product_category="footwear", brand_guess="Nike",
        condition_grade="Good",
        defects=[{"defect_type": "scuff", "severity": "minor", "location": "toe"}],
        completeness="complete", confidence=0.90,
        estimated_retail_inr=599.0, suggested_resale_band_inr=[300.0, 400.0],
        recommended_route="reroute_deals", routing_reason="Good",
        manual_review_recommended=False, graded_at=datetime.utcnow(),
        rekognition_labels=["Shoe"],
    )
    db.add(report)
    db.flush()
    return report


@pytest.fixture
def grading_report_poor(db, seeded_item):
    report = GradingReport(
        report_id="RPT_POOR_001", item_id="TEST_001",
        product_category="footwear", brand_guess="Nike",
        condition_grade="Poor",
        defects=[{"defect_type": "crack", "severity": "major", "location": "sole"}],
        completeness="complete", confidence=0.92,
        estimated_retail_inr=599.0, suggested_resale_band_inr=[50.0, 100.0],
        recommended_route="recycle", routing_reason="Poor",
        manual_review_recommended=False, graded_at=datetime.utcnow(),
        rekognition_labels=[],
    )
    db.add(report)
    db.flush()
    return report


@pytest.fixture
def grading_report_like_new_high_value(db):
    item = Item(
        item_id="TEST_002", name="Ray-Ban Aviator", category="clothing",
        brand="Ray-Ban", original_price_inr=8999.0, is_trajectory_product=False,
    )
    db.add(item)
    db.flush()
    report = GradingReport(
        report_id="RPT_LN_001", item_id="TEST_002",
        product_category="clothing", brand_guess="Ray-Ban",
        condition_grade="Like New", defects=[], completeness="complete",
        confidence=0.95, estimated_retail_inr=8999.0,
        suggested_resale_band_inr=[8000.0, 8999.0],
        recommended_route="amazon_renewed", routing_reason="Like New HV",
        manual_review_recommended=False, graded_at=datetime.utcnow(),
        rekognition_labels=[],
    )
    db.add(report)
    db.flush()
    return report


# ─── compute_full_return_cost ─────────────────────────────────────────────────

def test_footwear_cost_per_km():
    assert compute_full_return_cost("footwear", 48.0) == pytest.approx(120.0)

def test_electronics_cost_per_km():
    assert compute_full_return_cost("electronics", 30.0) == pytest.approx(105.0)

def test_default_category():
    assert compute_full_return_cost("mystery", 10.0) == pytest.approx(30.0)

def test_zero_distance():
    assert compute_full_return_cost("footwear", 0.0) == 0.0


# ─── should_enter_reroute ─────────────────────────────────────────────────────

def test_enters_when_overhead_exceeds_threshold():
    entered, reason = should_enter_reroute(359.4, 120.0, 0.90)
    assert entered is True

def test_does_not_enter_when_overhead_below_threshold():
    # 5% overhead < 7% threshold
    entered, _ = should_enter_reroute(1000.0, 50.0, 0.90)
    assert entered is False

def test_does_not_enter_when_confidence_too_low():
    # 0.80 < 0.85 threshold
    entered, reason = should_enter_reroute(359.4, 120.0, 0.80)
    assert entered is False
    assert "confidence" in reason.lower()

def test_at_confidence_threshold_enters():
    # code uses `confidence < threshold`, so at exactly 0.85 it should enter
    entered, _ = should_enter_reroute(359.4, 120.0, GRADING_CONFIDENCE_THRESHOLD)
    assert entered is True

def test_zero_graded_value_does_not_crash():
    entered, _ = should_enter_reroute(0.0, 100.0, 0.90)
    assert entered is False  # overhead_ratio = 0 < threshold


# ─── compute_profitable_radius ───────────────────────────────────────────────

def test_positive_radius_for_viable_item():
    graded = 359.4
    radius = compute_profitable_radius(graded, graded * OPERATING_CHARGE_PCT, "footwear")
    assert radius > 0

def test_radius_capped_at_max():
    graded = 100000.0
    radius = compute_profitable_radius(graded, graded * OPERATING_CHARGE_PCT, "footwear")
    assert radius == MAX_RADIUS_KM

def test_radius_zero_when_no_margin():
    radius = compute_profitable_radius(100.0, 99.0, "footwear")
    assert radius == 0.0

def test_baby_products_category():
    graded = 1500.0
    radius = compute_profitable_radius(graded, graded * OPERATING_CHARGE_PCT, "baby_products")
    assert 0 < radius <= MAX_RADIUS_KM


# ─── compute_ring_price ───────────────────────────────────────────────────────

def test_price_increases_with_ring_index():
    graded = 359.4
    prices = [compute_ring_price(graded, r, 15.0, "footwear") for r in range(4)]
    for i in range(len(prices) - 1):
        assert prices[i] <= prices[i + 1]

def test_ring_0_price_priya_shoes():
    # graded = 599 * 0.60 = 359.4; floor for ring 0 = graded * 0.88 = 316.272
    graded = 599 * CONDITION_MULTIPLIERS["Good"]
    price = compute_ring_price(graded, 0, 15.0, "footwear")
    assert price >= graded * 0.88 - 0.01  # allow tiny float rounding

def test_ring_5_price_at_floor():
    graded = 359.4
    price = compute_ring_price(graded, 5, 0.0, "footwear")
    assert price >= graded * 1.00 - 0.01

def test_price_never_negative():
    assert compute_ring_price(100.0, 0, 0.0, "footwear") >= 0


# ─── evaluate_route (uses db fixture) ────────────────────────────────────────

def test_poor_condition_routes_to_recycle(db, grading_report_poor):
    result = evaluate_route(db, "TEST_001", 599.0, "footwear",
                            {"hub_id": "MUM_H1", "distance_to_home_warehouse_km": 48.0})
    assert result["final_route"] == "recycle"
    assert result["entered_reroute"] is False

def test_like_new_high_value_routes_to_renewed(db, grading_report_like_new_high_value):
    result = evaluate_route(db, "TEST_002", 8999.0, "clothing",
                            {"hub_id": "MUM_H1", "distance_to_home_warehouse_km": 48.0})
    assert result["final_route"] == "amazon_renewed"

def test_good_condition_enters_reroute(db, grading_report_good):
    result = evaluate_route(db, "TEST_001", 599.0, "footwear",
                            {"hub_id": "MUM_H1", "distance_to_home_warehouse_km": 48.0})
    assert result["final_route"] == "reroute_deals"
    assert result["entered_reroute"] is True
    assert result["sale_price_inr"] > 0
    assert result["listing_id"] != ""

def test_low_overhead_routes_to_standard_return(db, grading_report_good):
    # 1km → overhead way below 7%
    result = evaluate_route(db, "TEST_001", 599.0, "footwear",
                            {"hub_id": "MUM_H1", "distance_to_home_warehouse_km": 1.0})
    assert result["final_route"] == "standard_return"

def test_low_confidence_routes_to_standard_return(db, seeded_item):
    report = GradingReport(
        report_id="RPT_LOW_CONF", item_id="TEST_001",
        product_category="footwear", brand_guess="Nike",
        condition_grade="Good", defects=[], completeness="complete",
        confidence=0.70,  # below 0.85
        estimated_retail_inr=599.0, suggested_resale_band_inr=[300.0, 400.0],
        recommended_route="reroute_deals", routing_reason="low conf test",
        manual_review_recommended=True, graded_at=datetime.utcnow(), rekognition_labels=[],
    )
    db.add(report)
    db.flush()
    result = evaluate_route(db, "TEST_001", 599.0, "footwear",
                            {"hub_id": "MUM_H1", "distance_to_home_warehouse_km": 48.0})
    assert result["final_route"] == "standard_return"

def test_creates_floating_discount_row(db, grading_report_good):
    result = evaluate_route(db, "TEST_001", 599.0, "footwear",
                            {"hub_id": "MUM_H1", "distance_to_home_warehouse_km": 48.0})
    if result["final_route"] == "reroute_deals":
        row = db.query(FloatingDiscount).filter_by(item_id="TEST_001").first()
        assert row is not None
        assert row.status == "active"
        assert row.ring_index == 0

def test_item_not_found_raises(db):
    with pytest.raises(ValueError, match="GradingReport not found"):
        evaluate_route(db, "NONEXISTENT", 599.0, "footwear",
                       {"hub_id": "MUM_H1", "distance_to_home_warehouse_km": 48.0})


# ─── advance_to_next_ring ─────────────────────────────────────────────────────

@pytest.fixture
def active_listing(db, seeded_item, grading_report_good):
    listing = FloatingDiscount(
        listing_id="LISTING_TEST_001", item_id="TEST_001",
        current_hub_id="MUM_H1", ring_index=0,
        original_price_inr=599.0, v_graded_inr=359.4,
        c_remaining_inr=120.0, mvsp_inr=239.4,
        current_sale_price_inr=316.0, discount_pct=47.2,
        radius_km=15.0, expires_at=datetime.utcnow() + timedelta(hours=24),
        status="active",
    )
    db.add(listing)
    db.flush()
    return listing

def test_advances_ring_index(db, active_listing):
    result = advance_to_next_ring(db, "TEST_001", "LISTING_TEST_001", "MUM_H2", 30.0, "footwear")
    assert result["ring_index"] == 1

def test_price_higher_after_advance(db, active_listing):
    result = advance_to_next_ring(db, "TEST_001", "LISTING_TEST_001", "MUM_H2", 30.0, "footwear")
    assert result["sale_price_inr"] >= 316.0

def test_hub_id_updated(db, active_listing):
    advance_to_next_ring(db, "TEST_001", "LISTING_TEST_001", "MUM_H2", 30.0, "footwear")
    listing = db.query(FloatingDiscount).filter_by(item_id="TEST_001").first()
    assert listing.current_hub_id == "MUM_H2"

def test_listing_not_found_raises(db, seeded_item):
    with pytest.raises(ValueError, match="Listing not found"):
        advance_to_next_ring(db, "TEST_001", "NONEXISTENT", "MUM_H2", 30.0, "footwear")
