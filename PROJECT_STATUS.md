# ReRoute — Project Status

> **Last updated**: Session 4 — 14 June 2026
> **State**: Backend fully working. Frontend (Vite+React Amazon clone) integrated. Chat removed. ReList → Add to Cart. Green Credits built. 89 tests green.
> Marketplace items auto-removed after checkout. UI cleaned (no surplus/escrow/discount stickers).

---

## CURRENT RUNNABLE STATE

```bash
# Terminal 1 — Backend (WSL)
cd /mnt/c/Users/Aryan\ Datt/Desktop/Aryan/hackathon/amazonHackOn/ReRoute/backend
export DATABASE_URL='postgresql://postgres:ReRoute2026!@reroute-db.cbqqm40c6trt.ap-south-1.rds.amazonaws.com:5432/reroute'
export AWS_ACCESS_KEY_ID="AKIA2PUYQN2ROMPXSFPD"
export AWS_SECRET_ACCESS_KEY="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"
export AWS_DEFAULT_REGION="ap-south-1"
export PYTHONPATH="$(pwd)"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend (WSL)
cd /mnt/c/Users/Aryan\ Datt/Desktop/Aryan/hackathon/amazonHackOn/ReRoute/frontend
npm run dev   # → http://localhost:3000

# Run tests
cd /mnt/c/Users/Aryan\ Datt/Desktop/Aryan/hackathon/amazonHackOn/ReRoute/backend
export AWS_DEFAULT_REGION="ap-south-1"
export PYTHONPATH="$(pwd)"
python -m pytest tests/ -v --tb=short   # 89/89 expected

# Reseed with full demo data (30 products, 10 personas, 10 trajectories, 12 health cards)
cd /mnt/c/Users/Aryan\ Datt/Desktop/Aryan/hackathon/amazonHackOn/ReRoute/backend
export DATABASE_URL='postgresql://postgres:ReRoute2026!@reroute-db.cbqqm40c6trt.ap-south-1.rds.amazonaws.com:5432/reroute'
export AWS_ACCESS_KEY_ID="AKIA2PUYQN2ROMPXSFPD"
export AWS_SECRET_ACCESS_KEY="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"
export AWS_DEFAULT_REGION="ap-south-1"
export PYTHONPATH="$(pwd)"
python -m app.db.seed_demo --reset
```

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

## FRONTEND FILE STATUS (Vite+React 19 Amazon.in clone — integrated)

| File | Status | Changes This Session |
|---|---|---|
| `src/lib/types.ts` | ✅ | Pydantic-matched TS interfaces (DealItem, GradingReport, HealthCard, etc.) |
| `src/lib/api.ts` | ✅ | 5 endpoint wrappers (grade, evaluateRoute, getDeals, generateHealthCard, getHealthCard) |
| `src/components/MarketplaceView.tsx` | ✅ | **Major rewrite**: Chat/negotiate removed. ReList → Add to Cart. Green credits on relist success. Sustainability badge on all cards. Purchased items removed post-checkout. UI cleanup (no surplus/escrow/discount stickers). LIVE ORDERS. |
| `src/components/GreenCreditsCard.tsx` | ✅ NEW | Green credits + CO₂ saved + tier badge + Amazon Climate Pledge footer |
| `src/components/SustainabilityBadge.tsx` | ✅ NEW | ♻ Eco Choice pill with tooltip on all marketplace cards |
| `src/components/GradingCard.tsx` | ✅ | Tailwind-adapted. Route box hidden when no route |
| `src/components/HealthCardView.tsx` | ✅ | Tailwind-adapted. QR code + trust score |
| `src/components/AdminReviewView.tsx` | ✅ | Approve/reject review queue |
| `src/components/CartDrawer.tsx` | ✅ | GreenCreditsCard shown on checkout success |
| `src/App.tsx` | ✅ | View router. handlePlaceOrder extracts Float+ReList purchased IDs, passed as excludePurchaseIds |
| `src/index.css` | ✅ | Tailwind v4 @theme with Amazon brand colors |

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
| Deploy backend (App Runner) | HIGH | Dockerfile + apprunner.yaml needed |
| Deploy frontend (Amplify) | HIGH | amplify.yml needed |
| Record demo video | HIGH | 3-minute script ready. Covers all 3 flows |
| `/card/[uuid]` public page | MEDIUM | Backend GET endpoint exists. Needs frontend route |
| Replace dummyjson images with Amazon CDN | LOW | `CATEGORY_IMAGE_MAP` uses dummyjson — swap to m.media-amazon.com |
| Deploy cron Lambda | LOW | Ring progression Lambda built, not deployed to AWS |

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

## SESSION 4 — Complete Frontend Integration & UI Polish

The skeletal Next.js test UI has been fully replaced by the Vite + React 19 Amazon.in clone. All ReRoute features are wired.

### What changed this session

| Area | Changes |
|---|---|
| Green Credits | New `GreenCreditsCard` + `SustainabilityBadge` components. Credits/CO₂/tier badge shown on relist success + purchase confirmation |
| Chat removed | Negotiate Peer Deal, chat modal, triggerSellerChat, handleSendChatMessage all deleted. `MessageCircle` and `Send` removed from imports |
| ReList → Add to Cart | New `handlePurchaseRelistItem` maps relist items to Product type. Both detail page and listing cards show "Add to Cart" |
| Secure Locker Swap | Removed from detail page |
| Purchased item removal | Float AND ReList items disappear from marketplace after checkout. `purchasedFloatDealIds` in App.tsx handles both prefixes |
| UI cleanup | No surplus/escrow/discount stickers. "LIVE BROADCAST MATRIX" → "LIVE ORDERS". "Surplus Clearance Matrix" → "Live Transit Deals". "Clean space. Stack paper." removed. Escrow ID removed. TRANSIT CLAUSE removed |
| Brutalist modern style | Header now reads "Modern Brutalist — BETA trading matrix — Noida Hub" |

### Verified
- `npm run lint` (tsc --noEmit) — clean
- All 3 demo flows unchanged (backend was never touched)
- Green Credits appear on relist success + cart checkout success
- SustainabilityBadge on every Float and ReList card
- Purchased items removed from both Float and ReList views after checkout
