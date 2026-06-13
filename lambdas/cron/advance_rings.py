"""
ReRoute — Cron Lambda: Ring Progression
Fires every 24h via EventBridge. Advances unsold listings to next ring.
Only Lambda kept from v2 architecture.

Deploy: zip + Lambda console, or via App Runner cron.
"""

import json
import logging
import os
import sys

# Add backend to path so we can import services
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../backend"))

from app.db.database import SessionLocal
from app.db.models import FloatingDiscount as FloatingDiscountORM
from app.services.routing_service import advance_to_next_ring
from app.core.config import HUB_ZONES

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def handler(event=None, context=None) -> dict:
    db = SessionLocal()
    advanced = 0
    skipped = 0
    errors = []

    try:
        active_listings = db.query(FloatingDiscountORM).filter_by(status="active").all()

        for listing in active_listings:
            try:
                current_ring = listing.ring_index or 0
                next_ring = current_ring + 1
                hub_keys = list(HUB_ZONES.keys())
                if next_ring >= len(hub_keys):
                    skipped += 1
                    continue

                next_hub_id = hub_keys[next_ring]
                distance = next_ring * 12  # simplified: ~12km per hop

                advance_to_next_ring(
                    db=db,
                    item_id=listing.item_id,
                    listing_id=listing.listing_id,
                    next_hub_id=next_hub_id,
                    distance_to_home_km=distance,
                    category="default",
                )
                advanced += 1

            except Exception as e:
                errors.append({"listing_id": listing.listing_id, "error": str(e)})
                logger.error(f"Failed to advance {listing.listing_id}: {e}")

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Fatal error: {e}")
    finally:
        db.close()

    result = {
        "status": "complete",
        "advanced": advanced,
        "skipped": skipped,
        "errors": len(errors),
    }
    logger.info(json.dumps(result))
    return result
