# ReRoute — Agent Context Handoff
### Amazon HackOn '26 · Theme 3: Products Without a Second Chance
*Generated: 13 June 2026. Read this before writing a single line of code.*

---

## 1. What this project is

**Amazon ReRoute** is an AI-powered returns marketplace for Amazon India. It intercepts
returned items mid-transit, grades them via Bedrock + Rekognition, calculates a
floating discount based on logistics savings, and lists them to nearby buyers. It also
supports C2C listings (ReList) with an AI-generated immutable Product Health Card.

**Submission deadline:** 15 June 23:59. Build window is effectively over. We are now
in **polish + deploy + demo-prep mode**.

The full product context is in `amazon_reroute_context_handoff.md`. All product
decisions are locked. Do not re-open them.

---

## 2. Exact file state right now

### Backend — `backend/` — COMPLETE (written, not yet running against live AWS)

| Path | What it does | Status |
|---|---|---|
| `app/main.py` | FastAPI app, CORS, router registration | ✅ Done |
| `app/core/config.py` | All constants: model IDs, thresholds, hub zones, costs | ✅ Done |
| `app/db/database.py` | SQLAlchemy sync engine + `get_db()` generator | ✅ Done |
| `app/db/models.py` | 7 ORM models with FK constraints | ✅ Done |
| `app/db/seed.py` | Reads `seed/*.json`, seeds PostgreSQL | ✅ Done |
| `app/schemas/schemas.py` | 8 Pydantic models + request/response schemas | ✅ Done |
| `app/services/grade_service.py` | Rekognition + Bedrock Nova Lite grading pipeline | ✅ Done |
| `app/services/routing_service.py` | Cascade auction, ring pricing, MVSP formula | ✅ Done |
| `app/services/health_card_service.py` | Claude 3.5 prose + QR code generation | ✅ Done |
| `app/api/routes/grade.py` | `POST /api/grade` | ✅ Done |
| `app/api/routes/routing.py` | `POST /api/evaluate-route` + `GET /api/deals` | ✅ Done |
| `app/api/routes/health_card.py` | `POST /api/health-card` | ✅ Done |
| `requirements.txt` | Pinned versions, including scipy/numpy | ✅ Done |
| `Dockerfile` | Python 3.11 slim, uvicorn CMD | ✅ Done |
| `apprunner.yaml` | App Runner source-based deploy config | ✅ Done |
| `conftest.py` (root) | Sets `DATABASE_URL=sqlite:///:memory:` before imports | ✅ Done |
| `pytest.ini` | Test discovery config | ✅ Done |
| `tests/conftest.py` | SQLite engine + seed fixtures | ✅ Done |
| `tests/test_grade_service.py` | 29 tests — grading logic, mocked boto3 | ✅ 29/29 pass |
| `tests/test_routing_service.py` | 27 tests — routing formulas, DB interactions | ✅ 27/27 pass |
| `tests/test_health_card_service.py` | 11 tests — QR generation, health card | ✅ 11/11 pass |
| `tests/test_api_routes.py` | FastAPI TestClient route tests | ✅ Written, not run yet |

**Total backend tests: 67 passing** (run with SQLite, no AWS needed).

### Frontend — `frontend/` — COMPLETE BUILD (builds clean, not connected to live API)

| Path | What it does | Status |
|---|---|---|
| `lib/types.ts` | TypeScript interfaces matching all Pydantic schemas | ✅ Done |
| `lib/api.ts` | `fetch()` wrappers: gradeProduct, evaluateRoute, getDeals, generateHealthCard | ✅ Done |
| `app/layout.tsx` | Amazon-dark nav bar, 3 links | ✅ Done |
| `app/globals.css` | Minimal Amazon-palette CSS | ✅ Done |
| `app/page.tsx` | Return Center (Priya flow: select product → upload → grade + route) | ✅ Done |
| `app/deals/page.tsx` | ReRoute Deals marketplace (hub filter, DealCard grid) | ✅ Done |
| `app/relist/page.tsx` | ReList C2C (Rahul flow: upload → grade → health card) | ✅ Done |
| `components/GradingCard.tsx` | Condition badge, defect list, confidence bar | ✅ Done |
| `components/RoutingResult.tsx` | Route badge, price/overhead/radius grid | ✅ Done |
| `components/DealCard.tsx` | Discount pill, hub, price, Buy Now | ✅ Done |
| `components/HealthCardView.tsx` | Nutrition-label card, QR placeholder | ✅ Done |
| `.env.local` | `NEXT_PUBLIC_API_URL=http://localhost:8000` | ✅ Done |
| `package.json` | ESLint removed (disk space), Next.js 14.2.35 | ✅ Done |

