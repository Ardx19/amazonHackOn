# backend/app/services/routing_service.py
# Refactored from lambdas/route_evaluator/lambda_function.py
# Cascade auction model. Core intelligence of the system.

import logging
from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.config import (
    CONDITION_MULTIPLIERS,
    DELIVERY_COST_PER_KM,
    GRADING_CONFIDENCE_THRESHOLD,
    MIN_PROFIT_MARGIN,
    OPERATING_CHARGE_PCT,
    OVERHEAD_RATIO_THRESHOLD,
    RENEWED_MIN_VALUE,
    RING_PRICE_FLOORS,
    RING_PRICE_INCREMENT,
    MAX_RADIUS_KM,
)
from app.db.models import (
    GradingReport as GradingReportORM,
    FloatingDiscount as FloatingDiscountORM,
)

logger = logging.getLogger(__name__)


def load_grading_report(db: Session, item_id: str) -> GradingReportORM:
    report = db.query(GradingReportORM).filter_by(item_id=item_id).first()
    if report is None:
        raise ValueError(f"GradingReport not found: item_id={item_id}")
    return report


def compute_full_return_cost(category: str, distance_to_home_km: float) -> float:
    cost_per_km = DELIVERY_COST_PER_KM.get(category, DELIVERY_COST_PER_KM["default"])
    return cost_per_km * distance_to_home_km


def should_enter_reroute(
    graded_value: float, full_return_cost: float, confidence: float
) -> tuple[bool, str]:
    overhead_ratio = full_return_cost / graded_value if graded_value > 0 else 0.0

    if confidence < GRADING_CONFIDENCE_THRESHOLD:
        return False, (
            f"Grading confidence {confidence:.0%} below {GRADING_CONFIDENCE_THRESHOLD:.0%} "
            "— manual inspection required"
        )

    if overhead_ratio < OVERHEAD_RATIO_THRESHOLD:
        return False, (
            f"Overhead ratio {overhead_ratio:.1%} below {OVERHEAD_RATIO_THRESHOLD:.1%} "
            "— standard return more efficient"
        )

    return (
        True,
        f"Overhead ratio {overhead_ratio:.1%} exceeds {OVERHEAD_RATIO_THRESHOLD:.1%} — ReRoute cascade initiated",
    )


def compute_profitable_radius(
    graded_value: float,
    operating_charge: float,
    category: str,
    min_profit_margin: float = None,
) -> float:
    if min_profit_margin is None:
        min_profit_margin = MIN_PROFIT_MARGIN
    cost_per_km = DELIVERY_COST_PER_KM.get(category, DELIVERY_COST_PER_KM["default"])
    numerator = graded_value * (1 - min_profit_margin) - operating_charge

    if numerator <= 0:
        return 0.0

    radius_km = numerator / cost_per_km
    return min(radius_km, MAX_RADIUS_KM)


def compute_ring_price(
    graded_value: float, ring_index: int, d_buyer_km: float, category: str
) -> float:
    cost_per_km = DELIVERY_COST_PER_KM.get(category, DELIVERY_COST_PER_KM["default"])
    delivery_cost = cost_per_km * d_buyer_km
    operating_charge = graded_value * OPERATING_CHARGE_PCT

    mvsp = delivery_cost + operating_charge + (graded_value * MIN_PROFIT_MARGIN)

    floor_multiplier = RING_PRICE_FLOORS.get(
        ring_index, 1.00 + (ring_index - 5) * RING_PRICE_INCREMENT
    )
    price_floor = graded_value * floor_multiplier

    return round(max(mvsp, price_floor), 2)


def create_floating_discount_listing(
    db: Session,
    item_id: str,
    grading_report: GradingReportORM,
    original_price: float,
    sale_price: float,
    radius: float,
    current_location: dict,
    ring_index: int,
) -> FloatingDiscountORM:
    graded_value = (
        CONDITION_MULTIPLIERS.get(grading_report.condition_grade, 0) * original_price
    )
    full_return_cost = current_location.get("distance_to_home_warehouse_km", 0)

    discount_pct = (
        round((original_price - sale_price) / original_price * 100, 1)
        if original_price > 0
        else 0
    )

    ttl_hours = 24 if ring_index == 0 else 48

    listing = FloatingDiscountORM(
        listing_id=str(uuid4()),
        item_id=item_id,
        current_hub_id=current_location.get("hub_id", "RING_0"),
        ring_index=ring_index,
        original_price_inr=original_price,
        v_graded_inr=round(graded_value, 2),
        c_remaining_inr=full_return_cost,
        mvsp_inr=round(graded_value - full_return_cost, 2),
        current_sale_price_inr=sale_price,
        discount_pct=max(discount_pct, 0.0),
        radius_km=radius,
        expires_at=datetime.utcnow() + timedelta(hours=ttl_hours),
        status="active",
    )

    db.add(listing)
    db.flush()
    return listing


