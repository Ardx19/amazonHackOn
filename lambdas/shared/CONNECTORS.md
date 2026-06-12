# CONNECTORS — shared/

## What this layer provides
Foundation for every lambda and the Streamlit app. Central config constants (AWS, DynamoDB tables, hub zones, business rules), canonical Pydantic data models for all data shapes in the system, and thin DynamoDB CRUD helpers. Everything in the project imports from here. If a constant, model, or table name isn't defined here, it doesn't exist.

## config.py — exports
- `TABLE_ITEMS`, `TABLE_GRADING_REPORTS`, `TABLE_FLOATING_DISCOUNTS`, `TABLE_HUB_CHECKPOINTS`, `TABLE_HEALTH_CARDS`, `TABLE_TRANSACTIONS`, `TABLE_ABUSE_FLAGS` — DynamoDB table name constants
- `AWS_REGION` — `"ap-south-1"` (Mumbai)
- `BEDROCK_MODEL_GRADING` — `"anthropic.claude-3-5-sonnet-20241022-v2:0"`
- `BEDROCK_MODEL_PRICING` — `"amazon.nova-lite-v1:0"`
- `REKOGNITION_MAX_LABELS` — 20
- `REKOGNITION_MIN_CONFIDENCE` — 70
- `CONDITION_GRADES` — `["Like New", "Good", "Fair", "Poor"]`
- `CONDITION_MULTIPLIERS` — `{"Like New": 0.85, "Good": 0.60, "Fair": 0.35, "Poor": 0.15}`
- `ROUTE_PATHS` — `["amazon_renewed", "reroute_deals", "relist", "donate", "recycle"]`
- `RENEWED_MIN_VALUE` — 2000 (₹)
- `DONATE_MAX_MVSP` — 0
- `RECYCLE_CONDITION` — `"Poor"`
- `HUB_ZONES` — dict of 4 Mumbai hubs with name, city, lat, lng
- `DELIVERY_COST_PER_KM` — ₹/km by category (footwear, electronics, clothing, home_goods, baby_products, default)
- `INITIAL_RADIUS_KM` — 15, `RADIUS_EXPANSION_KM` — 10, `MAX_RADIUS_KM` — 50
- `AMAZON_FEE_PCT` — 0.05
- `S3_BUCKET_IMAGES` — `"reroute-item-images"`
- `S3_BUCKET_HEALTH_CARDS` — `"reroute-health-cards"`

## models.py — exports
- `ItemPhoto` — individual product image reference. Used by: grade_item lambda (image handling)
- `Defect` — condition defect (type, severity, location). Used by: GradingReport, HealthCard
- `GradingReport` — full AI grading output. Central output of grade_item lambda. Used by: route_evaluator, health_card, app.py (display)
- `HubCheckpoint` — product position at a hub along its return journey. Used by: route_evaluator (MVSP calc), app.py (price trajectory)
- `FloatingDiscount` — dynamic listing with location-based price. Central to route_evaluator and Tab 1 display. Used by: route_evaluator, app.py
- `HealthCard` — immutable AI-generated condition card with QR. Central output of health_card lambda. Used by: health_card, app.py (Tab 2)
- `Transaction` — purchase record. Used by: app.py (buy flow), future payment integration
- `Persona` — hardcoded demo user. Used by: seed_dynamodb.py, app.py (user context)
- `generate_card_uuid(city_code)` — helper: generates `HC-2026-{city}-{HEX}` format card IDs

## db.py — exports
- `get_table(table_name: str)` — returns boto3 DynamoDB Table resource
- `put_item(table_name: str, item_dict: dict) -> bool` — inserts/replaces item. Auto-converts datetime to ISO.
- `get_item(table_name: str, pk_name: str, pk_value: str) -> dict | None` — single item lookup by partition key
- `query_by_pk(table_name: str, pk_name: str, pk_value: str) -> list[dict]` — all items matching partition key
- `update_item_field(table_name: str, pk_name: str, pk_value: str, field_name: str, new_value) -> bool` — single field update
- `delete_item(table_name: str, pk_name: str, pk_value: str) -> bool` — hard delete (seed reset only)
- `scan_table(table_name: str) -> list[dict]` — full table scan (demo volumes only, has pagination)

## Open ends (things a future file must provide)
- [ ] DynamoDB tables must be created before seed_dynamodb.py runs. Run `python seed/seed_dynamodb.py` first.
- [ ] S3 buckets must exist before grade_item uploads images: `reroute-item-images`, `reroute-health-cards`
- [ ] AWS credentials / IAM role must have: dynamodb:PutItem, dynamodb:GetItem, dynamodb:Query, dynamodb:Scan, dynamodb:UpdateItem, dynamodb:DeleteItem, dynamodb:CreateTable, rekognition:DetectLabels, bedrock:InvokeModel, s3:PutObject, s3:GetObject

## Assumptions baked in
- AWS region is `ap-south-1` (Mumbai). Change `AWS_REGION` in config.py for other regions.
- Hub zones are hardcoded for Mumbai demo (4 hubs). Production would read from DynamoDB or a location service.
- Delivery cost per km values are rough estimates. Production would use actual Amazon logistics rates.
- Condition multipliers are fixed. Production might use market-driven dynamic pricing.
- DynamoDB uses PAY_PER_REQUEST billing (no provisioned throughput).
- All table names are prefixed with `ReRoute_`. Change in config.py if deploying to shared AWS account.
- `generate_card_uuid` defaults to `MUM` city code. Change in production based on actual return hub city.
