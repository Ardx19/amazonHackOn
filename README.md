# ReRoute

AI-powered returns marketplace. Intercepts returned products mid-transit, grades them via AI, and routes them to the most profitable destination using a cascade auction model.

**Amazon HackOn 2026** — Theme 3: "Products Without a Second Chance"

---

## What's Built

### Foundation Layer (`lambdas/shared/`)

| File | Purpose |
|---|---|
| `config.py` | All constants: 7 DynamoDB table names, AWS region, Bedrock model IDs, condition grades/multipliers, 6 route paths, routing thresholds (7% overhead, 85% confidence gate), 6-ring price floors (0.88→1.00), 4 Mumbai hub zones with coordinates, delivery costs per km by category |
| `models.py` | 8 Pydantic v2 models: `ItemPhoto`, `Defect`, `GradingReport`, `HubCheckpoint`, `FloatingDiscount`, `HealthCard`, `Transaction`, `Persona` |
| `db.py` | 6 DynamoDB CRUD functions: `put_item`, `get_item`, `query_by_pk`, `update_item_field`, `delete_item`, `scan_table`. Auto-serializes datetime to ISO |
| `CONNECTORS.md` | Exported constants, models, and DB functions reference |

### AI Grading Pipeline (`lambdas/grade_item/`)

Two-stage pipeline: Rekognition DetectLabels → Bedrock Claude 3.5 Sonnet Vision → `GradingReport` saved to DynamoDB.

| File | Purpose |
|---|---|
| `lambda_function.py` | 6 functions: `run_rekognition` (non-fatal, returns `[]` on failure), `build_grading_prompt`, `call_bedrock_vision` (base64 image, retries on throttle), `extract_json_from_response` (regex fallback for markdown fences), `determine_route` (preliminary: Poor→recycle, Like New+≥₹2000→amazon_renewed, Good→reroute_deals, Fair→relist), `handler` (orchestrator) |
| `test_local.py` | `--mock` mode returns a hardcoded GradingReport; real mode calls AWS |
| `requirements.txt` | boto3, pillow, pydantic |

### Routing Engine (`lambdas/route_evaluator/`)

5-ring cascade auction model. The core intelligence of the system.

| File | Purpose |
|---|---|
| `lambda_function.py` | 8 functions: `load_grading_report`, `compute_full_return_cost`, `should_enter_reroute` (overhead ≥7% AND confidence ≥85% gate), `compute_profitable_radius`, `compute_ring_price`, `create_floating_discount_listing`, `advance_to_next_ring` (update listing when item moves between hubs), `handler` (orchestrator with fast exits for Poor→recycle, Like New+high→amazon_renewed, gate→standard_return, radius=0→donate) |
| `test_local.py` | 7 pure-math tests (all pass). Prints ring progression table |
| `requirements.txt` | boto3, pydantic |

**Ring progression example** — Priya's Nike shoes (₹599, Good condition, 48km from warehouse):

```
Ring 0 (Customer Origin):  ₹316.27  |  50.0km radius  |  47.2% discount
Ring 1 (Hub #1):           ₹327.05  |  50.0km radius  |  45.4% discount
Ring 2 (Hub #2):           ₹334.24  |  50.0km radius  |  44.2% discount
Ring 3 (Hub #3):           ₹341.43  |  50.0km radius  |  43.0% discount
Ring 4 (Hub #4):           ₹348.62  |  50.0km radius  |  41.8% discount
Home Warehouse:            ₹359.40  |  Amazon Renewed  |  40.0% discount
```

**Decision flow**:
1. Poor condition → `recycle`
2. Like New + ≥₹2000 → `amazon_renewed`
3. Overhead ratio <7% OR confidence <85% → `standard_return`
4. Profitable radius ≤0 → `donate`
5. Otherwise → `reroute_deals` (enter cascade, create listing)

**Core formulas**:
```
graded_value   = CONDITION_MULTIPLIER × original_price
full_return_cost = cost_per_km × distance_to_warehouse
overhead_ratio   = full_return_cost / graded_value
profitable_radius = (graded_value × 0.99 - operating_charge) / cost_per_km
sale_price = max(delivery_cost + operating_charge + margin, graded_value × ring_floor)
```

### Seed Data (`seed/`)

| File | Contents |
|---|---|
| `products.json` | 10 demo products (₹299–₹8999) across footwear, electronics, clothing, home goods, baby products. 3 trajectory products tagged for demo story |
| `trajectories.json` | 3 return routes × 4 checkpoints each (MUM_H1→H2→H3→W) with decreasing C_remaining |
| `personas.json` | Priya (returner), Rahul (C2C seller), Ananya (buyer). Fake address/payment hashes for abuse rule testing |
| `seed_dynamodb.py` | Creates all 7 DynamoDB tables (PAY_PER_REQUEST), seeds all data. Idempotent, supports `--reset` |

### Project Docs

| File | Purpose |
|---|---|
| `PROJECT_STATUS.md` | File-by-file status + what each teammate should build |
| `FUTURE_IDEAS.md` | Out-of-scope ideas surfaced during build |
| `CONNECTORS.md` (per lambda) | Input/output shapes, IAM permissions, downstream consumers, open ends |

---

## Infrastructure

- **Region**: ap-south-1 (Mumbai)
- **AI**: Bedrock `anthropic.claude-3-5-sonnet-20241022-v2:0` (grading), `amazon.nova-lite-v1:0` (pricing — unused)
- **Vision**: Rekognition `DetectLabels` (feature extraction, non-fatal)
- **Database**: 7 DynamoDB tables, all prefixed `ReRoute_`, PAY_PER_REQUEST billing
- **Storage**: S3 buckets `reroute-item-images`, `reroute-health-cards`

### DynamoDB Tables

| Table | PK | SK |
|---|---|---|
| ReRoute_Items | item_id | — |
| ReRoute_GradingReports | item_id | report_id |
| ReRoute_FloatingDiscounts | listing_id | item_id |
| ReRoute_HubCheckpoints | item_id | checkpoint_id |
| ReRoute_HealthCards | card_uuid | — |
| ReRoute_Transactions | transaction_id | — |
| ReRoute_AbuseFlags | account_id | rule_triggered |

---

## What's Not Built

| Component | Description |
|---|---|
| `lambdas/health_card/` | Health Card generator + QR code. Consumes GradingReport + FloatingDiscount listing_id |
| `app.py` | Streamlit frontend — 3 tabs (Return Center, ReRoute Deals marketplace, ReList C2C) with Plotly price trajectory chart |
| `requirements.txt` | Top-level Python dependencies |
| `.streamlit/config.toml` | Custom Streamlit theme |

---

## Key Numbers

| Metric | Value |
|---|---|
| Files written | 18 (excluding .git) |
| Python lines | ~1,300 |
| Pydantic models | 8 |
| Lambda functions | 2 of 4 built (grade_item, route_evaluator) |
| DynamoDB tables | 7 (schemas defined) |
| Demo products | 10 |
| Demo personas | 3 |
| Test coverage | 8 tests (1 mock grading, 7 routing math) |
| Ring price range (Priya's shoes) | ₹316 → ₹359 |
| Condition multipliers | Like New=0.95, Good=0.60, Fair=0.35, Poor=0.15 |
| Route paths | amazon_renewed, reroute_deals, relist, donate, recycle, standard_return |
