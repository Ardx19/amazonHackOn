# CONNECTORS — route_evaluator/

## Status: COMPLETE ✅
## Owner: P2

## Receives (inputs)
```json
{
  "item_id": "PROD_001",
  "original_price_inr": 599.0,
  "category": "footwear",
  "current_location": {
    "type": "customer",
    "hub_id": null,
    "lat": 19.1136,
    "lng": 72.8697,
    "distance_to_home_warehouse_km": 48.0
  },
  "ring_index": 0
}
```

## Returns (output)
```json
{
  "statusCode": 200,
  "body": {
    "item_id": "PROD_001",
    "final_route": "reroute_deals",
    "ring_index": 0,
    "sale_price_inr": 316.27,
    "profitable_radius_km": 50.0,
    "listing_id": "uuid",
    "routing_reason": "Ring 0 — ₹316 within 50.0km. Overhead: 33.4%",
    "mvsp_inr": 239.40,
    "overhead_ratio": 0.334,
    "entered_reroute": true
  }
}
```

## Possible final_route values
| Route | When |
|---|---|
| `recycle` | Poor condition — fast exit before cascade |
| `amazon_renewed` | Like New + price ≥ ₹2000 — fast exit before cascade |
| `standard_return` | Overhead < 7% OR confidence < 85% — skip ReRoute |
| `reroute_deals` | Entered cascade, profitable radius > 0 |
| `donate` | Entered cascade but radius = 0 — cannot sell profitably |

## Reads from DynamoDB
- `ReRoute_GradingReports` — PK: `item_id`

## Writes to DynamoDB
- `ReRoute_FloatingDiscounts` — PK: `listing_id`, SK: `item_id`

## Key formulas
```
graded_value   = CONDITION_MULTIPLIERS[grade] × original_price
full_return_cost = DELIVERY_COST_PER_KM[category] × distance_to_home_km
overhead_ratio   = full_return_cost / graded_value

Enter ReRoute if: overhead_ratio ≥ 7% AND confidence ≥ 85%

profitable_radius = (graded_value × 0.99 - operating_charge) / cost_per_km
  capped at MAX_RADIUS_KM (50km)

sale_price = max(
  delivery_cost + operating_charge + (graded_value × 0.01),   # MVSP for ring
  graded_value × ring_price_floor                              # price floor
)

Ring price floors: 0.88 → 0.91 → 0.93 → 0.95 → 0.97 → 1.00
  +0.02 per ring beyond ring 5
```

## Functions
- `load_grading_report(item_id)` — fetch + validate GradingReport from DynamoDB
- `compute_full_return_cost(category, distance_km)` — simple multiplication
- `should_enter_reroute(graded_value, full_return_cost, confidence)` — gate check
- `compute_profitable_radius(graded_value, operating_charge, category)` — max distance math
- `compute_ring_price(graded_value, ring_index, d_buyer_km, category)` — price at this ring
- `create_floating_discount_listing(...)` — build + save FloatingDiscount to DynamoDB
- `advance_to_next_ring(item_id, listing_id, next_hub_id, ...)` — update listing for next ring
- `handler(event)` — orchestrator

## Downstream consumers
- **health_card lambda**: reads `listing_id` + `item_id` from FloatingDiscounts to generate Health Card
- **app.py (Streamlit)**: queries FloatingDiscounts table to render marketplace Tab 1 (ReRoute Deals) + Tab 2 (ReList C2C)

## Testing
```bash
python lambdas/route_evaluator/test_local.py --mock    # 7 pure-math tests
```

## IAM permissions
```
dynamodb:GetItem        (ReRoute_GradingReports)
dynamodb:PutItem        (ReRoute_FloatingDiscounts)
dynamodb:Query          (ReRoute_FloatingDiscounts)
dynamodb:UpdateItem     (ReRoute_FloatingDiscounts — advance_to_next_ring)
```

## Open ends
- [ ] advance_to_next_ring() uses query_by_pk + update_item_field — composite key (item_id, listing_id) limits DynamoDB update to single PK. Production should use a GSI on listing_id or a direct put.
- [ ] d_buyer_km defaults to radius/2 (midpoint). Production uses real buyer GPS at purchase time.
- [ ] Ring price floors are hardcoded. Production derives from real delivery cost data.
- [ ] TTL-based expiry (24h Ring 0, 48h Ring 1+) is manual via expires_at. DynamoDB TTL attribute should be enabled.
