# backend/app/services/return_service.py
# Orchestrates the full return initiation flow:
#   1. Grade the product (via grade_service)
#   2. Generate a dynamic return path (checkpoints from user → Return Center)
#   3. Create the initial floating discount listing (via routing_service)
#
# The caller (Priya) never sees the floating discount — her refund is issued
# immediately. The listing becomes visible to buyers on the Float page.

import math
import logging
from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.config import (
    RETURN_CENTER,
    HUB_ZONES,
    DELIVERY_COST_PER_KM,
    PINCODE_COORDS,
    DEFAULT_USER_COORDS,
)
from app.db.models import HubCheckpoint as HubCheckpointORM
from app.services.grade_service import grade_item
from app.services.routing_service import (
    evaluate_route,
    advance_to_next_ring,
    compute_full_return_cost,
)

logger = logging.getLogger(__name__)


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance between two points in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def pincode_to_coords(pincode: str) -> tuple[float, float]:
    return PINCODE_COORDS.get(pincode, DEFAULT_USER_COORDS)


def generate_return_path(
    user_lat: float,
    user_lng: float,
    num_checkpoints: int = 4,
) -> list[dict]:
    """Generate N evenly-spaced checkpoints between the user's location and the
    Return Center. Each checkpoint has coords, a name, and remaining distance."""
    rc_lat = RETURN_CENTER["lat"]
    rc_lng = RETURN_CENTER["lng"]
    total_distance = _haversine_km(user_lat, user_lng, rc_lat, rc_lng)

    checkpoints = []
    for i in range(num_checkpoints):
        # fraction along the path: 0 = user's home, 1 = Return Center
        frac = i / max(num_checkpoints - 1, 1)
        lat = user_lat + (rc_lat - user_lat) * frac
        lng = user_lng + (rc_lng - user_lng) * frac

        remaining_km = total_distance * (1 - frac)

        if i == 0:
            name = "Returner's Location"
            hub_id = "H0_USER"
        elif i == num_checkpoints - 1:
            name = RETURN_CENTER["name"]
            hub_id = RETURN_CENTER["hub_id"]
        else:
            # Pick the closest real hub for intermediate checkpoints
            best_hub_id = f"CP_{i}"
            best_hub_name = f"Checkpoint {i}"
            best_dist = float("inf")
            for hid, hdata in HUB_ZONES.items():
                d = _haversine_km(lat, lng, hdata["lat"], hdata["lng"])
                if d < best_dist:
                    best_dist = d
                    best_hub_id = hid
                    best_hub_name = hdata["name"]
            name = best_hub_name
            hub_id = best_hub_id

        checkpoints.append({
            "index": i,
            "hub_id": hub_id,
            "hub_name": name,
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "remaining_distance_km": round(remaining_km, 1),
            "hours_from_start": i * 18,  # ~18 hours between checkpoints
        })

    return checkpoints


def persist_checkpoints(
    db: Session,
    item_id: str,
    trajectory_id: str,
    checkpoints: list[dict],
    category: str,
) -> None:
    """Store the generated checkpoints in the hub_checkpoints table."""
    now = datetime.utcnow()
    for cp in checkpoints:
        cost_per_km = DELIVERY_COST_PER_KM.get(category, DELIVERY_COST_PER_KM["default"])
        c_remaining = cost_per_km * cp["remaining_distance_km"]

        row = HubCheckpointORM(
            checkpoint_id=str(uuid4()),
            item_id=item_id,
            trajectory_id=trajectory_id,
            hub_id=cp["hub_id"],
            hub_name=cp["hub_name"],
            arrived_at=now + timedelta(hours=cp["hours_from_start"]),
            c_remaining_inr=round(c_remaining, 2),
            distance_to_warehouse_km=cp["remaining_distance_km"],
            lat=cp["lat"],
            lng=cp["lng"],
        )
        db.add(row)
    db.flush()


