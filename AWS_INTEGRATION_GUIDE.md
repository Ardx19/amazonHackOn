# AWS Integration Guide — ReRoute v3

> **Purpose**: This document explains every place where AWS services plug into the existing
> codebase, what's already wired up, what's stubbed/hardcoded, and the exact steps to make
> each integration production-ready. No code changes are made here — this is a decision and
> method document only.
>
> **Current state**: The code uses real boto3 calls but relies on ambient AWS credentials
> (whatever is in `~/.aws/credentials`). All bucket names, model IDs, and region are
> hardcoded in `backend/app/core/config.py`. No auth, no rate limiting, no secrets manager.

---

## 1. IAM — The Non-Negotiable First Step

Every AWS call the backend makes requires an IAM identity. Nothing else works until this
is right.

### What the backend calls today

| Service | API call | Location in code |
|---|---|---|
| Bedrock Runtime | `invoke_model` | `grade_service.py`, `health_card_service.py` |
| Rekognition | `detect_labels`, `detect_moderation_labels` | `grade_service.py` |
| S3 | `put_object`, `get_object` | `grade_service.py` (route handler) |

### Method: Create a scoped IAM role

1. Go to IAM → Roles → Create Role.
2. Trusted entity: **AWS service → App Runner** (for deployed backend) or
   **EC2** (for local dev with instance profile).
3. Attach an **inline policy** with minimum required permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": [
        "arn:aws:bedrock:ap-south-1::foundation-model/amazon.nova-lite-v1:0",
        "arn:aws:bedrock:ap-south-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["rekognition:DetectLabels", "rekognition:DetectModerationLabels"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": [
        "arn:aws:s3:::reroute-item-images/*",
        "arn:aws:s3:::reroute-health-cards/*"
      ]
    }
  ]
}
```

4. For local dev: run `aws configure` and set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
   `AWS_DEFAULT_REGION=ap-south-1` — OR attach the role to an EC2 instance.
5. For App Runner: attach the role as the **Instance role** in the App Runner service
   configuration. boto3 picks this up automatically — no env vars needed.

**Code change needed**: None. boto3 auto-discovers credentials in this order:
env vars → `~/.aws/credentials` → IAM instance profile. The existing code already works.

---

## 2. Amazon S3 — Product Images + Health Card Assets

### What exists
`grade.py` route handler creates a boto3 S3 client inside the per-image loop and calls
`put_object`. `grade_service.py` reads the image back with `get_object` before calling
Bedrock. Bucket names are in `config.py` as `S3_BUCKET_IMAGES` and `S3_BUCKET_HEALTH_CARDS`.

### What's missing / wrong
- The S3 client is created inside the upload loop (per-image, per-request). It should be
  a module-level singleton like `rekognition_client` and `bedrock_client`.
- No pre-signed URL flow. Currently the backend downloads the image to RAM before sending
  it to Bedrock. This is fine for demo but wastes memory for large images.
- No bucket lifecycle rules. Images accumulate forever.

### Method to fix S3 properly (3 steps, not urgent for demo)

**Step 1** — Move S3 client to module level in `grade.py`:
```python
# At the top of grade.py, alongside other module-level boto3 clients
s3_client = boto3.client("s3", region_name=AWS_REGION)
```
Then remove the `import boto3` and client creation from inside the loop.

**Step 2** — Pre-signed upload URLs (PRD feature, skip for demo):
Instead of the backend receiving the binary file, generate a pre-signed PUT URL and
return it to the frontend. The frontend uploads directly to S3. Then the backend only
receives the `s3_key`. This removes multipart form handling from the API entirely and
is the correct production pattern.
```
Frontend → POST /api/grade/presign → {presigned_url, s3_key}
Frontend → PUT presigned_url (file directly to S3)
Frontend → POST /api/grade {s3_key} → GradingReport
```

**Step 3** — Bucket setup:
```bash
aws s3 mb s3://reroute-item-images --region ap-south-1
aws s3 mb s3://reroute-health-cards --region ap-south-1
# Set lifecycle to expire images after 90 days
aws s3api put-bucket-lifecycle-configuration \
  --bucket reroute-item-images \
  --lifecycle-configuration file://s3-lifecycle.json
