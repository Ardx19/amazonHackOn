#!/usr/bin/env python3
"""
ReRoute — DynamoDB Seed Script
Run once before demo: python seed/seed_dynamodb.py
Idempotent: safe to run multiple times (overwrites existing data)
"""

import json
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

# Add parent to path so we can import shared modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "lambdas"))

import boto3
from shared.config import (
    AWS_REGION,
    TABLE_ITEMS,
    TABLE_GRADING_REPORTS,
    TABLE_FLOATING_DISCOUNTS,
    TABLE_HUB_CHECKPOINTS,
    TABLE_HEALTH_CARDS,
    TABLE_TRANSACTIONS,
    TABLE_ABUSE_FLAGS,
    CONDITION_MULTIPLIERS,
    DELIVERY_COST_PER_KM,
    INITIAL_RADIUS_KM,
    HUB_ZONES,
)

SEED_DIR = Path(__file__).resolve().parent

dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)


# ─── Table Definitions ────────────────────────────────────────────────────────

TABLE_SCHEMAS = {
    TABLE_ITEMS: {
        "KeySchema": [{"AttributeName": "item_id", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "item_id", "AttributeType": "S"}],
    },
    TABLE_GRADING_REPORTS: {
        "KeySchema": [
            {"AttributeName": "item_id", "KeyType": "HASH"},
            {"AttributeName": "report_id", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "item_id", "AttributeType": "S"},
            {"AttributeName": "report_id", "AttributeType": "S"},
        ],
    },
    TABLE_FLOATING_DISCOUNTS: {
        "KeySchema": [
            {"AttributeName": "listing_id", "KeyType": "HASH"},
            {"AttributeName": "item_id", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "listing_id", "AttributeType": "S"},
            {"AttributeName": "item_id", "AttributeType": "S"},
        ],
    },
    TABLE_HUB_CHECKPOINTS: {
        "KeySchema": [
            {"AttributeName": "item_id", "KeyType": "HASH"},
            {"AttributeName": "checkpoint_id", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "item_id", "AttributeType": "S"},
            {"AttributeName": "checkpoint_id", "AttributeType": "S"},
        ],
    },
    TABLE_HEALTH_CARDS: {
        "KeySchema": [{"AttributeName": "card_uuid", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "card_uuid", "AttributeType": "S"}],
    },
    TABLE_TRANSACTIONS: {
        "KeySchema": [{"AttributeName": "transaction_id", "KeyType": "HASH"}],
        "AttributeDefinitions": [
            {"AttributeName": "transaction_id", "AttributeType": "S"}
        ],
    },
    TABLE_ABUSE_FLAGS: {
        "KeySchema": [
            {"AttributeName": "account_id", "KeyType": "HASH"},
            {"AttributeName": "rule_triggered", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "account_id", "AttributeType": "S"},
            {"AttributeName": "rule_triggered", "AttributeType": "S"},
        ],
    },
}


def _serialize(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize(v) for v in obj]
    return obj


# ─── Table Management ─────────────────────────────────────────────────────────


def create_tables():
    existing = {t.name for t in dynamodb.tables.all()}
    created = 0
    for table_name, schema in TABLE_SCHEMAS.items():
        if table_name in existing:
            print(f"  Table already exists: {table_name}")
            continue
        dynamodb.create_table(
            TableName=table_name,
            KeySchema=schema["KeySchema"],
            AttributeDefinitions=schema["AttributeDefinitions"],
            BillingMode="PAY_PER_REQUEST",
        )
        created += 1
        print(f"  Creating table: {table_name}")

    if created > 0:
        print(f"\n  Waiting for {created} table(s) to become ACTIVE...")
        for table_name in TABLE_SCHEMAS:
            table = dynamodb.Table(table_name)
            table.wait_until_exists()
            print(f"  {table_name} — ACTIVE")

    return created


def reset_tables():
    print("  --reset: deleting all records from all tables...")
    for table_name in TABLE_SCHEMAS:
        table = dynamodb.Table(table_name)
        try:
            items = table.scan().get("Items", [])
            with table.batch_writer() as batch:
                for item in items:
                    key = {}
                    for ks in TABLE_SCHEMAS[table_name]["KeySchema"]:
                        attr = ks["AttributeName"]
                        key[attr] = item[attr]
                    batch.delete_item(Key=key)
            print(f"  Cleared {len(items)} records from {table_name}")
        except Exception as e:
            print(f"  Could not clear {table_name}: {e}")


# ─── Seeding ──────────────────────────────────────────────────────────────────


def seed_products():
    table = dynamodb.Table(TABLE_ITEMS)
    with open(SEED_DIR / "products.json") as f:
        products = json.load(f)

    count = 0
    for p in products:
        item = {
            "item_id": p["product_id"],
            "name": p["name"],
            "category": p["category"],
            "brand": p["brand"],
            "original_price_inr": p["original_price_inr"],
            "image_filename": p["image_filename"],
            "demo_condition_preset": p["demo_condition_preset"],
            "demo_defects_preset": p["demo_defects_preset"],
            "is_trajectory_product": p["is_trajectory_product"],
            "trajectory_id": p.get("trajectory_id"),
        }
        table.put_item(Item=_serialize(item))
        count += 1
    print(f"  Seeded {count} products into {TABLE_ITEMS}")
    return {p["product_id"]: p for p in products}


