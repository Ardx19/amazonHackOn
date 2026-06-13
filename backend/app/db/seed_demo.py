# backend/app/db/seed_demo.py
# ReRoute — Demo Seed Script (single JSON source)
# Reads seed_demo.json from the same directory.
# Inserts data for 3 demo scenarios + rich supporting data:
#   30 products, 8 personas, 10 trajectories, 40 checkpoints,
#   10 floating discounts, 12 health cards, 6 transactions.
#
# Run: python -m app.db.seed_demo [--reset]
#
# FK order enforced:
#   items → grading_reports → floating_discounts → hub_checkpoints
#   → health_cards → transactions → abuse_flags

import json
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

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

SEED_FILE = Path(__file__).resolve().parent / "seed_demo.json"
IST = timezone(timedelta(hours=5, minutes=30))

TABLE_ORDER = [
    "items",
    "grading_reports",
    "floating_discounts",
    "hub_checkpoints",
    "health_cards",
    "transactions",
    "abuse_flags",
]


def _parse_iso(ts_str):
    if ts_str is None:
        return None
    dt = datetime.fromisoformat(ts_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    return dt


def _generate_qr_base64(card_url):
    import base64
    import io
    import qrcode

    qr = qrcode.QRCode(box_size=10, border=2)
    qr.add_data(card_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


# ── Row builders ──────────────────────────────────────────────────────────────


def _build_item(row):
    return Item(
        item_id=row["item_id"],
        name=row["name"],
        category=row["category"],
        brand=row.get("brand"),
        original_price_inr=row["original_price_inr"],
        image_filename=row.get("image_filename"),
        demo_condition_preset=row.get("demo_condition_preset"),
        demo_defects_preset=row.get("demo_defects_preset", []),
        is_trajectory_product=row.get("is_trajectory_product", False),
        trajectory_id=row.get("trajectory_id"),
        record_type=row.get("record_type"),
    )


def _build_grading_report(row):
    return GradingReport(
        report_id=row["report_id"],
        item_id=row["item_id"],
        product_category=row["product_category"],
        brand_guess=row.get("brand_guess"),
        condition_grade=row["condition_grade"],
        defects=row["defects"],
        completeness=row["completeness"],
        confidence=row["confidence"],
        estimated_retail_inr=row["estimated_retail_inr"],
        suggested_resale_band_inr=row["suggested_resale_band_inr"],
        recommended_route=row["recommended_route"],
        routing_reason=row["routing_reason"],
        manual_review_recommended=row.get("manual_review_recommended", False),
        graded_at=_parse_iso(row["graded_at"]),
        rekognition_labels=row.get("rekognition_labels", []),
    )


def _build_floating_discount(row):
    return FloatingDiscount(
        listing_id=row["listing_id"],
        item_id=row["item_id"],
        current_hub_id=row.get("current_hub_id"),
        ring_index=row.get("ring_index", 0),
        original_price_inr=row["original_price_inr"],
        v_graded_inr=row["v_graded_inr"],
        c_remaining_inr=row["c_remaining_inr"],
        mvsp_inr=row["mvsp_inr"],
        current_sale_price_inr=row["current_sale_price_inr"],
        discount_pct=row["discount_pct"],
        radius_km=row["radius_km"],
        expires_at=_parse_iso(row["expires_at"]),
        status=row.get("status", "active"),
        product_name=row.get("product_name"),
        current_hub_name=row.get("current_hub_name"),
        trajectory=row.get("trajectory"),
    )


def _build_hub_checkpoint(row):
    return HubCheckpoint(
        checkpoint_id=row["checkpoint_id"],
        item_id=row["item_id"],
        trajectory_id=row.get("trajectory_id"),
        hub_id=row["hub_id"],
        hub_name=row.get("hub_name"),
        arrived_at=_parse_iso(row["arrived_at"]),
        c_remaining_inr=row["c_remaining_inr"],
        distance_to_warehouse_km=row["distance_to_warehouse_km"],
    )


def _build_health_card(row):
    card_url = row.get("card_url", "")
    qr_b64 = None
    try:
        qr_b64 = _generate_qr_base64(card_url)
    except Exception:
        qr_b64 = None

    return HealthCard(
        card_uuid=row["card_uuid"],
        item_id=row["item_id"],
        card_id=row.get("card_id"),
        card_url=card_url,
        condition_grade=row["condition_grade"],
        defects=row.get("defects", []),
        brand_guess=row.get("brand_guess"),
        product_category=row.get("product_category"),
        confidence=row["confidence"],
        seller_name=row.get("seller_name"),
        seller_city=row.get("seller_city"),
        amazon_guarantee=row.get("amazon_guarantee", True),
        generated_at=_parse_iso(row["generated_at"]),
        grading_model_version=row.get("grading_model_version"),
        qr_code_base64=qr_b64,
        condition_summary=row.get("condition_summary"),
        usage_estimate=row.get("usage_estimate"),
        care_recommendation=row.get("care_recommendation"),
        seller_usage_description=row.get("seller_usage_description"),
    )


def _build_transaction(row):
    return Transaction(
        transaction_id=row["transaction_id"],
        listing_id=row["listing_id"],
        buyer_id=row["buyer_id"],
        seller_id=row["seller_id"],
        amount_inr=row["amount_inr"],
        listing_type=row["listing_type"],
        status=row.get("status", "pending"),
        created_at=_parse_iso(row["created_at"]),
        completed_at=_parse_iso(row.get("completed_at")),
    )


def _build_abuse_flag(row):
    return AbuseFlag(
        account_id=row["account_id"],
        rule_triggered=row["rule_triggered"],
        flagged_at=_parse_iso(row["flagged_at"]),
    )


_BUILDERS = {
    "items": _build_item,
    "grading_reports": _build_grading_report,
    "floating_discounts": _build_floating_discount,
    "hub_checkpoints": _build_hub_checkpoint,
    "health_cards": _build_health_card,
    "transactions": _build_transaction,
    "abuse_flags": _build_abuse_flag,
}

_MODEL_BY_TABLE = {
    "items": Item,
    "grading_reports": GradingReport,
    "floating_discounts": FloatingDiscount,
    "hub_checkpoints": HubCheckpoint,
    "health_cards": HealthCard,
    "transactions": Transaction,
    "abuse_flags": AbuseFlag,
}


def _load_data():
    if not SEED_FILE.exists():
        print(f"ERROR: {SEED_FILE} not found")
        sys.exit(1)
    with open(SEED_FILE) as f:
        return json.load(f)


def create_tables():
    Base.metadata.create_all(bind=engine)


def reset_all(db):
    # TRUNCATE CASCADE handles FK dependencies cleanly.
    try:
        from sqlalchemy import text
        tables_csv = ", ".join(
            _MODEL_BY_TABLE[t].__tablename__ for t in TABLE_ORDER
        )
        db.execute(text(f"TRUNCATE TABLE {tables_csv} CASCADE"))
        db.commit()
        print(f"  Truncated all tables (CASCADE)")
    except Exception as e:
        db.rollback()
        # Fallback: ordered delete children-before-parents
        for table_name in reversed(TABLE_ORDER):
            model = _MODEL_BY_TABLE[table_name]
            count = db.query(model).count()
            if count:
                db.execute(model.__table__.delete())
                print(f"  Reset {model.__tablename__}: deleted {count} rows")
        db.commit()


def seed_all(db, data):
    counts = {}

    for table_name in TABLE_ORDER:
        rows = data.get(table_name, [])
        if not rows:
            counts[table_name] = 0
            continue

        model = _MODEL_BY_TABLE[table_name]
        builder = _BUILDERS[table_name]
        for row in rows:
            obj = builder(row)
            db.add(obj)

        db.flush()
        counts[table_name] = len(rows)
        print(f"  {model.__tablename__}: {len(rows)} rows")

    db.commit()
    return counts


def main():
    reset = "--reset" in sys.argv

    print("=" * 55)
    print("  ReRoute — Demo Seed Script")
    print(f"  Source: {SEED_FILE.name}")
    print(f"  Reset: {reset}")
    print("=" * 55)

    start = time.time()

    print("\n[1/3] Loading seed data...")
    data = _load_data()
    total_rows = sum(len(v) if isinstance(v, list) else 0 for v in data.values())
    print(f"  Loaded {total_rows} rows across {len(data)} tables")

    print("\n[2/3] Creating tables...")
    create_tables()

    db = SessionLocal()
    try:
        if reset:
            print("\n[3/3] Resetting + seeding...")
            reset_all(db)
        else:
            print("\n[3/3] Seeding (skip reset — use --reset to wipe first)...")

        counts = seed_all(db, data)

        elapsed = time.time() - start
        print(f"\n{'=' * 55}")
        print(f"  SEED COMPLETE")
        for tn in TABLE_ORDER:
            c = counts.get(tn, 0)
            if c:
                model = _MODEL_BY_TABLE[tn]
                print(f"  {model.__tablename__:<20s} {c} rows")
        print(f"  {'─' * 30}")
        print(f"  {'TOTAL':<20s} {sum(counts.values())} rows")
        print(f"  Time: {elapsed:.1f}s")
        print(f"{'=' * 55}")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