def advance_to_next_ring(
    db: Session,
    item_id: str,
    listing_id: str,
    next_hub_id: str,
    distance_to_home_km: float,
    category: str,
) -> dict:
    listing = db.query(FloatingDiscountORM).filter_by(item_id=item_id).first()
    if not listing:
        raise ValueError(f"Listing not found: {listing_id}")

    current_ring = listing.ring_index or 0
    next_ring = current_ring + 1
    graded_value = listing.v_graded_inr

    radius = compute_profitable_radius(
        graded_value, graded_value * OPERATING_CHARGE_PCT, category
    )
    sale_price = compute_ring_price(graded_value, next_ring, radius / 2, category)
    discount_pct = (
        round(
            (listing.original_price_inr - sale_price)
            / listing.original_price_inr
            * 100,
            1,
        )
        if listing.original_price_inr > 0
        else 0
    )

    listing.current_hub_id = next_hub_id
    listing.ring_index = next_ring
    listing.current_sale_price_inr = sale_price
    listing.discount_pct = max(discount_pct, 0.0)
    listing.radius_km = radius
    listing.expires_at = datetime.utcnow() + timedelta(hours=48)

    db.flush()

    return {
        "item_id": item_id,
        "listing_id": listing.listing_id,
        "ring_index": next_ring,
        "sale_price_inr": sale_price,
        "radius_km": radius,
        "discount_pct": max(discount_pct, 0.0),
    }


def _route_response(
    item_id,
    final_route,
    sale_price,
    radius,
    ring,
    overhead_ratio,
    reason,
    entered_reroute,
    listing_id="",
    mvsp_val=0.0,
):
    return {
        "item_id": item_id,
        "final_route": final_route,
        "ring_index": ring,
        "sale_price_inr": sale_price,
        "profitable_radius_km": radius,
        "listing_id": listing_id,
        "routing_reason": reason,
        "mvsp_inr": mvsp_val,
        "overhead_ratio": overhead_ratio,
        "entered_reroute": entered_reroute,
    }


def evaluate_route(
    db: Session,
    item_id: str,
    original_price: float,
    category: str,
    current_location: dict,
    ring_index: int = 0,
) -> dict:
    grading_report = load_grading_report(db, item_id)

    graded_value = (
        CONDITION_MULTIPLIERS.get(grading_report.condition_grade, 0) * original_price
    )
    distance_to_home = current_location.get("distance_to_home_warehouse_km", 0)
    full_return_cost = compute_full_return_cost(category, distance_to_home)
    overhead_ratio = full_return_cost / graded_value if graded_value > 0 else 0.0
    operating_charge = graded_value * OPERATING_CHARGE_PCT

    if grading_report.condition_grade == "Poor":
        return _route_response(
            item_id,
            "recycle",
            0.0,
            0.0,
            0,
            overhead_ratio,
            "Poor condition — item not resaleable",
            False,
        )

    if (
        grading_report.condition_grade == "Like New"
        and original_price >= RENEWED_MIN_VALUE
    ):
        return _route_response(
            item_id,
            "amazon_renewed",
            graded_value,
            0.0,
            0,
            overhead_ratio,
            f"Like New, ₹{original_price:.0f} — Amazon Renewed eligible",
            False,
        )

    enter, reason = should_enter_reroute(
        graded_value, full_return_cost, grading_report.confidence
    )

    if not enter:
        return _route_response(
            item_id,
            "standard_return",
            graded_value,
            0.0,
            0,
            overhead_ratio,
            reason,
            False,
        )

    profitable_radius = compute_profitable_radius(
        graded_value, operating_charge, category
    )

    if profitable_radius <= 0:
        return _route_response(
            item_id,
            "donate",
            0.0,
            0.0,
            ring_index,
            overhead_ratio,
            "No profitable radius — donate to save logistics cost",
            True,
        )

    d_buyer_km = profitable_radius / 2
    sale_price = compute_ring_price(graded_value, ring_index, d_buyer_km, category)

    listing = create_floating_discount_listing(
        db,
        item_id,
        grading_report,
        original_price,
        sale_price,
        profitable_radius,
        current_location,
        ring_index,
    )

    mvsp = graded_value - full_return_cost
    reason_text = f"Ring {ring_index} — ₹{sale_price:.0f} within {profitable_radius:.1f}km. Overhead: {overhead_ratio:.1%}"

    return _route_response(
        item_id,
        "reroute_deals",
        sale_price,
        profitable_radius,
        ring_index,
        overhead_ratio,
        reason_text,
        True,
        listing_id=listing.listing_id,
        mvsp_val=round(mvsp, 2),
    )