```

---

## 3. Amazon Bedrock — Nova Lite (Grading) + Claude 3.5 (Health Cards)

### What exists
Both services have their model IDs in `config.py`. `grade_service.py` calls
`bedrock_client.invoke_model` synchronously. A single retry-on-throttle is implemented.
The response body is parsed as Anthropic's messages format
(`response_body["content"][0]["text"]`).

### What's missing
- Model access must be **explicitly enabled** per model per region in the Bedrock console.
  If not enabled, you get a `ValidationException` that looks like a model error.
- No response streaming. The call blocks until the full JSON is returned (~1-3s).
- No fallback if Nova Lite returns malformed JSON (beyond the regex extraction).

### Method to enable Bedrock models

1. AWS Console → Bedrock → Model access → Request access for:
   - `amazon.nova-lite-v1:0` (ap-south-1)
   - `anthropic.claude-3-5-sonnet-20241022-v2:0` (ap-south-1)
   - Access is usually instant for Nova Lite; Claude may take a few minutes.

2. Verify with CLI:
```bash
aws bedrock list-foundation-models \
  --by-output-modality TEXT \
  --region ap-south-1 \
  --query 'modelSummaries[?contains(modelId, `nova-lite`)].modelId'
```

3. Test a raw call:
```bash
aws bedrock-runtime invoke-model \
  --model-id amazon.nova-lite-v1:0 \
  --body '{"messages":[{"role":"user","content":[{"type":"text","text":"Say ok"}]}],"max_tokens":10}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/response.json --region ap-south-1
cat /tmp/response.json
```

### Method to add streaming (optional, improves perceived latency)
Replace `invoke_model` with `invoke_model_with_response_stream`. The frontend gets
partial JSON tokens via SSE as Bedrock streams them. This requires changing the
FastAPI route to return a `StreamingResponse`. Not needed for demo — the
`extract_json_from_response` fallback handles the full response cleanly.

### Important: Nova Lite uses a different message format from Claude
The current prompt uses `anthropic_version: bedrock-2023-05-31` — this is correct for
Claude but **Nova Lite uses a different body structure** (no `anthropic_version` field,
uses `inferenceConfig` instead of `max_tokens`). The existing code may get a
`ValidationException` when calling Nova Lite with the Claude format.

**Verify and fix before demo**: Test `call_bedrock_vision` with a real image and inspect
the error. If you get a `ValidationException`, change the body format in `grade_service.py`
to Nova's native format:
```python
body = {
    "messages": [
        {
            "role": "user",
            "content": [
                {"image": {"format": "jpeg", "source": {"bytes": image_bytes}}},
                {"text": prompt}
            ]
        }
    ],
    "inferenceConfig": {"maxTokens": 1024}
}
```
Nova Lite accepts raw bytes inline (no base64 needed), which also removes the base64
encoding step.

---

## 4. Amazon Rekognition — Label Pre-warming

### What exists
`run_rekognition` in `grade_service.py` calls `detect_labels` with the S3 object key.
It's called before Bedrock and its result is injected into the grading prompt.
Failures are silently swallowed (returns `[]`) — this is correct, it's non-fatal.

### What's missing
The architecture doc specifies `DetectModerationLabels` as a safety gate (PII/unsafe
content check). The current `grade_service.py` only calls `detect_labels`.

### Method to add moderation check (15 min of work)
In `grade_service.py`, add a parallel call after uploading to S3:
```python
def check_moderation(s3_key: str) -> bool:
    """Returns True if content is safe to list."""
    try:
        resp = rekognition_client.detect_moderation_labels(
            Image={"S3Object": {"Bucket": S3_BUCKET_IMAGES, "Name": s3_key}},
            MinConfidence=75,
        )
        # Block if any top-level unsafe category detected
        blocked = {"Explicit Nudity", "Violence", "Visually Disturbing"}
        return not any(
            label["Name"] in blocked
            for label in resp.get("ModerationLabels", [])
        )
    except Exception:
        return True  # non-fatal: allow if check fails
