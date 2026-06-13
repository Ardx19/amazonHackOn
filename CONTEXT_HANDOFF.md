# ReRoute — Agent Context Handoff (Updated)
### Amazon HackOn '26 · Theme 3: Products Without a Second Chance
*Updated: 13 June 2026 — post AWS wiring + first successful end-to-end grade*

---

## 1. Current State Summary

**We are fully operational.** The end-to-end demo flow works:
- Upload image → Nova Lite grades it → routing formula runs → listing appears on Deals page
- Tested live with a real Nike shoe image. Got: Good / 85% confident / scuff on toe / ₹316 sale price / listed on Deals

**What's done vs what remains:**

| Area | Status |
|---|---|
| Backend code (all routes, services, models) | ✅ Complete |
| All 5 known bugs fixed | ✅ Fixed |
| 67 unit tests passing | ✅ Green |
| AWS credentials configured locally | ✅ Done |
| S3 buckets created | ✅ Done |
| Bedrock Nova Lite (grading) | ✅ Live, verified |
| Bedrock Claude 3.5 Sonnet (health card) | ✅ Live, verified |
| Amazon Rekognition | ✅ Live, verified |
| RDS PostgreSQL 15.13 | ✅ Live, seeded |
| Frontend builds clean | ✅ Done |
| Return Center flow (Priya) | ✅ Working end-to-end |
| Deals page showing seeded listings | ✅ Working |
| ReList flow (Rahul) + Health Card | ⚠️ Built, not yet tested live |
| `/card/[uuid]` dynamic Health Card page | ❌ Not built yet |
| `amplify.yml` for frontend deploy | ❌ Not created yet |
| Backend deploy to App Runner | ❌ Not deployed yet |
| Frontend deploy to Amplify | ❌ Not deployed yet |
| Demo video | ❌ Not recorded |

---

## 2. AWS Resources (do not re-provision)

| Resource | Value |
|---|---|
| AWS Account ID | 720800607906 |
| Region | ap-south-1 |
| IAM User | `reroute-backend` |
| Credentials location | `C:\Users\Divyansh\.aws\credentials` (default profile) |
| S3 images bucket | `reroute-item-images-720800607906` |
| S3 health cards bucket | `reroute-health-cards-720800607906` |
| Bedrock grading model | `apac.amazon.nova-lite-v1:0` |
| Bedrock health card model | `apac.anthropic.claude-3-5-sonnet-20241022-v2:0` |
| RDS identifier | `reroute-db` |
| RDS endpoint | `reroute-db.cbqqm40c6trt.ap-south-1.rds.amazonaws.com` |
| RDS port | 5432 |
| RDS DB name | `reroute` |
| RDS master user | `postgres` |
| RDS master password | `ReRoute2026!` |
| RDS security group | `reroute-rds-sg` (sg-0efdc99b06e2f8cd7) — port 5432 open 0.0.0.0/0 |

**IMPORTANT — Model IDs changed from original plan:**
The original `config.py` used bare model IDs (`amazon.nova-lite-v1:0`). These fail in ap-south-1 with "on-demand throughput not supported". The correct APAC cross-region inference profile IDs are what's now in `config.py`. Do NOT revert these.

---

## 3. Dev Commands (this machine)

```powershell
# Backend (run in a terminal, keep it running)
cd d:\amazonHackOn\backend
$env:DATABASE_URL="postgresql://postgres:ReRoute2026!@reroute-db.cbqqm40c6trt.ap-south-1.rds.amazonaws.com:5432/reroute"
$env:AWS_DEFAULT_REGION="ap-south-1"
$env:PYTHONPATH="d:\amazonHackOn\backend"
C:\Users\Divyansh\AppData\Local\Programs\Python\Python311\python.exe -m uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd d:\amazonHackOn\frontend
node_modules\.bin\next.cmd dev
# → http://localhost:3000

# Run tests
cd d:\amazonHackOn\backend
$env:PYTHONPATH="d:\amazonHackOn\backend"
C:\Users\Divyansh\AppData\Local\Programs\Python\Python311\python.exe -m pytest tests/ -v --tb=short

# Re-seed database (if needed)
cd d:\amazonHackOn\backend
$env:DATABASE_URL="postgresql://postgres:ReRoute2026!@reroute-db.cbqqm40c6trt.ap-south-1.rds.amazonaws.com:5432/reroute"
$env:PYTHONPATH="d:\amazonHackOn\backend"
C:\Users\Divyansh\AppData\Local\Programs\Python\Python311\python.exe -m app.db.seed --reset
```

