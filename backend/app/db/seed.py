# backend/app/db/seed.py
# ReRoute — PostgreSQL Seeder
# Reads existing seed/*.json files (unchanged from v2).
# Run: python -m app.db.seed [--reset]

import json
import sys
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy import text

from app.db.database import Base, engine, SessionLocal
from app.db.models import (
    Item,
    GradingReport,
    FloatingDiscount,
    HubCheckpoint,
    HealthCard,
    Transaction,
    AbuseFlag,
)
from app.core.config import (
    CONDITION_MULTIPLIERS,
    DELIVERY_COST_PER_KM,
    INITIAL_RADIUS_KM,
    HUB_ZONES,
)
from app.services.routing_service import (
    decompose_costs,
    compute_radius,
    compute_floating_price,
    _discount_pct,
)

SEED_DIR = Path(__file__).resolve().parent.parent.parent.parent / "seed"


def create_tables():
    Base.metadata.create_all(bind=engine)


def reset_all():
    db = SessionLocal()
    # Use TRUNCATE ... CASCADE so PostgreSQL handles FK dependencies automatically.
    # Fall back to ordered DELETEs if TRUNCATE is unavailable.
    try:
        db.execute(
            text(
                "TRUNCATE TABLE abuse_flags, transactions, health_cards, "
                "hub_checkpoints, floating_discounts, grading_reports, items CASCADE"
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        # Ordered delete fallback (children before parents)
        tables = [
            AbuseFlag,
            Transaction,
            HealthCard,
            HubCheckpoint,
            FloatingDiscount,
            GradingReport,
            Item,
        ]
        for t in tables:
            db.execute(t.__table__.delete())
        db.commit()
    finally:
        db.close()


def seed_products(db) -> dict:
    with open(SEED_DIR / "products.json") as f:
        products = json.load(f)

    count = 0
    by_id = {}
    for p in products:
        item = Item(
            item_id=p["product_id"],
            name=p["name"],
            category=p["category"],
            brand=p["brand"],
            original_price_inr=p["original_price_inr"],
            image_filename=p["image_filename"],
            demo_condition_preset=p["demo_condition_preset"],
            demo_defects_preset=p["demo_defects_preset"],
            is_trajectory_product=p["is_trajectory_product"],
            trajectory_id=p.get("trajectory_id"),
        )
        db.add(item)
        by_id[p["product_id"]] = p
        count += 1

    db.flush()
    print(f"  Seeded {count} products")
    return by_id


def seed_trajectories(db, products_by_id: dict):
    with open(SEED_DIR / "trajectories.json") as f:
        trajectories = json.load(f)

    cp_count = 0
    fd_count = 0
    now = datetime.utcnow()

    for traj in trajectories:
        product = products_by_id[traj["product_id"]]
        category = product["category"]
        condition = product["demo_condition_preset"]
        original_price = product["original_price_inr"]

        v_graded = CONDITION_MULTIPLIERS[condition] * original_price
        costs = decompose_costs(original_price)
        C, d, mrp = costs["C"], costs["d"], costs["mrp"]

        listing_id = str(uuid.uuid4())

        def _hub_deal(d_remaining: float) -> dict:
            """Apply the floating-discount model at one checkpoint.
            Same formula everywhere: price = MRP - (return cost still avoidable),
            so the price rises and the radius shrinks as the item nears the RC."""
            radius = compute_radius(d_remaining, category)
            sale = compute_floating_price(mrp, C, d_remaining, category)
            return {
                "radius": radius,
                "sale_price": sale,
                "discount_pct": _discount_pct(mrp, sale),
            }

        for idx, cp in enumerate(traj["checkpoints"]):
            hub_id = cp["hub_id"]
            hub = HUB_ZONES[hub_id]
            arrived_at = now + timedelta(hours=cp["hours_from_start"])

            checkpoint = HubCheckpoint(
                checkpoint_id=str(uuid.uuid4()),
                item_id=traj["product_id"],
                trajectory_id=traj["trajectory_id"],
                hub_id=hub_id,
                hub_name=hub["name"],
                arrived_at=arrived_at,
                c_remaining_inr=cp["c_remaining_inr"],
                distance_to_warehouse_km=cp["distance_to_warehouse_km"],
            )
            db.add(checkpoint)
            cp_count += 1

            if idx == 0:
                deal0 = _hub_deal(cp["c_remaining_inr"])

                discount = FloatingDiscount(
                    listing_id=listing_id,
                    item_id=traj["product_id"],
                    product_name=product["name"],
                    current_hub_id=hub_id,
                    current_hub_name=hub["name"],
                    ring_index=0,
                    # original_price_inr holds the MRP ceiling (C + p)
                    original_price_inr=round(mrp, 2),
                    v_graded_inr=round(v_graded, 2),
                    c_remaining_inr=cp["c_remaining_inr"],
                    mvsp_inr=round(deal0["sale_price"], 2),
                    current_sale_price_inr=deal0["sale_price"],
                    discount_pct=deal0["discount_pct"],
                    radius_km=round(deal0["radius"], 1) or float(INITIAL_RADIUS_KM),
                    expires_at=now + timedelta(hours=24),
                    status="active",
                    trajectory=[
                        {
                            "hub_id": tc["hub_id"],
                            "hub_name": HUB_ZONES[tc["hub_id"]]["name"],
                            "c_remaining_inr": tc["c_remaining_inr"],
                            "discount_pct": _hub_deal(tc["c_remaining_inr"])[
                                "discount_pct"
                            ],
                            "sale_price": _hub_deal(tc["c_remaining_inr"])[
                                "sale_price"
                            ],
                        }
                        for tc in traj["checkpoints"]
                    ],
                )
                db.add(discount)
                fd_count += 1

    db.flush()
    print(f"  Seeded {cp_count} hub checkpoints")
    print(f"  Seeded {fd_count} floating discounts")


def seed_personas(db):
    with open(SEED_DIR / "personas.json") as f:
        personas = json.load(f)

    count = 0
    for p in personas:
        item = Item(
            item_id=p["user_id"],
            name=p["name"],
            category="persona",
            brand=None,
            original_price_inr=0,
            is_trajectory_product=False,
            record_type="persona",
            demo_defects_preset=p["return_history"],
        )
        db.add(item)
        count += 1

    db.flush()
    print(f"  Seeded {count} personas")


def main():
    reset = "--reset" in sys.argv

    print("=" * 55)
    print("  ReRoute — PostgreSQL Seed Script")
    print(f"  Reset: {reset}")
    print("=" * 55)

    start = time.time()

    print("\n[1/4] Creating tables...")
    create_tables()

    if reset:
        print("\n[2/4] Resetting data...")
        reset_all()
    else:
        print("\n[2/4] Skipping reset (use --reset)")

    db = SessionLocal()
    try:
        print("\n[3/4] Seeding products...")
        products_by_id = seed_products(db)

        print("\n[4/4] Seeding trajectories + personas...")
        seed_trajectories(db, products_by_id)
        seed_personas(db)

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    elapsed = time.time() - start
    print(f"\n{'=' * 55}")
    print(f"  SEED COMPLETE")
    print(f"  Products: 10 | Trajectories: 3 | Personas: 3")
    print(f"  Time: {elapsed:.1f}s")
    print(f"{'=' * 55}")


if __name__ == "__main__":
    main()