```
Call this in `grade_item` after uploading. If it returns False, raise an HTTPException
400 before calling Bedrock.

Rekognition is in the free tier (1000 images/month) — no cost concern for hackathon.

---

## 5. Amazon RDS (PostgreSQL) — Database

### What exists
`database.py` uses `DATABASE_URL` from env (defaults to `localhost:5432`). The seed
script uses `Base.metadata.create_all()` — no Alembic migrations are actually run
despite the architecture doc mentioning them.

### Method to provision RDS for demo

1. AWS Console → RDS → Create database → PostgreSQL 15 → Free tier (db.t4g.micro).
2. Settings:
   - DB name: `reroute`
   - Username: `postgres`
   - Password: generate a strong one
   - Public access: Yes (for demo dev access — disable for prod)
   - VPC security group: allow inbound 5432 from your IP and from App Runner's IP range
3. Set env var in App Runner:
   ```
   DATABASE_URL=postgresql://postgres:<password>@<rds-endpoint>:5432/reroute
   ```
4. Run seed once: `python -m app.db.seed --reset`
5. Verify: `psql $DATABASE_URL -c "SELECT count(*) FROM items;"`

### Connection pooling (important for App Runner)
App Runner can run multiple instances. Each instance creates its own SQLAlchemy engine
with the default pool. With the current sync engine and no pool limits, you can exhaust
RDS connections under load. For demo scale (low traffic) this is fine. For production,
add pool settings to `create_engine`:
```python
engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_pre_ping=True,  # detect stale connections
)
```

---

## 6. AWS App Runner — Backend Deployment

### What exists
`apprunner.yaml` and `Dockerfile` are both present and correct. The `Dockerfile` does
`COPY . .` and runs `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

### Method to deploy

**Option A — Source-based (preferred for hackathon)**:
1. Push repo to GitHub.
2. App Runner console → Create service → Source: GitHub repository.
3. Branch: main, Build command: `pip install -r requirements.txt`.
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
5. Port: 8000.
6. Add environment variables: `DATABASE_URL`, `AWS_REGION=ap-south-1`.
7. Attach the IAM role created in step 1.
8. Deploy.

**Option B — Docker-based**:
1. `docker build -t reroute-backend .` in `backend/`.
2. Push to ECR: `aws ecr create-repository --repository-name reroute-backend`
3. App Runner → Create service → Source: ECR image.

After deploy, the App Runner URL becomes `NEXT_PUBLIC_API_URL` in the frontend's
`.env.local` (or Amplify environment variables).

### Health check
App Runner will call `GET /` every 20s. The route exists and returns 200 — no change
needed.

---

## 7. AWS Amplify — Frontend Deployment

### What exists
`frontend/amplify.yml` does not exist yet (was mentioned in the plan but not created).
The frontend builds with `npm run build` and outputs to `.next/`.

### Method to deploy

1. Push the `frontend/` directory to GitHub (same repo, different subdirectory).
2. Amplify console → New app → Host web app → GitHub.
3. Root directory: `frontend`.
4. Build settings (Amplify auto-detects Next.js, but verify):
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm install --cache /tmp/npm-cache
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - "**/*"
     cache:
       paths:
         - node_modules/**/*
   ```
5. Environment variables in Amplify console:
   ```
   NEXT_PUBLIC_API_URL = https://<app-runner-url>
   ```
6. Deploy. Amplify gives you an `amplifyapp.com` URL.

Create `frontend/amplify.yml` with the content above before pushing.

---

## 8. Amazon SES — Email Notifications (optional, low priority)

### What's planned
Architecture doc mentions SES for buyer notifications (purchase confirmed, shipping
update). Not implemented yet.

### Method (add when time permits)
1. SES console → Verify a sender email address (or domain).
2. Add to IAM policy: `"ses:SendEmail"` on `"arn:aws:ses:ap-south-1:<account>:identity/*"`.
3. In `routing_service.py`, after a successful `create_floating_discount_listing`, call:
```python
ses = boto3.client("ses", region_name=AWS_REGION)
ses.send_email(
    Source="noreply@reroute.demo",
    Destination={"ToAddresses": [buyer_email]},
    Message={
        "Subject": {"Data": f"Your ReRoute Deal is live — {product_name}"},
        "Body": {"Text": {"Data": f"Buy at ₹{sale_price:.0f} before it rises."}}
    }
)
```
4. SES is free tier (62,000 emails/month when sending from EC2/App Runner).

---

## 9. EventBridge + Lambda Cron — Ring Progression

### What exists
`lambdas/cron/advance_rings.py` is a valid Lambda handler. It imports from
`backend/app/` using a `sys.path` hack. It's not deployed yet.

### Method to deploy the cron Lambda

1. Package it: the Lambda needs `backend/app/` in the zip.
   ```bash
   cd d:\hackon-new\amazonHackOn
   # Create a zip with the lambda + backend app
   mkdir lambda-pkg
   cp lambdas/cron/advance_rings.py lambda-pkg/lambda_function.py
   cp -r backend/app lambda-pkg/app
   pip install sqlalchemy psycopg2-binary boto3 -t lambda-pkg/
   cd lambda-pkg && zip -r ../reroute-cron.zip .
   ```
2. Lambda console → Create function → Python 3.11 → Upload zip.
3. Handler: `lambda_function.handler`.
4. Add env var: `DATABASE_URL=postgresql://...`.
5. Execution role: attach the same IAM role (needs RDS access from Lambda VPC or via
   public endpoint).