---

## 4. Exact File State

### Backend — `backend/` — ALL BUGS FIXED, LIVE AGAINST AWS

| Path | Status | Notes |
|---|---|---|
| `app/main.py` | ✅ | FastAPI app, CORS, routers |
| `app/core/config.py` | ✅ | **Updated** — APAC model IDs, real S3 bucket names |
| `app/db/database.py` | ✅ | SQLAlchemy engine + get_db() |
| `app/db/models.py` | ✅ | 7 ORM models, FK constraints |
| `app/db/seed.py` | ✅ | Bug 3 fixed (uuid) |
| `app/schemas/schemas.py` | ✅ | Bug 4 fixed (qr_code_base64 added) |
| `app/services/grade_service.py` | ✅ | Bug 1 fixed (Nova Lite body format + APAC profile). Bug: confidence/estimated_retail str→float cast fixed |
| `app/services/routing_service.py` | ✅ | Untouched, all formulas correct |
| `app/services/health_card_service.py` | ✅ | Bug 4 fixed (qr_b64 returned) |
| `app/api/routes/grade.py` | ✅ | Bug 2 fixed (S3 client at module level). Bug 5 fixed (Depends) |
| `app/api/routes/routing.py` | ✅ | Bug 5 fixed (Depends). Syntax bug fixed (missing except) |
| `app/api/routes/health_card.py` | ✅ | Bug 5 fixed (Depends) |
| `requirements.txt` | ✅ | All installed on this machine |
| `conftest.py` + `pytest.ini` | ✅ | SQLite in-memory for tests |
| `tests/` | ✅ | 67/67 passing |

### Frontend — `frontend/` — BUILT, NOT YET DEPLOYED

| Path | Status | Notes |
|---|---|---|
| `lib/types.ts` | ✅ | qr_code_base64 added to HealthCard |
| `lib/api.ts` | ✅ | All fetch wrappers |
| `app/layout.tsx` | ✅ | Amazon-dark nav |
| `app/page.tsx` | ✅ | Return Center — **tested, working** |
| `app/deals/page.tsx` | ✅ | Deals marketplace — **shows seeded + graded listings** |
| `app/relist/page.tsx` | ✅ | ReList C2C — built, not yet live-tested |
| `components/` (all 4) | ✅ | GradingCard, RoutingResult, DealCard, HealthCardView |
| `.env.local` | ✅ | Points to `http://localhost:8000` |
| `amplify.yml` | ❌ | **Not created** — needed for Amplify deploy |

---

## 5. Known Remaining Issues

### Missing: `/card/[uuid]` Health Card page
The health card data is generated and stored (when ReList flow runs), but there's no Next.js dynamic route at `app/card/[uuid]/page.tsx` that renders it as a public web page. QR code points to `https://reroute.demo/card/<uuid>` which doesn't exist yet. For demo: the HealthCardView component renders inline on the ReList page, which is sufficient. Add the dynamic route if time permits.

### Not tested live: ReList flow (Rahul)
The `/relist` page is built and `npm run build` passes, but we haven't tested it against the live backend. The flow: upload image → grade → generate health card → show QR. Should work — no known bugs — but needs a test run.

### Not tested live: Health Card generation
`POST /api/health-card` calls Claude 3.5 Sonnet. Model is verified working (tested directly). Route requires a `grading_report` to exist in DB for the item_id first, so must grade before generating health card.

### Deploy not done
Neither App Runner (backend) nor Amplify (frontend) is configured. The app runs only locally. For Unstop submission, deployment is required.

---

## 6. Live Database State (as of last check)

