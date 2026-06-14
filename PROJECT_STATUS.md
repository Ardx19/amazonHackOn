# ReRoute — Project Status

> **Last updated**: Session 3 complete — 14 June 2026
> **State**: Backend fully working end-to-end. All 3 demo flows tested live. 89 tests green.
> New UI (Amazon clone) incoming from teammates — backend is integration-ready.

---

## CURRENT RUNNABLE STATE

```powershell
# Terminal 1 — Backend
cd d:\amazonHackOn\backend
$env:DATABASE_URL="postgresql://postgres:ReRoute2026!@reroute-db.cbqqm40c6trt.ap-south-1.rds.amazonaws.com:5432/reroute"
$env:AWS_DEFAULT_REGION="ap-south-1"
$env:PYTHONPATH="d:\amazonHackOn\backend"
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend (skeletal test UI, being replaced by Amazon clone)
cd d:\amazonHackOn\frontend
npm run dev   # → http://localhost:3000

# Run tests
cd d:\amazonHackOn\backend
$env:PYTHONPATH="d:\amazonHackOn\backend"
python -m pytest tests/ -v --tb=short   # 89/89 expected

# Reseed with full demo data (30 products, 8 personas, 10 trajectories, 12 health cards)
cd d:\amazonHackOn\backend
$env:DATABASE_URL="..."
$env:PYTHONPATH="d:\amazonHackOn\backend"
python -m app.db.seed_demo --reset

# Legacy seed (10 products, 3 personas — simpler)
python -m app.db.seed --reset
```

**Python on this machine:** Use `python` (maps to C:\Python313 — Python 3.13, all deps installed here)

---

## BACKEND FILE STATUS

| File | Status | Session 3 Changes |
|---|---|---|
| `app/core/config.py` | ✅ | Added `COGS_RATIO`, `MARGIN_RATIO`, `ORIGINAL_DELIVERY_RATIO`, `MRP_RATIO`, `HEALTH_CARD_BASE_URL`. **Health card model changed from Claude to Nova** |
| `app/schemas/schemas.py` | ✅ | Added `mrp_inr`, `cogs_inr`, `discount_pct`, `sale_case` to `RoutingResponse`. Added `condition_summary`, `usage_estimate`, `care_recommendation`, `seller_usage_description` to `HealthCard`. Added `seller_usage_description` to `HealthCardRequest` |
| `app/db/database.py` | ✅ | Unchanged |
| `app/db/models.py` | ✅ | Added `condition_summary`, `usage_estimate`, `care_recommendation`, `seller_usage_description`, `qr_code_base64` columns to `HealthCard` ORM |
| `app/db/seed.py` | ✅ | Updated to use new floating-discount model (correct pricing); fixed FK reset to use TRUNCATE CASCADE |
| `app/db/seed_demo.py` | ✅ NEW | Full demo seeder — reads `seed_demo.json`, loads 136 rows across 7 tables |
| `app/db/seed_demo.json` | ✅ NEW | 30 products, 8 personas, 10 trajectories, 40 checkpoints, 12 health cards, 6 transactions |
| `app/services/grade_service.py` | ✅ | Added `flow` param (`return` vs `relist`). Relist flow suppresses route computation. Fixed S3 key uniqueness (uuid prefix). Fixed duplicate item_id crash (delete-before-insert). Tightened grading prompt to not hallucinate defects |
| `app/services/routing_service.py` | ✅ | **Complete rewrite** — unified floating-discount logistics model. `radius = D_remaining / cpk`, `price = MRP - min(D_remaining, MRP-COGS)`. Price rises toward RC, radius shrinks. Replaced old graded-value depreciation model |
| `app/services/health_card_service.py` | ✅ | **Claude → Nova**. Added seller usage description. Changed `usage_estimate` to visual wear level (not fake month estimate). Added deterministic template fallback. Added `seller_usage_description` pass-through |
| `app/api/routes/grade.py` | ✅ | Added `flow` form param. UUID-prefixed S3 keys. Delete-before-insert on re-grade |
| `app/api/routes/routing.py` | ✅ | Unchanged |
| `app/api/routes/health_card.py` | ✅ | Added `GET /api/health-card/{uuid}` endpoint. Persists `qr_code_base64`. Upsert via `db.merge()`. Passes seller usage through |
| `requirements.txt` | ✅ | Unchanged — all installed on Python 3.13 |
| `conftest.py` + `pytest.ini` | ✅ | Unchanged |
| `tests/test_routing_service.py` | ✅ | Full rewrite to match new logistics model (37 tests) |
| `tests/test_api_routes.py` | ✅ | Fixed pre-existing SQLite StaticPool bug — all 12 API tests now pass |
| `tests/test_grade_service.py` | ✅ | Unchanged, 30 passing |
| `tests/test_health_card_service.py` | ✅ | Unchanged, 9 passing |

**Test count: 89/89 passing**

---

## FRONTEND FILE STATUS (skeletal test UI — being replaced)

