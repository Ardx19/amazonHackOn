"""
Local test for route_evaluator lambda.
Usage:
  python lambdas/route_evaluator/test_local.py --mock   # pure math, no AWS
  python lambdas/route_evaluator/test_local.py            # needs DynamoDB
"""

import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "lambdas"))

from shared.config import (
    CONDITION_MULTIPLIERS,
    DELIVERY_COST_PER_KM,
    OPERATING_CHARGE_PCT,
    MAX_RADIUS_KM,
    RING_PRICE_FLOORS,
)


def test_funcs():
    from route_evaluator.lambda_function import (
        compute_full_return_cost,
        should_enter_reroute,
        compute_profitable_radius,
        compute_ring_price,
    )

    passed = 0
    failed = 0

    # ── Test 1: Full return cost ──────────────────────────────────────
    cost = compute_full_return_cost("footwear", 48.0)
    expected = 2.5 * 48.0
    assert cost == expected, f"Test 1 FAIL: {cost} != {expected}"
    passed += 1

    # ── Test 2: overhead_ratio check ─────────────────────────────────
    enter, reason = should_enter_reroute(359.40, 120.0, 0.88)
    assert enter is True, f"Test 2 FAIL: should enter but got {reason}"
    passed += 1

    # ── Test 3: confidence below threshold ──────────────────────────
    enter, reason = should_enter_reroute(359.40, 120.0, 0.72)
    assert enter is False, f"Test 3 FAIL: should not enter"
    assert "manual inspection" in reason.lower()
    passed += 1

    # ── Test 4: low overhead ratio → standard return ─────────────────
    enter, reason = should_enter_reroute(5000.0, 100.0, 0.90)
    assert enter is False, f"Test 4 FAIL: overhead 2% should skip ReRoute"
    passed += 1

    # ── Test 5: profitable radius — Priya's shoes ────────────────────
    graded_value = 359.40
    operating_charge = graded_value * OPERATING_CHARGE_PCT
    radius = compute_profitable_radius(graded_value, operating_charge, "footwear")
    assert radius > 0, f"Test 5 FAIL: radius should be > 0, got {radius}"
    assert radius == MAX_RADIUS_KM, (
        f"Test 5 FAIL: should cap at {MAX_RADIUS_KM}, got {radius}"
    )
    passed += 1

    # ── Test 6: profitable radius — zero (low value, high ops cost) ──
    radius = compute_profitable_radius(30.0, 35.0, "electronics")
    assert radius == 0.0, f"Test 6 FAIL: should be 0, got {radius}"
    passed += 1

    # ── Test 7: ring price progression — Priya's shoes ──────────────
    prices = []
    for ring in range(6):
        d_buyer = MAX_RADIUS_KM / 2  # 25km
        price = compute_ring_price(graded_value, ring, d_buyer, "footwear")
        prices.append(price)
        floor = RING_PRICE_FLOORS.get(ring, 1.00 + (ring - 5) * 0.02)
        floor_price = round(graded_value * floor, 2)
        assert price >= floor_price, (
            f"Ring {ring}: price {price} below floor {floor_price}"
        )

    for i in range(len(prices) - 1):
        assert prices[i] <= prices[i + 1], (
            f"Ring {i}→{i + 1}: price should rise, got {prices[i]} → {prices[i + 1]}"
        )
    passed += 1

    print(f"\n  Tests: {passed}/7 passed")
    if failed:
        print(f"  FAILURES: {failed}")
    return passed, prices


def print_ring_table(graded_value: float, original_price: float, category: str):
    from route_evaluator.lambda_function import compute_ring_price

    max_radius = MAX_RADIUS_KM
    d_buyer = max_radius / 2

    print()
    print(
        f"  Ring Progression — Priya's Shoes (₹{original_price:.0f}, Good, 48km, {category})"
    )
    print("  " + "=" * 65)
    print(f"  {'Ring':<25} {'Price':<10} {'Radius':<12} {'Discount':<10}")
    print("  " + "-" * 65)

    for ring in range(6):
        price = compute_ring_price(graded_value, ring, d_buyer, category)
        discount = round((original_price - price) / original_price * 100, 1)
        label = (
            "Ring 0 (Customer Origin)"
            if ring == 0
            else f"Ring {ring} (Hub #{ring})"
            if ring < 5
            else "Home Warehouse"
        )
        print(f"  {label:<25} ₹{price:<9.2f} {max_radius:.1f}km        {discount:.1f}%")

    print("  " + "=" * 65)


def test_routes(graded_value: float, original_price: float, category: str):
    from route_evaluator.lambda_function import (
        should_enter_reroute,
        compute_profitable_radius,
    )

    full_return_cost = 120.0
    operating_charge = graded_value * OPERATING_CHARGE_PCT
    confidence = 0.88

    # Route decision checks
    enter, _ = should_enter_reroute(graded_value, full_return_cost, confidence)
    radius = compute_profitable_radius(graded_value, operating_charge, category)

    print(f"\n  Route Decision — PROD_001")
    print(f"  {'Graded Value:':<30} ₹{graded_value:.2f}")
    print(f"  {'Full Return Cost:':<30} ₹{full_return_cost:.2f}")
    print(f"  {'Overhead Ratio:':<30} {full_return_cost / graded_value:.1%}")
    print(f"  {'Enter ReRoute:':<30} {enter}")
    print(f"  {'Profitable Radius:':<30} {radius:.1f} km")
    print(f"  {'Confidence:':<30} {confidence:.0%}")


def mock_handler_tests():
    from route_evaluator.lambda_function import handler

    print("\n  ── Mock Handler Tests (bypasses DynamoDB — validates routing logic) ──")
    print(
        "  NOTE: These test the handler function signature. DynamoDB calls will fail."
    )
    print("  Full integration requires running seed_dynamodb.py first.\n")

    # Build a mock GradingReport and pre-save to DynamoDB path — skip handler for mock
    print("  Mock mode: testing individual routing functions (pure math, no AWS)")
    passed, prices = test_funcs()
    print_ring_table(359.40, 599.0, "footwear")
    test_routes(359.40, 599.0, "footwear")


def real_handler_tests():
    from route_evaluator.lambda_function import handler

    event = {
        "item_id": "PROD_001",
        "grading_report_id": "any",
        "original_price_inr": 599.0,
        "category": "footwear",
        "current_location": {
            "type": "customer",
            "hub_id": None,
            "lat": 19.1136,
            "lng": 72.8697,
            "distance_to_home_warehouse_km": 48.0,
        },
        "ring_index": 0,
    }

    result = handler(event)
    body = result.get("body", {})
    if isinstance(body, str):
        body = json.loads(body)
    print(json.dumps(body, indent=2, default=str))


if __name__ == "__main__":
    if "--mock" in sys.argv:
        mock_handler_tests()
    else:
        try:
            real_handler_tests()
            print("\n  Real test complete")
        except Exception as e:
            print(f"\n  Error: {e}")
            print("  (DynamoDB tables must be seeded first)")
