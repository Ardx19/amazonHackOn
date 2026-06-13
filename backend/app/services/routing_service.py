# backend/app/services/routing_service.py
# Floating Discount economic model — Scenario 1 (Priya customer return).
#
# Intuition (matches the agreed routing flow):
#   1. Return initiated. We know Priya's address (where it is now) and the
#      return center it must reach.
#   2. Between them lies a chain of checkpoints (hubs). The item relists at each.
#   3. At every checkpoint, D_remaining = the return cost Amazon has STILL to
#      spend to finish the journey. That leftover cost is exactly the budget
#      Amazon can spend on a local delivery instead.
#   4. radius   = D_remaining / cost_per_km  -> the break-even ("minimal loss")
#      zone. A buyer farther than this costs more to deliver to than Amazon
#      would save, so they never see the listing.
#   5. price    = MRP - D_remaining          -> the deal price for a buyer at the
#      hub. As the item travels toward the RC, D_remaining shrinks, so the price
#      RISES toward MRP and the radius SHRINKS. Selling early/at home is the
#      cheapest, widest-reach moment. Near the RC there is almost nothing left
#      to save, so it is basically full price.
#
# Amazon never loses: its net on any reroute sale is MRP - D_remaining, the same
# it would net by finishing the return and reselling at MRP — but faster, with
# working capital freed and the return journey's carbon avoided.
#
# Variable map (all INR unless noted):
#   original_price = what Priya paid = C + p + d
#   C    = COGS                       (config COGS_RATIO            x original)
#   p    = original margin            (config MARGIN_RATIO          x original)
#   d    = original delivery to Priya (config ORIGINAL_DELIVERY_RATIO x original)
#   mrp  = ceiling resale price = C + p   (price of a new unit, no delivery)
#   D_remaining = cost_per_km x distance still to travel to the RC
#   d'   = new delivery cost to a buyer = cost_per_km x d_buyer_km

import logging
from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.config import (
    CONDITION_MULTIPLIERS,
    DELIVERY_COST_PER_KM,
    GRADING_CONFIDENCE_THRESHOLD,
    OVERHEAD_RATIO_THRESHOLD,
    RENEWED_MIN_VALUE,
    MAX_RADIUS_KM,
    COGS_RATIO,
    MARGIN_RATIO,
    ORIGINAL_DELIVERY_RATIO,
    MRP_RATIO,
)
from app.db.models import (
    Item as ItemORM,
    GradingReport as GradingReportORM,
    FloatingDiscount as FloatingDiscountORM,
)

logger = logging.getLogger(__name__)


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _cost_per_km(category: str) -> float:
    return DELIVERY_COST_PER_KM.get(category, DELIVERY_COST_PER_KM["default"])


def decompose_costs(original_price: float) -> dict:
    """Split the price Priya paid into C, p, d and derive the MRP ceiling."""
    return {
        "C": original_price * COGS_RATIO,
        "p": original_price * MARGIN_RATIO,
        "d": original_price * ORIGINAL_DELIVERY_RATIO,
        "mrp": original_price * MRP_RATIO,
    }


def load_grading_report(db: Session, item_id: str) -> GradingReportORM:
    report = db.query(GradingReportORM).filter_by(item_id=item_id).first()
    if report is None:
        raise ValueError(f"GradingReport not found: item_id={item_id}")
    return report


def compute_full_return_cost(category: str, distance_to_rc_km: float) -> float:
    """D_remaining = cost_per_km x distance still to travel to the RC."""
    return _cost_per_km(category) * distance_to_rc_km


# ─── Reroute eligibility ──────────────────────────────────────────────────────


def should_enter_reroute(
    mrp: float, full_return_cost: float, confidence: float
) -> tuple[bool, str]:
    """Reroute only pays off when the return cost is a meaningful fraction of
    the item's resale value and we trust the grade."""
    overhead_ratio = full_return_cost / mrp if mrp > 0 else 0.0

    if confidence < GRADING_CONFIDENCE_THRESHOLD:
        return False, (
            f"Grading confidence {confidence:.0%} below {GRADING_CONFIDENCE_THRESHOLD:.0%} "
            "— manual inspection required"
        )

    if overhead_ratio < OVERHEAD_RATIO_THRESHOLD:
        return False, (
            f"Return overhead {overhead_ratio:.1%} below {OVERHEAD_RATIO_THRESHOLD:.1%} "
            "— standard return is cheaper than rerouting"
        )

    return (
        True,
        f"Return overhead {overhead_ratio:.1%} exceeds {OVERHEAD_RATIO_THRESHOLD:.1%} "
        "— floating discount cascade initiated",
    )