| File | Status | Session 3 Changes |
|---|---|---|
| `lib/types.ts` | ✅ | Added `condition_summary`, `usage_estimate`, `care_recommendation`, `seller_usage_description` to `HealthCard`. Added `mrp_inr`, `cogs_inr`, `discount_pct`, `sale_case` to `RoutingResult` |
| `lib/api.ts` | ✅ | Unchanged |
| `components/GradingCard.tsx` | ✅ | Route suggestion box now hidden when `recommended_route` is empty (so it doesn't show on ReList flow) |
| `components/HealthCardView.tsx` | ✅ | Shows dual trust signals: Seller says (yellow) + Amazon AI assessed (blue). Visual wear level instead of fake month estimate |
| `components/RoutingResult.tsx` | ✅ | Unchanged |
| `components/DealCard.tsx` | ✅ | Unchanged |
| `app/page.tsx` | ✅ | Return Center — tested working |
| `app/deals/page.tsx` | ✅ | Deals marketplace — tested working |
| `app/relist/page.tsx` | ✅ | Added `flow=relist` form field. Added `sellerUsage` input. ReList flow tested end-to-end |
| `.env.local` | ✅ | Points to `http://localhost:8000` |

> Note: This frontend is a skeletal test UI only. A full Amazon-clone UI is being built separately and will integrate via the same backend API. The backend is clean and integration-ready.

---

## AWS RESOURCES (do not re-provision)

| Resource | Value |
|---|---|
| AWS Account ID | 720800607906 |
| Region | ap-south-1 |
| IAM User | `reroute-backend` |
| Credentials | `C:\Users\Divyansh\.aws\credentials` (never in repo) |
| S3 images bucket | `reroute-item-images-720800607906` |
| S3 health cards bucket | `reroute-health-cards-720800607906` |
| Bedrock grading model | `apac.amazon.nova-lite-v1:0` |
| Bedrock health card model | `apac.amazon.nova-lite-v1:0` (switched from Claude — no approval needed) |
| RDS identifier | `reroute-db` |
| RDS endpoint | `reroute-db.cbqqm40c6trt.ap-south-1.rds.amazonaws.com` |
| RDS port | 5432 / DB: `reroute` / User: `postgres` / PW: `ReRoute2026!` |
| RDS security group | `reroute-rds-sg` (sg-0efdc99b06e2f8cd7) — port 5432 open 0.0.0.0/0 |

---

## LIVE DATABASE STATE (after seed_demo --reset)

| Table | Rows | Content |
|---|---|---|
| items | 38 | 30 products + 8 personas (Priya, Rahul, Arul, Kavya, Vikram, Meera, Karan, Sneha) |
| grading_reports | 30 | Pre-seeded grades for all 30 products |
| floating_discounts | 10 | Active listings with correct logistics pricing |
| hub_checkpoints | 40 | 10 trajectories × 4 checkpoints each |
| health_cards | 12 | Pre-seeded health cards with QR codes |
| transactions | 6 | Demo transactions |
| abuse_flags | 0 | Empty |

---

## API ENDPOINTS (all live at `http://localhost:8000`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Health check |
| POST | `/api/grade` | Upload image → Rekognition + Nova → GradingReport |
| POST | `/api/evaluate-route` | GradingReport → floating discount listing |
| GET | `/api/deals` | List active floating discount listings |
| POST | `/api/health-card` | GradingReport → Health Card + QR |
| GET | `/api/health-card/{uuid}` | Fetch health card by UUID (QR target) |
| GET | `/docs` | OpenAPI interactive docs |

### Key API behaviours
- `POST /api/grade` accepts `flow=return` (default) or `flow=relist`. Relist suppresses route computation.
- `POST /api/grade` generates a unique S3 key per upload (uuid prefix) — no caching, fresh Nova inference every call.
- `POST /api/grade` deletes previous grading report for the same `item_id` before inserting — safe to re-grade.
- `POST /api/health-card` accepts optional `seller_usage_description` — shown alongside AI assessment.
- `POST /api/health-card` uses `db.merge()` — safe to re-generate a card for the same item.

---

## ECONOMIC MODEL — Floating Discount (Scenario 1: Priya return)

Single formula applied at every checkpoint:

```
D_remaining = cost_per_km × distance_to_RC_km
radius      = D_remaining / cost_per_km          (capped at 50km)
budget      = min(D_remaining, MRP - COGS)
price       = MRP - budget
discount    = (MRP - price) / MRP × 100
```

Config ratios (approximate COGS split — Amazon has real values in their OMS):
```
COGS_RATIO = 0.55, MARGIN_RATIO = 0.30, ORIGINAL_DELIVERY_RATIO = 0.15
MRP = original_price × 0.85
```

Price rises toward RC, radius shrinks. Amazon never loses — net = MRP − D_remaining either way, but gets working capital faster and avoids the return journey carbon.

---

## WHAT'S NEXT

| Task | Priority | Notes |
|---|---|---|
| Integrate new Amazon-clone UI | HIGH | Backend API is ready. Set `NEXT_PUBLIC_API_URL=http://localhost:8000` |
| Deploy backend (App Runner) | MEDIUM | Awaiting Unstop instructions on where to deploy |
| Deploy frontend | MEDIUM | Awaiting Unstop instructions |
| `/card/[uuid]` public page | LOW | Backend GET endpoint exists. Needs frontend route `app/card/[uuid]/page.tsx` |
| Demo video | LAST | 3-minute script in `amazon_reroute_context_handoff.md` |

---

## BUGS FIXED — ALL SESSIONS

| Bug | File | Session | Fix |
|---|---|---|---|
| Nova Lite body format | `grade_service.py` | S1 | APAC inference profile + `inferenceConfig` + base64 bytes |
| S3 client in loop | `grade.py` | S1 | Moved to module level |
| `Item._new_uuid()` | `seed.py` | S1 | Replaced with `str(uuid.uuid4())` |
| QR not returned | `schemas.py`, `health_card_service.py` | S1 | Added `qr_code_base64` end-to-end |
| `next(get_db())` pattern | routes | S1 | Switched to `Depends(get_db)` |
| Missing `except` in `list_deals` | `routing.py` | S1 | Added `except Exception` |
| str/float comparison | `grade_service.py` | S2 | Cast to `float()` before use |
| MCP connectivity | `mcp.json` | S2 | Disabled aws-docs + amplify MCPs |
| SQLite StaticPool | `test_api_routes.py` | S3 | Added `poolclass=StaticPool` — 8 previously failing API tests now pass |
| S3 key collision / stale cache | `grade.py` | S3 | UUID-prefixed keys per upload |
| Duplicate item_id crash on re-grade | `grade.py` | S3 | Delete-before-insert |
| Nova hallucinating defects | `grade_service.py` | S3 | Prompt: "only report visually confirmed defects" |
| ReRoute bleeding into ReList | `grade_service.py`, `grade.py` | S3 | Added `flow` param; relist suppresses route |
| FK violation on seed reset | `seed.py`, `seed_demo.py` | S3 | TRUNCATE CASCADE |
| Claude use-case form error | `health_card_service.py` | S3 | Switched to Nova (already approved) |
| Wrong radius/pricing model | `routing_service.py` | S3 | Full rewrite to logistics model |
| Fake month estimate in health card | `health_card_service.py` | S3 | Changed to visual wear-level description |

---

## SESSION 4 — New Frontend Integration (amazon.in-clone)

The skeletal Next.js test UI is superseded by `amazon.in-clone/` — a Vite + React 19 Amazon.in clone. The backend was wired in WITHOUT changing any backend logic and WITHOUT changing the clone's UI/markup/styling.

### What the clone is
- Vite + React 19 + Tailwind 4 + Framer Motion. Dev on port 3000 (`npm run dev`).
- All ReRoute features live in `src/components/MarketplaceView.tsx`:
  - **FLOAT tab** = floating-discount deals
  - **RELIST tab** = C2C listings + AI Health Card grader (in create-listing form)

### Integration changes (frontend — surgical, data-layer only)
| File | Change |
|---|---|
| `src/api.ts` | NEW — fetch client: `gradeProduct()` (POST /api/grade, multipart), `getDeals()` (GET /api/deals). Base URL from `VITE_API_URL` |
| `.env` | NEW — `VITE_API_URL=http://localhost:8000` |
| `src/components/MarketplaceView.tsx` | `simulateMediaUpload()` now opens a real OS file picker; `handleRealFileSelect()` stores real File objects; `triggerAIEvaluation()` calls the backend (was setTimeout+random mock); FLOAT tab fetches live `/api/deals` via `useEffect` (falls back to static mock if backend down); added hidden `<input type=file>` + small grader-error display. No markup/styling/layout changes. |

### Backend changes for integration
- **NONE to code.** One data row added to RDS `items`: `RELIST_SCRATCH` — the FK anchor for ReList gradings (a new C2C listing has no catalogue item_id; grading persists against this anchor; safe because /api/grade does delete-before-insert).

### Data-shape mappings
- GradingReport → grader card: `score=confidence×100`, `grade=condition_grade`, `functionality`=defects summary, `diagnostics`=Nova/completeness summary, `suggestedPrice`=resale-band midpoint.
- Deal → FLOAT card: deals carry no image/brand/category, so category is guessed from product name, image is a category fallback stock photo, rating/reviewCount defaulted. Prices/discounts/names are real from the backend.

### Verified
- `npm install`, `npm run lint` (tsc), `npm run build` — all clean.
- `GET /api/deals` → 11 live deals.
- `POST /api/grade` with `RELIST_SCRATCH` + `flow=relist` + real image → genuine Nova grade, no FK crash, no route leak.

### Run the clone
```powershell
cd d:\amazonHackOn\amazon.in-clone
npm install      # first time
npm run dev      # → http://localhost:3000  (backend must be on :8000)
```