**RDS: `reroute-db.cbqqm40c6trt.ap-south-1.rds.amazonaws.com`**

| Table | Rows | Content |
|---|---|---|
| items | 13 | 10 products + 3 personas (Priya, Rahul, Ananya) |
| grading_reports | 1 | Nike shoe test grade from live run |
| floating_discounts | 4 | 3 seeded + 1 from live test |
| hub_checkpoints | 12 | 3 trajectories × 4 hubs each |
| health_cards | 0 | Empty — ReList flow not yet tested |
| transactions | 0 | Empty — Buy Now not yet tested |
| abuse_flags | 0 | Empty |

---

## 7. What to Do Next (priority order)

### 1. Test ReList flow end-to-end (15 min)
- Go to `http://localhost:3000/relist`
- Select Rahul + baby monitor, upload any image
- Should: grade → generate health card with QR → show inline

### 2. Create `amplify.yml` for frontend deploy (10 min)
Content:
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### 3. Deploy backend to App Runner (30 min)
- Push repo to GitHub if not already
- App Runner → Create service → Source: GitHub → `backend/` directory
- Set env vars: `DATABASE_URL`, `AWS_DEFAULT_REGION`
- App Runner needs an IAM role with Bedrock + Rekognition + S3 permissions

### 4. Deploy frontend to Amplify (20 min)
- Amplify → New app → Host web app → GitHub repo
- Set `NEXT_PUBLIC_API_URL` to the App Runner URL
- Amplify auto-builds from `amplify.yml`

### 5. Create `/card/[uuid]` dynamic page (optional, 30 min)
- `frontend/app/card/[uuid]/page.tsx`
- Fetch health card from `GET /api/health-card/{uuid}` (need to add this GET route)
- Render full HealthCardView + print button

### 6. Seed deployed RDS + smoke test deployed endpoints

### 7. Record demo video (3-minute script in `amazon_reroute_context_handoff.md` §14)

---

## 8. Bugs Fixed in This Session (for reference)

| Bug | File | Fix |
|---|---|---|
| Bug 1 — Nova Lite body format | `grade_service.py` | Switched to APAC inference profile + `inferenceConfig` + base64 bytes |
| Bug 2 — S3 client in loop | `grade.py` | Moved to module level |
| Bug 3 — `Item._new_uuid()` | `seed.py` | Replaced with `str(uuid.uuid4())`, added `import uuid` |
| Bug 4 — QR not returned | `schemas.py`, `health_card_service.py`, `relist/page.tsx`, `types.ts` | Added `qr_code_base64` field end-to-end |
| Bug 5 — `next(get_db())` pattern | `grade.py`, `routing.py`, `health_card.py` | Switched to `Depends(get_db)` |
| Bug 6 — Missing `except` in `list_deals` | `routing.py` | Added `except Exception` block |
| Bug 7 — str/float comparison | `grade_service.py` | Cast `confidence` and `estimated_retail_inr` to `float()` before use |

---

## 9. The 3 Personas (unchanged)

| ID | Name | Role | Scenario |
|---|---|---|---|
| USER_PRIYA | Priya Sharma | Returner | Nike shoes ₹599, Return Center flow |
| USER_RAHUL | Rahul Mehta | C2C Seller | Baby monitor ₹2499, ReList flow |
| USER_BUYER | Ananya Patel | Buyer | Buys from ReRoute Deals |

---

## 10. Python / Node Paths (this machine)

| Tool | Path |
|---|---|
| Python 3.11 | `C:\Users\Divyansh\AppData\Local\Programs\Python\Python311\python.exe` |
| pip | Same Python's pip |
| uvx | `C:\Users\Divyansh\AppData\Local\Programs\Python\Python311\Scripts\uvx.exe` |
| node | System PATH (v22.18.0) |
| npm | System PATH (v11.13.0) |
| next | `d:\amazonHackOn\frontend\node_modules\.bin\next.cmd` |

---

*Updated: 13 June 2026 — after full AWS wiring, bug fixing, and first live end-to-end test*
*All product decisions remain locked per `amazon_reroute_context_handoff.md`*