def seed_trajectories(products_by_id: dict):
    cp_table = dynamodb.Table(TABLE_HUB_CHECKPOINTS)
    fd_table = dynamodb.Table(TABLE_FLOATING_DISCOUNTS)

    with open(SEED_DIR / "trajectories.json") as f:
        trajectories = json.load(f)

    cp_count = 0
    fd_count = 0

    for traj in trajectories:
        product = products_by_id[traj["product_id"]]
        category = product["category"]
        condition = product["demo_condition_preset"]
        original_price = product["original_price_inr"]

        v_graded = CONDITION_MULTIPLIERS[condition] * original_price
        cost_per_km = DELIVERY_COST_PER_KM.get(
            category, DELIVERY_COST_PER_KM["default"]
        )
        max_cost = traj["checkpoints"][0]["c_remaining_inr"]

        listing_id = str(uuid4())
        now = datetime.utcnow()

        for idx, cp in enumerate(traj["checkpoints"]):
            hub_id = cp["hub_id"]
            hub = HUB_ZONES[hub_id]

            checkpoint_id = str(uuid4())
            arrived_at = now + timedelta(hours=cp["hours_from_start"])

            cp_table.put_item(
                Item=_serialize(
                    {
                        "checkpoint_id": checkpoint_id,
                        "item_id": traj["product_id"],
                        "trajectory_id": traj["trajectory_id"],
                        "hub_id": hub_id,
                        "hub_name": hub["name"],
                        "arrived_at": arrived_at,
                        "c_remaining_inr": cp["c_remaining_inr"],
                        "distance_to_warehouse_km": cp["distance_to_warehouse_km"],
                    }
                )
            )
            cp_count += 1

            if idx == 0:
                discount_pct = round((cp["c_remaining_inr"] / max_cost) * 40)
                sale_price = round(original_price * (1 - discount_pct / 100))
                mvsp = v_graded - cp["c_remaining_inr"]

                fd_table.put_item(
                    Item=_serialize(
                        {
                            "listing_id": listing_id,
                            "item_id": traj["product_id"],
                            "product_name": product["name"],
                            "current_hub_id": hub_id,
                            "current_hub_name": hub["name"],
                            "original_price_inr": original_price,
                            "v_graded_inr": round(v_graded, 2),
                            "c_remaining_inr": cp["c_remaining_inr"],
                            "mvsp_inr": round(mvsp, 2),
                            "current_sale_price_inr": sale_price,
                            "discount_pct": discount_pct,
                            "radius_km": INITIAL_RADIUS_KM,
                            "expires_at": (now + timedelta(hours=24)).isoformat(),
                            "status": "active",
                            "trajectory": [
                                {
                                    "hub_id": tc["hub_id"],
                                    "hub_name": HUB_ZONES[tc["hub_id"]]["name"],
                                    "c_remaining_inr": tc["c_remaining_inr"],
                                    "discount_pct": round(
                                        (tc["c_remaining_inr"] / max_cost) * 40
                                    ),
                                    "sale_price": round(
                                        original_price
                                        * (
                                            1
                                            - round(
                                                (tc["c_remaining_inr"] / max_cost) * 40
                                            )
                                            / 100
                                        )
                                    ),
                                }
                                for tc in traj["checkpoints"]
                            ],
                        }
                    )
                )
                fd_count += 1

    print(f"  Seeded {cp_count} hub checkpoints into {TABLE_HUB_CHECKPOINTS}")
    print(f"  Seeded {fd_count} floating discounts into {TABLE_FLOATING_DISCOUNTS}")


def seed_personas():
    table = dynamodb.Table(TABLE_ITEMS)  # Personas go into Items table as user records

    with open(SEED_DIR / "personas.json") as f:
        personas = json.load(f)

    count = 0
    for p in personas:
        item = {
            "item_id": p["user_id"],
            "name": p["name"],
            "role": p["role"],
            "city": p["city"],
            "address_hash": p["address_hash"],
            "payment_instrument_hash": p["payment_instrument_hash"],
            "return_history": p["return_history"],
            "record_type": "persona",
        }
        table.put_item(Item=_serialize(item))
        count += 1
    print(f"  Seeded {count} personas into {TABLE_ITEMS}")


# ─── Main ─────────────────────────────────────────────────────────────────────


def main():
    reset = "--reset" in sys.argv

    print("=" * 55)
    print("  ReRoute — DynamoDB Seed Script")
    print(f"  Region: {AWS_REGION}")
    print(f"  Reset: {reset}")
    print("=" * 55)

    start = time.time()

    # 1. Create tables
    print("\n[1/5] Creating DynamoDB tables...")
    created = create_tables()

    # 2. Reset if requested
    if reset:
        print("\n[2/5] Resetting existing data...")
        reset_tables()
    else:
        print("\n[2/5] Skipping reset (use --reset to clear data)")

    # 3. Seed products
    print("\n[3/5] Seeding products...")
    products_by_id = seed_products()

    # 4. Seed trajectories + floating discounts
    print("\n[4/5] Seeding trajectories and floating discounts...")
    seed_trajectories(products_by_id)

    # 5. Seed personas
    print("\n[5/5] Seeding personas...")
    seed_personas()

    elapsed = time.time() - start
    print(f"\n{'=' * 55}")
    print(f"  SEED COMPLETE")
    print(f"  Tables created: {created}")
    print(f"  Products: 10")
    print(f"  Trajectories: 3 (12 checkpoints)")
    print(f"  Floating Discounts: 3")
    print(f"  Personas: 3")
    print(f"  Time: {elapsed:.1f}s")
    print(f"{'=' * 55}")


if __name__ == "__main__":
    main()
