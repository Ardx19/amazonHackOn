"""
Local test for grade_item lambda.
Usage:
  python lambdas/grade_item/test_local.py          # Real AWS calls
  python lambdas/grade_item/test_local.py --mock   # Mock (no AWS, demo fallback)
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "lambdas"))

from shared.models import GradingReport, Defect
from shared.config import CONDITION_GRADES, CONDITION_MULTIPLIERS


def mock_grade(item_id: str) -> GradingReport:
    seed_dir = Path(__file__).resolve().parent.parent.parent / "seed"
    products = json.loads((seed_dir / "products.json").read_text())
    product = next(p for p in products if p["product_id"] == item_id)

    return GradingReport(
        report_id=str(uuid4()),
        item_id=product["product_id"],
        product_category=product["category"],
        brand_guess=product["brand"],
        condition_grade=product["demo_condition_preset"],
        defects=[Defect(**d) for d in product["demo_defects_preset"]],
        completeness="complete",
        confidence=0.88,
        estimated_retail_inr=product["original_price_inr"],
        suggested_resale_band_inr=(
            product["original_price_inr"]
            * CONDITION_MULTIPLIERS[product["demo_condition_preset"]]
            * 0.8,
            product["original_price_inr"]
            * CONDITION_MULTIPLIERS[product["demo_condition_preset"]]
            * 1.0,
        ),
        recommended_route="reroute_deals",
        routing_reason="Condition assessment from seed data — route_evaluator recalculates final route",
        manual_review_recommended=False,
        graded_at=datetime.utcnow(),
        rekognition_labels=["Shoe", "Footwear", "Sneaker", "White", "Rubber Sole"],
    )


def test_real(item_id: str = "PROD_001"):
    from shared.config import (
        AWS_REGION,
        BEDROCK_MODEL_GRADING,
        S3_BUCKET_IMAGES,
        TABLE_GRADING_REPORTS,
    )

    seed_dir = Path(__file__).resolve().parent.parent.parent / "seed"
    products = json.loads((seed_dir / "products.json").read_text())
    product = next(p for p in products if p["product_id"] == item_id)

    event = {
        "item_id": product["product_id"],
        "s3_keys": [product["image_filename"]],
        "original_price_inr": product["original_price_inr"],
        "category": product["category"],
        "product_name": product["name"],
    }

    from grade_item.lambda_function import handler

    result = handler(event)
    print(
        json.dumps(
            result["body"]
            if isinstance(result.get("body"), dict)
            else json.loads(result["body"]),
            indent=2,
            default=str,
        )
    )
    return result


if __name__ == "__main__":
    item_id = sys.argv[2] if len(sys.argv) > 2 else "PROD_001"

    if "--mock" in sys.argv:
        print("  MOCK MODE — no AWS calls")
        report = mock_grade(item_id)
        print()
        print(json.dumps(report.model_dump(), indent=2, default=str))
        print()
        print("  Grading complete (mock)")
    else:
        print("  REAL MODE — calling AWS Rekognition + Bedrock")
        try:
            test_real(item_id)
            print("  Grading complete")
        except Exception as e:
            print(f"  Error: {e}")
