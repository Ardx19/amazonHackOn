# tests/test_routing_service.py
# Unit tests for the floating-discount economic model (Scenario 1).

import pytest
from datetime import datetime, timedelta
from app.services.routing_service import (
    decompose_costs,
    compute_full_return_cost,
    should_enter_reroute,
    compute_radius,
    discount_budget,
    compute_floating_price,
    evaluate_route,
    advance_to_next_ring,
)
from app.db.models import Item, GradingReport, FloatingDiscount
from app.core.config import (
    OVERHEAD_RATIO_THRESHOLD,
    GRADING_CONFIDENCE_THRESHOLD,
    CONDITION_MULTIPLIERS,
    MAX_RADIUS_KM,
    COGS_RATIO,
    MARGIN_RATIO,
    ORIGINAL_DELIVERY_RATIO,
    MRP_RATIO,
    DELIVERY_COST_PER_KM,
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


# ─── decompose_costs ──────────────────────────────────────────────────────────

def test_decompose_sums_to_original():
    c = decompose_costs(1000.0)
    assert c["C"] + c["p"] + c["d"] == pytest.approx(1000.0)

def test_mrp_is_cogs_plus_margin():
    c = decompose_costs(1000.0)
    assert c["mrp"] == pytest.approx(c["C"] + c["p"])
    assert c["mrp"] == pytest.approx(1000.0 * MRP_RATIO)

def test_decompose_ratios():
    c = decompose_costs(599.0)
    assert c["C"] == pytest.approx(599.0 * COGS_RATIO)
    assert c["p"] == pytest.approx(599.0 * MARGIN_RATIO)
    assert c["d"] == pytest.approx(599.0 * ORIGINAL_DELIVERY_RATIO)


# ─── compute_full_return_cost ─────────────────────────────────────────────────

def test_footwear_cost_per_km():
    # footwear = 2.5 INR/km
    assert compute_full_return_cost("footwear", 48.0) == pytest.approx(120.0)

def test_electronics_cost_per_km():
    # electronics = 3.5 INR/km
    assert compute_full_return_cost("electronics", 30.0) == pytest.approx(105.0)

def test_default_category():
    assert compute_full_return_cost("mystery", 10.0) == pytest.approx(30.0)

def test_zero_distance():
    assert compute_full_return_cost("footwear", 0.0) == 0.0


# ─── should_enter_reroute ─────────────────────────────────────────────────────

def test_enters_when_overhead_exceeds_threshold():
    # mrp 500, D 120 -> 24% overhead > 7%
    entered, _ = should_enter_reroute(500.0, 120.0, 0.90)
    assert entered is True

def test_does_not_enter_when_overhead_below_threshold():
    # mrp 1000, D 50 -> 5% < 7%
    entered, _ = should_enter_reroute(1000.0, 50.0, 0.90)
    assert entered is False

def test_does_not_enter_when_confidence_too_low():
    entered, reason = should_enter_reroute(500.0, 120.0, 0.80)
    assert entered is False
    assert "confidence" in reason.lower()

def test_at_confidence_threshold_enters():
    entered, _ = should_enter_reroute(500.0, 120.0, GRADING_CONFIDENCE_THRESHOLD)
    assert entered is True

def test_zero_mrp_does_not_crash():
    entered, _ = should_enter_reroute(0.0, 100.0, 0.90)
    assert entered is False


# ─── compute_radius (unified, every checkpoint) ───────────────────────────────

def test_radius_is_remaining_cost_over_cost_per_km():
    # footwear cpk = 2.5
    radius = compute_radius(D_remaining=120.0, category="footwear")
    assert radius == pytest.approx(min(120.0 / 2.5, MAX_RADIUS_KM))

def test_radius_zero_when_no_remaining_cost():
    assert compute_radius(D_remaining=0.0, category="footwear") == 0.0

def test_radius_capped_at_max():
    assert compute_radius(D_remaining=1_000_000.0, category="footwear") == MAX_RADIUS_KM

def test_radius_shrinks_as_item_nears_rc():
    far = compute_radius(120.0, "footwear")   # lots of journey left
    near = compute_radius(20.0, "footwear")   # almost at RC
    assert near < far


# ─── discount_budget ──────────────────────────────────────────────────────────

def test_budget_equals_remaining_cost_when_below_cogs_gap():
    # D_remaining 120 < (mrp - cogs) 180 -> budget = 120
    assert discount_budget(120.0, mrp=509.0, cogs=329.0) == pytest.approx(120.0)

def test_budget_capped_so_price_never_below_cogs():
    # huge D_remaining -> budget capped at mrp - cogs = 180
    assert discount_budget(5000.0, mrp=509.0, cogs=329.0) == pytest.approx(180.0)

def test_budget_never_negative():
    assert discount_budget(-50.0, mrp=509.0, cogs=329.0) == 0.0


# ─── compute_floating_price ───────────────────────────────────────────────────

def test_price_at_hub_is_mrp_minus_budget():
    # buyer at hub (d_buyer_km = 0): price = MRP - D_remaining
    price = compute_floating_price(mrp=509.0, cogs=329.0, D_remaining=120.0, category="footwear")
    assert price == pytest.approx(509.0 - 120.0)

def test_price_rises_as_item_nears_rc():
    far = compute_floating_price(509.0, 329.0, 120.0, "footwear")  # at home
    near = compute_floating_price(509.0, 329.0, 30.0, "footwear")  # near RC
    assert near > far  # less to save -> higher price

def test_price_never_below_cogs():
    # very long return -> budget capped, price floors at COGS
    price = compute_floating_price(509.0, 329.0, 5000.0, "footwear")
    assert price == pytest.approx(329.0)

def test_price_never_exceeds_mrp():
    price = compute_floating_price(509.0, 329.0, 10.0, "footwear", d_buyer_km=1000.0)
    assert price <= 509.0

def test_farther_buyer_pays_more():
    at_hub = compute_floating_price(509.0, 329.0, 120.0, "footwear", d_buyer_km=0.0)
    far = compute_floating_price(509.0, 329.0, 120.0, "footwear", d_buyer_km=20.0)
    assert far > at_hub


# ─── evaluate_route ───────────────────────────────────────────────────────────

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
    assert result["sale_case"] == "at_home"

def test_sale_price_never_exceeds_mrp(db, grading_report_good):
    result = evaluate_route(db, "TEST_001", 599.0, "footwear",
                            {"hub_id": "MUM_H1", "distance_to_home_warehouse_km": 48.0})
    assert result["sale_price_inr"] <= result["mrp_inr"] + 0.01

def test_discount_is_positive_in_case1(db, grading_report_good):
    result = evaluate_route(db, "TEST_001", 599.0, "footwear",
                            {"hub_id": "MUM_H1", "distance_to_home_warehouse_km": 48.0})
    assert result["discount_pct"] > 0

def test_low_overhead_routes_to_standard_return(db, grading_report_good):
    # 1km -> overhead far below 7%
    result = evaluate_route(db, "TEST_001", 599.0, "footwear",
                            {"hub_id": "MUM_H1", "distance_to_home_warehouse_km": 1.0})
    assert result["final_route"] == "standard_return"

def test_low_confidence_routes_to_standard_return(db, seeded_item):
    report = GradingReport(
        report_id="RPT_LOW_CONF", item_id="TEST_001",
        product_category="footwear", brand_guess="Nike",
        condition_grade="Good", defects=[], completeness="complete",
        confidence=0.70,
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
    assert result["final_route"] == "reroute_deals"
    row = db.query(FloatingDiscount).filter_by(item_id="TEST_001").first()
    assert row is not None
    assert row.status == "active"
    assert row.ring_index == 0
    # listing stores MRP as the strike reference
    assert row.original_price_inr == pytest.approx(599.0 * MRP_RATIO)

def test_item_not_found_raises(db):
    with pytest.raises(ValueError, match="GradingReport not found"):
        evaluate_route(db, "NONEXISTENT", 599.0, "footwear",
                       {"hub_id": "MUM_H1", "distance_to_home_warehouse_km": 48.0})


# ─── advance_to_next_ring ─────────────────────────────────────────────────────

@pytest.fixture
def active_listing(db, seeded_item, grading_report_good):
    # Create a Case-1 listing via the real path, then advance it.
    evaluate_route(db, "TEST_001", 599.0, "footwear",
                   {"hub_id": "MUM_H1", "distance_to_home_warehouse_km": 48.0})
    return db.query(FloatingDiscount).filter_by(item_id="TEST_001").first()

def test_advances_ring_index(db, active_listing):
    result = advance_to_next_ring(db, "TEST_001", active_listing.listing_id, "MUM_H2", 30.0, "footwear")
    assert result["ring_index"] == 1

def test_price_higher_after_advance(db, active_listing):
    before = active_listing.current_sale_price_inr
    result = advance_to_next_ring(db, "TEST_001", active_listing.listing_id, "MUM_H2", 30.0, "footwear")
    # Case 2 in transit prices up toward MRP — never below the Case 1 floor.
    assert result["sale_price_inr"] >= before

def test_hub_id_updated(db, active_listing):
    advance_to_next_ring(db, "TEST_001", active_listing.listing_id, "MUM_H2", 30.0, "footwear")
    listing = db.query(FloatingDiscount).filter_by(item_id="TEST_001").first()
    assert listing.current_hub_id == "MUM_H2"

def test_advance_sale_price_capped_at_mrp(db, active_listing):
    result = advance_to_next_ring(db, "TEST_001", active_listing.listing_id, "MUM_H2", 30.0, "footwear")
    listing = db.query(FloatingDiscount).filter_by(item_id="TEST_001").first()
    assert result["sale_price_inr"] <= listing.original_price_inr + 0.01

def test_listing_not_found_raises(db, seeded_item):
    with pytest.raises(ValueError, match="Listing not found"):
        advance_to_next_ring(db, "TEST_001", "NONEXISTENT", "MUM_H2", 30.0, "footwear")
