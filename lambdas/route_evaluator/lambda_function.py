"""
ReRoute — route_evaluator Lambda
Core intelligence: cascade auction model.
Decides the most profitable exit path for every returned item based on
condition grade, current location, and logistics costs.

Read the routing model doc before modifying this file.
"""

import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared.config import (
    CONDITION_MULTIPLIERS,
    DELIVERY_COST_PER_KM,
    GRADING_CONFIDENCE_THRESHOLD,
    MIN_PROFIT_MARGIN,
    OPERATING_CHARGE_PCT,
    OVERHEAD_RATIO_THRESHOLD,
    RENEWED_MIN_VALUE,
    RING_PRICE_FLOORS,
    RING_PRICE_INCREMENT,
    TABLE_FLOATING_DISCOUNTS,
    TABLE_GRADING_REPORTS,
    MAX_RADIUS_KM,
)
from shared.models import FloatingDiscount, GradingReport
from shared.db import put_item, get_item

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


# ─── Helpers ────────────────────────────────────────────────────────────────


def _route_response(
    item_id: str,
    final_route: str,
    sale_price: float,
    radius: float,
    ring: int,
    overhead_ratio: float,
    reason: str,
    entered_reroute: bool,
    listing_id: str = "",
    mvsp_val: float = 0.0,
) -> dict:
    return {
        "statusCode": 200,
        "body": {
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
        },
    }


# ─── Function 1: Load Grading Report ───────────────────────────────────────


def load_grading_report(item_id: str, report_id: str = None) -> GradingReport:
    raw = get_item(TABLE_GRADING_REPORTS, "item_id", item_id)
    if raw is None:
        raise ValueError(f"GradingReport not found: item_id={item_id}")
    return GradingReport.model_validate(raw)


# ─── Function 2: Full Return Cost ──────────────────────────────────────────


def compute_full_return_cost(category: str, distance_to_home_km: float) -> float:
    cost_per_km = DELIVERY_COST_PER_KM.get(category, DELIVERY_COST_PER_KM["default"])
    return cost_per_km * distance_to_home_km


# ─── Function 3: ReRoute Entry Gate ────────────────────────────────────────


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

    return True, (
        f"Overhead ratio {overhead_ratio:.1%} exceeds {OVERHEAD_RATIO_THRESHOLD:.1%} "
        "— ReRoute cascade initiated"
    )


# ─── Function 4: Profitable Radius ────────────────────────────────────────


def compute_profitable_radius(
    graded_value: float,
    operating_charge: float,
    category: str,
    min_profit_margin: float = MIN_PROFIT_MARGIN,
) -> float:
    """
    Find max distance d where:
    graded_value × (1 - min_margin) - delivery_cost(d) - operating_charge ≥ 0
    → d = (graded_value × (1 - min_margin) - operating_charge) / cost_per_km
    """
    cost_per_km = DELIVERY_COST_PER_KM.get(category, DELIVERY_COST_PER_KM["default"])
    numerator = graded_value * (1 - min_profit_margin) - operating_charge

    if numerator <= 0:
        return 0.0

    radius_km = numerator / cost_per_km
    return min(radius_km, MAX_RADIUS_KM)


# ─── Function 5: Compute Ring Price ───────────────────────────────────────


def compute_ring_price(
    graded_value: float,
    ring_index: int,
    d_buyer_km: float,
    category: str,
) -> float:
    cost_per_km = DELIVERY_COST_PER_KM.get(category, DELIVERY_COST_PER_KM["default"])
    delivery_cost = cost_per_km * d_buyer_km
    operating_charge = graded_value * OPERATING_CHARGE_PCT

    mvsp = delivery_cost + operating_charge + (graded_value * MIN_PROFIT_MARGIN)

    floor_multiplier = RING_PRICE_FLOORS.get(
        ring_index,
        1.00 + (ring_index - 5) * RING_PRICE_INCREMENT,
    )
    price_floor = graded_value * floor_multiplier

    return round(max(mvsp, price_floor), 2)


# ─── Function 6: Create Floating Discount Listing ────────────────────────