# ─── Radius & price (single unified model for every checkpoint) ───────────────


def compute_radius(D_remaining: float, category: str) -> float:
    """Break-even ('minimal loss') radius around the current checkpoint.
        radius = D_remaining / cost_per_km
    Beyond it, delivering to a buyer costs more than Amazon saves by avoiding
    the rest of the return, so the listing is not shown there."""
    if D_remaining <= 0:
        return 0.0
    return min(D_remaining / _cost_per_km(category), MAX_RADIUS_KM)


def discount_budget(D_remaining: float, mrp: float, cogs: float) -> float:
    """How much discount Amazon can give = the return cost it still avoids,
    capped so the price never falls below COGS."""
    return max(min(D_remaining, mrp - cogs), 0.0)


def compute_floating_price(
    mrp: float,
    cogs: float,
    D_remaining: float,
    category: str,
    d_buyer_km: float = 0.0,
) -> float:
    """Deal price at the current checkpoint.
        price = MRP - (discount_budget - d')   clamped to [MRP - budget, MRP]
    With d_buyer_km = 0 (buyer at the hub) this is the best/floor price; farther
    buyers pay more because their delivery eats into the saving. Amazon's net is
    MRP - D_remaining either way."""
    budget = discount_budget(D_remaining, mrp, cogs)
    d_prime = _cost_per_km(category) * d_buyer_km
    price = mrp - max(budget - d_prime, 0.0)
    floor = mrp - budget
    return round(min(max(price, floor), mrp), 2)


def _discount_pct(mrp: float, sale_price: float) -> float:
    if mrp <= 0:
        return 0.0
    return round(max((mrp - sale_price) / mrp * 100, 0.0), 1)


# ─── Persistence ──────────────────────────────────────────────────────────────


def create_floating_discount_listing(
    db: Session,
    item_id: str,
    product_name: str | None,
    graded_value: float,
    mrp: float,
    floor_price: float,
    sale_price: float,
    D_remaining: float,
    radius: float,
    discount_pct: float,
    current_location: dict,
    ring_index: int,
) -> FloatingDiscountORM:
    ttl_hours = 24 if ring_index == 0 else 48

    listing = FloatingDiscountORM(
        listing_id=str(uuid4()),
        item_id=item_id,
        product_name=product_name,
        current_hub_id=current_location.get("hub_id", "RING_0"),
        current_hub_name=current_location.get("hub_name"),
        ring_index=ring_index,
        # original_price_inr holds the MRP ceiling — the "new unit" strike price
        # the discount is measured against.
        original_price_inr=round(mrp, 2),
        v_graded_inr=round(graded_value, 2),
        c_remaining_inr=round(D_remaining, 2),
        mvsp_inr=round(floor_price, 2),
        current_sale_price_inr=sale_price,
        discount_pct=discount_pct,
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
    distance_to_rc_km: float,
    category: str,
    next_hub_name: str | None = None,
) -> dict:
    """Move an active listing to the next checkpoint. The remaining return cost
    shrinks, so the radius shrinks and the price RISES toward the MRP."""
    listing = db.query(FloatingDiscountORM).filter_by(item_id=item_id).first()
    if not listing:
        raise ValueError(f"Listing not found: {listing_id}")

    next_ring = (listing.ring_index or 0) + 1
    mrp = listing.original_price_inr          # MRP was stored here at creation
    original_price = mrp / MRP_RATIO if MRP_RATIO else 0.0
    C = original_price * COGS_RATIO

    D_remaining = compute_full_return_cost(category, distance_to_rc_km)
    radius = compute_radius(D_remaining, category)
    sale_price = compute_floating_price(mrp, C, D_remaining, category)
    discount_pct = _discount_pct(mrp, sale_price)

    listing.current_hub_id = next_hub_id
    if next_hub_name is not None:
        listing.current_hub_name = next_hub_name
    listing.ring_index = next_ring
    listing.c_remaining_inr = round(D_remaining, 2)
    listing.mvsp_inr = round(sale_price, 2)
    listing.current_sale_price_inr = sale_price
    listing.discount_pct = discount_pct
    listing.radius_km = radius
    listing.expires_at = datetime.utcnow() + timedelta(hours=48)

    db.flush()

    return {
        "item_id": item_id,
        "listing_id": listing.listing_id,
        "ring_index": next_ring,
        "sale_price_inr": sale_price,
        "radius_km": radius,
        "discount_pct": discount_pct,
    }