`npm run build` passes clean. `npm run dev` serves all 3 pages.

### Seed data — `seed/` — UNCHANGED

`products.json` (10 products), `trajectories.json` (3 trajectories × 4 checkpoints),
`personas.json` (Priya, Rahul, Ananya). Do not modify.

### Supporting docs
- `amazon_reroute_context_handoff.md` — full product context, all locked decisions
- `arch-plan.txt` — architecture v3, migration map, stack rationale
- `plan.md` — implementation units U1–U8, dependency graph
- `AWS_INTEGRATION_GUIDE.md` — **NEW** step-by-step AWS wiring guide
- `PROJECT_STATUS.md` — high-level status (slightly stale — frontend shows "Not started",
  but it is now done; update if you have time)

---

## 3. Known bugs that must be fixed before the demo runs

These are documented in `AWS_INTEGRATION_GUIDE.md` §10 and must be fixed before the
backend can make real API calls. They do not affect the 67 unit tests (which mock AWS).

### Bug 1 — Nova Lite body format (CRITICAL)
**File:** `backend/app/services/grade_service.py`, function `call_bedrock_vision`
**Problem:** The request body uses `anthropic_version: bedrock-2023-05-31` which is
Claude's format. Nova Lite requires a different structure without `anthropic_version`
and uses `inferenceConfig` instead of `max_tokens`.
**Fix:** Test with a real image. If you get `ValidationException`, change the body to:
```python
body = {
    "messages": [{
        "role": "user",
        "content": [
            {"image": {"format": "jpeg", "source": {"bytes": image_bytes}}},
            {"text": prompt}
        ]
    }],
    "inferenceConfig": {"maxTokens": 1024}
}
```
Note: Nova Lite accepts raw bytes (no base64), so remove the base64 encoding step too.

### Bug 2 — S3 client created in loop (minor but messy)
**File:** `backend/app/api/routes/grade.py`, inside `grade_product`
**Problem:** `boto3.client("s3", ...)` is created inside the `for img in images` loop.
**Fix:** Move to module level: `s3_client = boto3.client("s3", region_name=AWS_REGION)`
at the top of `grade.py`, remove the `import boto3` from inside the function.

### Bug 3 — `Item._new_uuid()` in seed.py (breaks seed script)
**File:** `backend/app/db/seed.py`, function `seed_trajectories`
**Problem:** `Item._new_uuid()` is called as if `_new_uuid` is a class method, but it's
a module-level function defined in `models.py`. This raises `AttributeError` at runtime.
**Fix:** Replace all occurrences with `str(uuid.uuid4())` (uuid is already imported in
models.py but needs to be imported in seed.py too).

### Bug 4 — QR code not returned in HealthCard response
**File:** `backend/app/schemas/schemas.py` (HealthCard model) and
`backend/app/services/health_card_service.py` (generate_health_card)
**Problem:** `generate_health_card` generates a QR code (`qr_b64`) but never puts it
in the returned `HealthCard` object. The frontend `HealthCardView` shows a placeholder
instead of the real QR.
**Fix:** Add `qr_code_base64: Optional[str] = None` to the `HealthCard` Pydantic schema.
Populate it in `generate_health_card`: `qr_code_base64=qr_b64`. Update the ORM model
`health_cards` table and the `db_card` instantiation in `health_card.py` route to store
it too (or just return it in the API response without storing, since it's derivable from
`card_url`).

### Bug 5 — `get_db()` used with `next()` instead of `Depends()`
**File:** `backend/app/api/routes/grade.py`, `routing.py`, `health_card.py`
**Problem:** All three route handlers call `db = next(get_db())`. This works but bypasses
FastAPI's dependency lifecycle — the session won't be properly closed if an exception
happens before the `finally` block.
**Fix:** Change each route function signature to use `db: Session = Depends(get_db)`.
Remove the manual `db = next(get_db())` and `db.close()` calls. FastAPI handles cleanup.

---

## 4. What needs to happen before the demo (in order)

### Step 1: Fix the 5 bugs above
None require AWS access. Do these first. The unit tests still pass after the fixes.

### Step 2: AWS setup (follow `AWS_INTEGRATION_GUIDE.md`)
1. IAM role with Bedrock + Rekognition + S3 permissions → 20 min
2. S3 buckets: `reroute-item-images`, `reroute-health-cards` → 10 min
3. Bedrock model access for Nova Lite + Claude 3.5 Sonnet (ap-south-1) → 10 min
4. RDS PostgreSQL t4g.micro (ap-south-1) → 20 min

