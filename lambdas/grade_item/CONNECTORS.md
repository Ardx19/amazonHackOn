# CONNECTORS — grade_item/

## Status: COMPLETE ✅
## Owner: P1 (AI Pipeline)

## Receives (trigger inputs)
```json
{
  "item_id": "PROD_001",
  "s3_keys": ["images/prod_001_front.jpg"],
  "original_price_inr": 599.0,
  "category": "footwear",
  "product_name": "Nike Revolution 6 Running Shoes"
}
```

## Returns (output)
GradingReport Pydantic model (see shared/models.py) as dict, wrapped in:
```json
{
  "statusCode": 200,
  "body": { ...GradingReport fields... }
}
```

Key GradingReport fields:
- `condition_grade` — "Like New" | "Good" | "Fair" | "Poor"
- `defects` — list of Defect objects (defect_type, severity, location)
- `confidence` — 0.0–1.0
- `estimated_retail_inr` — Claude's estimate of original price
- `suggested_resale_band_inr` — [low, high] tuple
- `recommended_route` — PRELIMINARY route (route_evaluator recalculates with real MVSP)
- `rekognition_labels` — raw label strings from Rekognition (for debugging)

## Pipeline within this lambda
```
Stage 1: Rekognition DetectLabels → list[str] labels
Stage 2: Build grading prompt with metadata + labels
Stage 3: Bedrock Claude 3.5 Sonnet Vision → condition JSON
Stage 4: Parse Claude JSON (with markdown fence fallback)
Stage 5: Build GradingReport Pydantic model
Stage 6: Save to DynamoDB GradingReports table
Stage 7: Return GradingReport as dict
```

## Writes to DynamoDB
- Table: `ReRoute_GradingReports`
- PK: `item_id`, SK: `report_id`

## Downstream consumers
- **route_evaluator lambda**: reads `condition_grade`, `estimated_retail_inr`, `recommended_route` (preliminary)
- **health_card lambda**: reads `defects`, `condition_grade`, `brand_guess`, `confidence`, `product_category`

## IAM Permissions Required
```
rekognition:DetectLabels
bedrock:InvokeModel    (resource: arn:aws:bedrock:ap-south-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0)
s3:GetObject           (resource: arn:aws:s3:::reroute-item-images/*)
dynamodb:PutItem       (resource: arn:aws:dynamodb:ap-south-1:*:table/ReRoute_GradingReports)
```

## Testing
```bash
# Mock mode (no AWS, reads seed data):
python lambdas/grade_item/test_local.py --mock

# Real AWS calls (needs credentials + S3 bucket):
python lambdas/grade_item/test_local.py PROD_001
```

## Open ends
- [ ] S3 bucket `reroute-item-images` must exist with test images uploaded
- [ ] IAM role must have permissions listed above
- [ ] `recommended_route` field is PRELIMINARY — route_evaluator recalculates using real MVSP
- [ ] Multi-image grading (averaging across 2-3 photos) is FUTURE — currently only first image is graded
- [ ] Rekognition failure is non-fatal — returns empty list, Claude grades from image alone

## Hardcoded assumptions
- Images are JPEG or PNG (media_type detection from file extension)
- Mumbai region for all AWS calls (ap-south-1)
- Claude returns valid JSON every time (prompt enforces this; markdown fence fallback handles edge cases)
- Bedrock throttling retries once after 2 seconds