# ─── Response builder ─────────────────────────────────────────────────────────


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
    mrp_val=0.0,
    cogs_val=0.0,
    discount_pct=0.0,
    sale_case="",
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
        "mrp_inr": round(mrp_val, 2),
        "cogs_inr": round(cogs_val, 2),
        "discount_pct": discount_pct,
        "sale_case": sale_case,
    }


# ─── Orchestrator ─────────────────────────────────────────────────────────────


def evaluate_route(
    db: Session,
    item_id: str,
    original_price: float,
    category: str,
    current_location: dict,
    ring_index: int = 0,
) -> dict:
    grading_report = load_grading_report(db, item_id)

    costs = decompose_costs(original_price)
    C, mrp = costs["C"], costs["mrp"]

    graded_value = (
        CONDITION_MULTIPLIERS.get(grading_report.condition_grade, 0) * original_price
    )
    distance_to_rc = current_location.get("distance_to_home_warehouse_km", 0)
    D_remaining = compute_full_return_cost(category, distance_to_rc)
    overhead_ratio = D_remaining / mrp if mrp > 0 else 0.0

    # ── Pre-filters that never enter the floating-discount cascade ──
    if grading_report.condition_grade == "Poor":
        return _route_response(
            item_id, "recycle", 0.0, 0.0, 0, overhead_ratio,
            "Poor condition — item not resaleable", False,
            mrp_val=mrp, cogs_val=C,
        )

    if (
        grading_report.condition_grade == "Like New"
        and original_price >= RENEWED_MIN_VALUE
    ):
        return _route_response(
            item_id, "amazon_renewed", round(mrp, 2), 0.0, 0, overhead_ratio,
            f"Like New, ₹{original_price:.0f} — Amazon Renewed eligible", False,
            mrp_val=mrp, cogs_val=C,
        )

    enter, reason = should_enter_reroute(mrp, D_remaining, grading_report.confidence)
    if not enter:
        return _route_response(
            item_id, "standard_return", round(mrp, 2), 0.0, 0, overhead_ratio,
            reason, False, mrp_val=mrp, cogs_val=C,
        )

    # ── Floating discount: identical formula at every checkpoint ──
    radius = compute_radius(D_remaining, category)
    if radius <= 0:
        return _route_response(
            item_id, "standard_return", round(mrp, 2), 0.0, ring_index, overhead_ratio,
            "No remaining return cost to recover — standard resale at RC",
            False, mrp_val=mrp, cogs_val=C,
        )

    sale_price = compute_floating_price(mrp, C, D_remaining, category)
    discount_pct = _discount_pct(mrp, sale_price)
    sale_case = "at_home" if ring_index == 0 else "in_transit"

    item = db.query(ItemORM).filter_by(item_id=item_id).first()
    product_name = item.name if item else None

    listing = create_floating_discount_listing(
        db,
        item_id=item_id,
        product_name=product_name,
        graded_value=graded_value,
        mrp=mrp,
        floor_price=sale_price,
        sale_price=sale_price,
        D_remaining=D_remaining,
        radius=radius,
        discount_pct=discount_pct,
        current_location=current_location,
        ring_index=ring_index,
    )

    reason_text = (
        f"Ring {ring_index} ({sale_case}) — ₹{sale_price:.0f} within "
        f"{radius:.1f}km, {discount_pct:.0f}% off MRP ₹{mrp:.0f}. "
        f"Return overhead {overhead_ratio:.1%}"
    )

    return _route_response(
        item_id,
        "reroute_deals",
        sale_price,
        radius,
        ring_index,
        overhead_ratio,
        reason_text,
        True,
        listing_id=listing.listing_id,
        mvsp_val=sale_price,
        mrp_val=mrp,
        cogs_val=C,
        discount_pct=discount_pct,
        sale_case=sale_case,
    )