### Step 3: Smoke test backend locally
```bash
# Set env vars
$env:DATABASE_URL = "postgresql://postgres:<pw>@<rds-endpoint>:5432/reroute"
$env:AWS_DEFAULT_REGION = "ap-south-1"
# (credentials in ~/.aws/credentials or via IAM role)

cd backend
python -m app.db.seed --reset        # seeds RDS
uvicorn app.main:app --reload        # starts on :8000

# Quick checks:
# GET http://localhost:8000/          → {"status": "ok"}
# GET http://localhost:8000/docs      → OpenAPI UI
# GET http://localhost:8000/api/deals → 3 seeded listings
```

### Step 4: Test grading endpoint with a real image
```bash
curl -X POST http://localhost:8000/api/grade \
  -F "images=@shoe.jpg" \
  -F "item_id=PROD_001" \
  -F "original_price_inr=599" \
  -F "category=footwear" \
  -F "product_name=Nike Shoes"
```
Expected: 200 with `condition_grade`, `confidence`, `defects`. If you get a
`ValidationException` from Bedrock, fix Bug 1 (Nova Lite body format).

### Step 5: Run frontend against live backend
```bash
cd frontend
# Edit .env.local: NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```
Navigate to localhost:3000. Try the Return Center flow end-to-end.

### Step 6: Deploy
- Backend: App Runner from GitHub (see `AWS_INTEGRATION_GUIDE.md` §6)
- Frontend: Amplify from GitHub (see `AWS_INTEGRATION_GUIDE.md` §7 — create `amplify.yml` first)
- Update `NEXT_PUBLIC_API_URL` in Amplify env vars to the App Runner URL

### Step 7: Demo prep
- Seed the deployed RDS with `python -m app.db.seed --reset`
- Record a backup video of the full 3-minute demo flow
- Rehearse the script in `amazon_reroute_context_handoff.md` §14

---

## 5. Disk space constraint (Windows dev machine)

C: drive has **0 bytes free**. D: has ~65 GB free.

- `npm install` must use `--cache D:\npm-cache` (`.npmrc` in `frontend/` already sets this)
- `pip install` must use `--no-cache-dir --target D:\py-pkgs` and
  `$env:PYTHONPATH="D:\py-pkgs;d:\hackon-new\amazonHackOn\backend"` must be set
- pytest must be run with the `PYTHONPATH` env var set (see test run commands below)

### Command to run tests
```powershell
cd d:\hackon-new\amazonHackOn\backend
$env:PYTHONPATH="D:\py-pkgs;d:\hackon-new\amazonHackOn\backend"
python -m pytest tests/ -v --tb=short
# Expected: 67 passed (test_api_routes.py adds more when you run it with a live DB)
```

### Command to start frontend dev server
```powershell
cd d:\hackon-new\amazonHackOn\frontend
npm run dev --cache D:\npm-cache
# Serves on http://localhost:3000
```

---

## 6. What NOT to do

- Do not re-open any product decision from `amazon_reroute_context_handoff.md`
- Do not change the seed JSON files
- Do not introduce new dependencies without checking disk space first
- Do not use Tailwind CSS (not installed, disk space concern)
- Do not use Cognito (hardcoded personas are fine for demo)
- Do not touch the business logic formulas in `routing_service.py`
- Do not run `alembic` (tables are created by `Base.metadata.create_all()` in seed.py)

---

## 7. The 3 personas (hardcoded, used as drop-downs in frontend)

| ID | Name | Role | Scenario |
|---|---|---|---|
| USER_PRIYA | Priya Sharma | Returner | Nike shoes ₹599, Return Center flow |
| USER_RAHUL | Rahul Mehta | C2C Seller | Baby monitor ₹2499, ReList flow |
| USER_BUYER | Ananya Patel | Buyer | Buys from ReRoute Deals |

---

## 8. API contract (quick reference)

```
POST /api/grade
  Form: images[] (files), item_id, product_name, category, original_price_inr
  Returns: {status, report: GradingReport}

POST /api/evaluate-route
  JSON: {item_id, original_price_inr, category, current_location: {hub_id, distance_to_home_warehouse_km}, ring_index}
  Returns: {status, result: RoutingResult}

POST /api/health-card
  JSON: {item_id, seller_id, seller_name, seller_city}
  Returns: {status, card: HealthCard}

GET /api/deals
  Query: hub_id (optional)
  Returns: {status, count, deals: DealItem[]}

GET /
  Returns: {status: "ok", service: "ReRoute API", version: "1.0.0"}
```

Full schema: visit `/docs` on a running backend instance (FastAPI auto-generates OpenAPI).