def create_floating_discount_listing(
    item_id: str,
    grading_report: GradingReport,
    routing_result: dict,
    current_location: dict,
    ring_index: int,
) -> FloatingDiscount:
    graded_value = CONDITION_MULTIPLIERS.get(
        grading_report.condition_grade, 0
    ) * routing_result.get("original_price_inr", 0)
    full_return_cost = current_location.get("distance_to_home_warehouse_km", 0)

    sale_price = routing_result["sale_price"]
    discount_pct = round(
        (routing_result.get("original_price_inr", 0) - sale_price)
        / routing_result.get("original_price_inr", 1)
        * 100,
        1,
    )

    ttl_hours = 24 if ring_index == 0 else 48

    listing = FloatingDiscount(
        listing_id=str(uuid4()),
        item_id=item_id,
        current_hub_id=current_location.get("hub_id", "RING_0"),
        ring_index=ring_index,
        original_price_inr=routing_result.get("original_price_inr", 0),
        v_graded_inr=round(graded_value, 2),
        c_remaining_inr=full_return_cost,
        mvsp_inr=round(graded_value - full_return_cost, 2),
        current_sale_price_inr=sale_price,
        discount_pct=max(discount_pct, 0.0),
        radius_km=routing_result["radius"],
        expires_at=datetime.utcnow() + timedelta(hours=ttl_hours),
        status="active",
    )

    put_item(TABLE_FLOATING_DISCOUNTS, listing.model_dump())
    return listing


# ─── Function 7: Advance to Next Ring ─────────────────────────────────────


def advance_to_next_ring(
    item_id: str,
    listing_id: str,
    next_hub_id: str,
    distance_to_home_km: float,
    category: str,
) -> dict:
    from shared.config import TABLE_FLOATING_DISCOUNTS
    from shared.db import query_by_pk, update_item_field

    items = query_by_pk(TABLE_FLOATING_DISCOUNTS, "item_id", item_id)
    matching = [i for i in items if i.get("listing_id") == listing_id]
    if not matching:
        raise ValueError(f"Listing not found: {listing_id}")

    current = matching[0]
    current_ring = current.get("ring_index", 0)
    next_ring = current_ring + 1
    graded_value = current.get("v_graded_inr", 0)

    radius = compute_profitable_radius(
        graded_value, graded_value * OPERATING_CHARGE_PCT, category
    )
    sale_price = compute_ring_price(graded_value, next_ring, radius / 2, category)
    discount_pct = round(
        (current.get("original_price_inr", 0) - sale_price)
        / current.get("original_price_inr", 1)
        * 100,
        1,
    )

    update_item_field(
        TABLE_FLOATING_DISCOUNTS, "item_id", item_id, "current_hub_id", next_hub_id
    )
    update_item_field(
        TABLE_FLOATING_DISCOUNTS, "item_id", item_id, "ring_index", next_ring
    )
    update_item_field(
        TABLE_FLOATING_DISCOUNTS,
        "item_id",
        item_id,
        "current_sale_price_inr",
        sale_price,
    )
    update_item_field(
        TABLE_FLOATING_DISCOUNTS,
        "item_id",
        item_id,
        "discount_pct",
        max(discount_pct, 0.0),
    )
    update_item_field(TABLE_FLOATING_DISCOUNTS, "item_id", item_id, "radius_km", radius)
    update_item_field(
        TABLE_FLOATING_DISCOUNTS,
        "item_id",
        item_id,
        "expires_at",
        (datetime.utcnow() + timedelta(hours=48)).isoformat(),
    )

    return {
        "item_id": item_id,
        "listing_id": listing_id,
        "ring_index": next_ring,
        "sale_price_inr": sale_price,
        "radius_km": radius,
        "discount_pct": max(discount_pct, 0.0),
    }


# ─── Function 8: Handler — Orchestrator ───────────────────────────────────


def handler(event: dict, context=None) -> dict:
    item_id = event["item_id"]
    original_price = event.get("original_price_inr", 0)
    category = event.get("category", "default")
    current_location = event.get("current_location", {})
    ring_index = event.get("ring_index", 0)

    # 1. Load grading report
    grading_report = load_grading_report(item_id)

    # 2. Compute core values
    graded_value = (
        CONDITION_MULTIPLIERS.get(grading_report.condition_grade, 0) * original_price
    )

    distance_to_home = current_location.get("distance_to_home_warehouse_km", 0)
    full_return_cost = compute_full_return_cost(category, distance_to_home)
    overhead_ratio = full_return_cost / graded_value if graded_value > 0 else 0.0
    operating_charge = graded_value * OPERATING_CHARGE_PCT

    # 3. Fast exits — before cascade
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

    # 4. Enter ReRoute?
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

    # 5. ReRoute cascade
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

    # 6. Create marketplace listing
    routing_result = {
        "original_price_inr": original_price,
        "sale_price": sale_price,
        "radius": profitable_radius,
    }
    listing = create_floating_discount_listing(
        item_id,
        grading_report,
        routing_result,
        current_location,
        ring_index,
    )

    mvsp = graded_value - full_return_cost
    reason_text = (
        f"Ring {ring_index} — ₹{sale_price:.0f} within {profitable_radius:.1f}km. "
        f"Overhead: {overhead_ratio:.1%}"
    )

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