6. EventBridge console → Create rule → Schedule: `rate(24 hours)`.
7. Target: the Lambda function.

**Simpler alternative for demo**: Just call it manually from the App Runner instance
via a protected `POST /api/admin/advance-rings` endpoint. Skip EventBridge entirely
for the demo — ring progression is a nice-to-have, not core flow.

---

## 10. AWS Secrets Manager — Credentials (skip for hackathon)

For the hackathon, env vars in App Runner and Amplify are fine. For production:

1. Secrets Manager → Create secret → `reroute/prod/db` → `{"url": "postgresql://..."}`
2. Add to IAM policy: `"secretsmanager:GetSecretValue"` on the secret ARN.
3. In `config.py`, replace the `os.getenv("DATABASE_URL")` call:
```python
import boto3, json

def _get_db_url() -> str:
    if secret_arn := os.getenv("DB_SECRET_ARN"):
        client = boto3.client("secretsmanager", region_name=AWS_REGION)
        secret = json.loads(client.get_secret_value(SecretId=secret_arn)["SecretString"])
        return secret["url"]
    return os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/reroute")

DATABASE_URL = _get_db_url()
```

---

## Priority order for hackathon (48h window)

| Priority | Step | Time estimate | Blocks |
|---|---|---|---|
| 1 | IAM role + credentials configured | 20 min | Everything |
| 2 | S3 buckets created + accessible | 10 min | `/api/grade` |
| 3 | Bedrock model access enabled | 10 min | `/api/grade`, `/api/health-card` |
| 4 | **Verify Nova Lite body format** | 30 min | All grading |
| 5 | RDS instance + DATABASE_URL set | 20 min | All DB writes |
| 6 | Seed script run against RDS | 5 min | `/api/deals` |
| 7 | App Runner deployment | 30 min | Frontend integration |
| 8 | Amplify deployment | 20 min | Demo |
| 9 | SES, EventBridge, Secrets Manager | Skip | PRD roadmap |

---

## Known code issues to fix before going live (not AWS-specific)

1. **S3 client created inside loop** in `grade.py` — move to module level (2 lines).
2. **Nova Lite body format** — the current prompt uses `anthropic_version` which is
   Claude-specific. Test with a real image and fix the format if it fails (see §3 above).
3. **`Item._new_uuid()` call** in `seed.py` — `_new_uuid` is a module-level function,
   not a class method; `Item._new_uuid()` will raise `AttributeError`. Replace with
   `str(uuid.uuid4())` directly (already imported).
4. **`get_db()` yielded in routes without `Depends()`** — `next(get_db())` works but
   bypasses FastAPI's dependency injection lifecycle. Sessions won't be closed on
   exceptions in some edge cases. Change to `Depends(get_db)` on route functions.
5. **No `qr_code_base64` in HealthCard schema** — `generate_health_card` generates a
   QR code but never puts it in the returned `HealthCard` Pydantic object. The frontend
   receives `card_url` but no QR image. Add `qr_code_base64: str` to the `HealthCard`
   schema and populate it in `generate_health_card`.