def initiate_return(
    db: Session,
    item_id: str,
    product_name: str,
    category: str,
    original_price_inr: float,
    s3_keys: list[str],
    user_lat: float,
    user_lng: float,
) -> dict:
    """Full return initiation pipeline. Called after Priya confirms the return.
    Returns the grading report, route result, and generated path."""

    from app.db.models import Item as ItemORM
    from app.db.models import (
        FloatingDiscount as FloatingDiscountORM,
        HubCheckpoint as HubCheckpointORM,
    )

    # Clean up any prior return artifacts for this item (re-return replaces).
    db.query(FloatingDiscountORM).filter_by(item_id=item_id).delete()
    db.query(HubCheckpointORM).filter_by(item_id=item_id).delete()
    db.flush()

    # Ensure the item exists in the items table (the frontend's catalog IDs may
    # not be in RDS). Upsert: create if missing, skip if already there.
    existing = db.query(ItemORM).filter_by(item_id=item_id).first()
    if not existing:
        new_item = ItemORM(
            item_id=item_id,
            name=product_name,
            category=category,
            brand=None,
            original_price_inr=original_price_inr,
            is_trajectory_product=False,
        )
        db.add(new_item)
        db.flush()

    # Step 1: Grade the product
    grading_report = grade_item(
        item_id=item_id,
        product_name=product_name,
        category=category,
        original_price=original_price_inr,
        s3_keys=s3_keys,
        flow="return",
    )

    # Persist the grading report to DB (grade_item returns a Pydantic model
    # but doesn't persist — the /api/grade route does that separately).
    from app.db.models import GradingReport as GradingReportORM

    # Delete any existing report for this item (re-grade is valid)
    db.query(GradingReportORM).filter_by(item_id=item_id).delete()

    db_report = GradingReportORM(
        report_id=grading_report.report_id,
        item_id=grading_report.item_id,
        product_category=grading_report.product_category,
        brand_guess=grading_report.brand_guess,
        condition_grade=grading_report.condition_grade,
        defects=[d.model_dump() for d in grading_report.defects] if grading_report.defects else [],
        completeness=grading_report.completeness,
        confidence=grading_report.confidence,
        estimated_retail_inr=grading_report.estimated_retail_inr,
        suggested_resale_band_inr=list(grading_report.suggested_resale_band_inr),
        recommended_route=grading_report.recommended_route,
        routing_reason=grading_report.routing_reason,
        manual_review_recommended=grading_report.manual_review_recommended,
        graded_at=grading_report.graded_at,
        rekognition_labels=grading_report.rekognition_labels,
    )
    db.add(db_report)
    db.flush()

    # Step 2: Generate the return path (dynamic checkpoints)
    checkpoints = generate_return_path(user_lat, user_lng, num_checkpoints=4)
    total_distance_km = checkpoints[0]["remaining_distance_km"]
    trajectory_id = f"TRAJ_{item_id}_{uuid4().hex[:6]}"

    # Persist checkpoints
    persist_checkpoints(db, item_id, trajectory_id, checkpoints, category)

    # Step 3: Evaluate route — creates the floating discount listing
    current_location = {
        "hub_id": checkpoints[0]["hub_id"],
        "hub_name": checkpoints[0]["hub_name"],
        "lat": checkpoints[0]["lat"],
        "lng": checkpoints[0]["lng"],
        "distance_to_home_warehouse_km": total_distance_km,
    }
    route_result = evaluate_route(
        db=db,
        item_id=item_id,
        original_price=original_price_inr,
        category=category,
        current_location=current_location,
        ring_index=0,
    )

    db.commit()

    return {
        "grading_report": {
            "condition_grade": grading_report.condition_grade,
            "confidence": grading_report.confidence,
            "defects": [d.model_dump() for d in grading_report.defects],
        },
        "route_result": route_result,
        "trajectory_id": trajectory_id,
        "checkpoints": checkpoints,
        "total_distance_km": total_distance_km,
    }


def get_next_checkpoint(db: Session, item_id: str, current_ring: int) -> dict | None:
    """Find the next checkpoint for this item after the current ring index."""
    checkpoints = (
        db.query(HubCheckpointORM)
        .filter_by(item_id=item_id)
        .order_by(HubCheckpointORM.arrived_at.asc())
        .all()
    )
    next_idx = current_ring + 1
    if next_idx >= len(checkpoints):
        return None
    cp = checkpoints[next_idx]
    return {
        "hub_id": cp.hub_id,
        "hub_name": cp.hub_name,
        "distance_to_warehouse_km": cp.distance_to_warehouse_km,
        "lat": cp.lat,
        "lng": cp.lng,
    }
