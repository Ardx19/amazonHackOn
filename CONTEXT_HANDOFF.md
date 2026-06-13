# ReRoute — Agent Context Handoff
### Amazon HackOn '26 · Theme 3: Products Without a Second Chance
*Last updated: 14 June 2026 — Session 3 complete*

---

## 1. Current State Summary

**Backend is fully working end-to-end. All 3 demo flows tested live. 89 tests green.**

All flows verified:
- **Return Center (Priya):** upload image → Rekognition + Nova grade → routing formula → floating discount listing on Deals page
- **ReList / C2C (Rahul):** upload image → Nova grade → Health Card with QR, honest AI prose, seller usage declaration
- **Deals page:** 10 active listings with correct logistics-based pricing

A new Amazon-clone UI is being built by teammates and will integrate via the existing backend API. The skeletal test UI (`frontend/`) is for internal testing only.

| Area | Status |
|---|---|
| Backend all routes + services | ✅ Complete, 89/89 tests passing |
| Floating discount economic model | ✅ Correct logistics model implemented |
| AWS Nova (grading + health card) | ✅ Live, tested, verified |
| AWS Rekognition | ✅ Live, real CV labels |
| RDS PostgreSQL | ✅ Live, seeded with 136 demo rows |
| S3 image storage | ✅ Live, UUID-keyed per upload |
| Return Center flow | ✅ Tested end-to-end |
| ReList + Health Card flow | ✅ Tested end-to-end |
| Deals page | ✅ Working |
| Health Card dual trust signals | ✅ Seller declaration + AI independent |
| GET /api/health-card/{uuid} | ✅ Built (QR target endpoint) |
| New Amazon-clone UI | ⏳ Incoming from teammates |
| `/card/[uuid]` public page | ❌ Backend ready, frontend not built |
| Deployment | ❌ Awaiting Unstop instructions |
| Demo video | ❌ Not recorded |

---

## 2. AWS Resources (do not re-provision)

| Resource | Value |
|---|---|
| AWS Account ID | 720800607906 |
| Region | ap-south-1 |
| IAM User | `reroute-backend` |
| Credentials | `C:\Users\Divyansh\.aws\credentials` (standard location, not in repo) |
| S3 images bucket | `reroute-item-images-720800607906` |
| S3 health cards bucket | `reroute-health-cards-720800607906` |
| Bedrock grading | `apac.amazon.nova-lite-v1:0` |
| Bedrock health card | `apac.amazon.nova-lite-v1:0` (switched from Claude — no approval needed) |
| RDS identifier | `reroute-db` |
| RDS endpoint | `reroute-db.cbqqm40c6trt.ap-south-1.rds.amazonaws.com` |
| RDS port / DB / User / PW | `5432` / `reroute` / `postgres` / `ReRoute2026!` |
| RDS security group | `reroute-rds-sg` — port 5432 open 0.0.0.0/0 |

---

## 3. Dev Commands

```powershell
# Backend
cd d:\amazonHackOn\backend
$env:DATABASE_URL="postgresql://postgres:ReRoute2026!@reroute-db.cbqqm40c6trt.ap-south-1.rds.amazonaws.com:5432/reroute"
$env:AWS_DEFAULT_REGION="ap-south-1"
$env:PYTHONPATH="d:\amazonHackOn\backend"
python -m uvicorn app.main:app --reload --port 8000

# Frontend (test UI)
cd d:\amazonHackOn\frontend
npm run dev   # → http://localhost:3000

# Tests
cd d:\amazonHackOn\backend
$env:PYTHONPATH="d:\amazonHackOn\backend"
python -m pytest tests/ -v --tb=short

# Full demo reseed (136 rows — use this)
cd d:\amazonHackOn\backend
$env:DATABASE_URL="postgresql://postgres:ReRoute2026!@reroute-db.cbqqm40c6trt.ap-south-1.rds.amazonaws.com:5432/reroute"
$env:PYTHONPATH="d:\amazonHackOn\backend"
python -m app.db.seed_demo --reset

# Legacy seed (10 products only)
python -m app.db.seed --reset
```

**Python:** use `python` (= Python 3.13 at `C:\Python313`, all packages installed here)

---

## 4. Backend File State

| Path | State | Key notes |
|---|---|---|
| `app/main.py` | ✅ | FastAPI, CORS, all routers registered |
| `app/core/config.py` | ✅ | APAC Nova IDs, S3 buckets, cost-decomposition ratios, `HEALTH_CARD_BASE_URL` |
| `app/db/database.py` | ✅ | SQLAlchemy engine + `get_db()` |
| `app/db/models.py` | ✅ | 7 ORM models; `health_cards` has `condition_summary`, `usage_estimate`, `care_recommendation`, `seller_usage_description`, `qr_code_base64` |
| `app/db/seed.py` | ✅ | Legacy 10-product seed; uses new pricing model; TRUNCATE CASCADE reset |
| `app/db/seed_demo.py` | ✅ NEW | Full demo seeder from `seed_demo.json` |
| `app/db/seed_demo.json` | ✅ NEW | 30 products, 8 personas, 10 trajectories, 40 checkpoints, 12 health cards, 6 transactions |
| `app/schemas/schemas.py` | ✅ | `RoutingResponse` has `mrp_inr`, `discount_pct`, `sale_case`. `HealthCard` has prose + seller fields |
| `app/services/grade_service.py` | ✅ | `flow` param; UUID S3 keys; delete-before-insert; prompt hardened against defect hallucination |
| `app/services/routing_service.py` | ✅ | Unified logistics model: `radius=D_rem/cpk`, `price=MRP-min(D_rem, MRP-COGS)` |
| `app/services/health_card_service.py` | ✅ | Nova (not Claude); visual wear level; seller declaration; deterministic fallback |
| `app/api/routes/grade.py` | ✅ | `flow` form field; UUID S3 keys; delete-before-insert |
| `app/api/routes/routing.py` | ✅ | No changes this session |
| `app/api/routes/health_card.py` | ✅ | POST + GET endpoints; persists QR; upsert via `db.merge()` |
| `tests/test_routing_service.py` | ✅ | Rewritten for new model (37 tests) |
| `tests/test_api_routes.py` | ✅ | Fixed `StaticPool` — 8 pre-existing failures now resolved |

---

## 5. API Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/` | Health check |
| POST | `/api/grade` | `flow=return` (default) or `flow=relist`. Unique S3 key per upload. |
| POST | `/api/evaluate-route` | Floating discount routing |
| GET | `/api/deals` | Active listings |
| POST | `/api/health-card` | Optional `seller_usage_description` |
| GET | `/api/health-card/{uuid}` | QR verification target |
| GET | `/docs` | OpenAPI |

---

## 6. Database State (after seed_demo --reset)

| Table | Rows |
|---|---|
| items | 38 (30 products + 8 personas) |
| grading_reports | 30 |
| floating_discounts | 10 |
| hub_checkpoints | 40 |
| health_cards | 12 |
| transactions | 6 |
| abuse_flags | 0 |

---

## 7. Personas

| ID | Name | Role | Scenario |
|---|---|---|---|
| USER_PRIYA | Priya Sharma | Returner | Nike shoes, Return Center flow |
| USER_RAHUL | Rahul Mehta | C2C Seller | Baby monitor, ReList flow |
| USER_ARUL | Arul Kumar | Buyer | Buys from Deals nearby Priya |
| USER_KAVYA | Kavya Iyer | Buyer | Baby products buyer |
| USER_VIKRAM | Vikram Joshi | Seller | Electronics |
| USER_MEERA | Meera Nair | Returner | Multi-category returner |
| USER_KARAN | Karan Malhotra | Buyer | Electronics buyer |
| USER_SNEHA | Sneha Deshmukh | Seller | Multi-category seller |

---

## 8. Floating Discount Model

```
D_remaining = cost_per_km × distance_to_RC_km
radius      = D_remaining / cost_per_km   (max 50km)
price       = MRP − min(D_remaining, MRP − COGS)
```

Config: `COGS=0.55×price, MRP=0.85×price`. Price rises toward RC; radius shrinks. See `routing_service.py` for full implementation. The model is an approximation for demo — Amazon has real COGS/margin data from OMS.

Routing decision tree (pre-filters):
1. Poor → recycle
2. Like New + price ≥ ₹2000 → Amazon Renewed
3. Confidence < 85% → standard return
4. Return overhead < 7% of MRP → standard return
5. Otherwise → floating discount cascade

---

## 9. How AWS Services Work Together

```
User uploads photo
     ↓
S3  — stores image (uuid/filename key, unique per upload)
     ↓
Rekognition — detect_labels() → generic visual labels e.g. ["Shoe","Sneaker"]
     ↓
Nova Lite (vision) — sees image bytes + labels + prompt → JSON grade
     {condition_grade, confidence, defects, brand, estimated_retail}
     ↓
  ┌──────────────────────────────────────┐
  │ Return flow          │ ReList flow   │
  │ routing_service      │ health_card   │
  │ → floating discount  │ → Nova prose  │
  │ → Deals page         │ → QR code     │
  └──────────────────────────────────────┘
     ↓
RDS PostgreSQL — stores everything
```

All Bedrock calls use `apac.amazon.nova-lite-v1:0`. No Anthropic Claude — requires separate approval form.

---

## 10. Health Card Trust Design

Two signals shown side-by-side:

- **Seller declares** (yellow box): free-text from seller ("Used 3 months, works perfectly") — labelled "Self-declared, not verified"
- **Amazon AI assesses** (blue box): Nova's honest condition summary from pixels + visible wear level (e.g. "Light regular use") — labelled "Amazon AI independently assessed"

The contrast is the trust mechanism. Buyers see both and decide. The card is stored server-side (tamper-proof), generated by Amazon's AI not the seller.

Key lines from UI:
- "This report was generated by Amazon's AI — not the seller. The seller cannot edit it."
- "✓ Amazon A-to-Z Guarantee Protected"

---

## 11. Python / Node (this machine)

| Tool | Path |
|---|---|
| Python 3.13 | `C:\Python313\python.exe` — USE THIS (all packages here) |
| Python 3.11 | `C:\Users\Divyansh\AppData\Local\Programs\Python\Python311\python.exe` — legacy, avoid |
| node | System PATH (v22.18.0) |
| npm | System PATH (v11.13.0) |

---

## 12. What's Next

1. **Integrate new Amazon-clone UI** — teammates building it. Backend `localhost:8000` is ready. Set `NEXT_PUBLIC_API_URL` (or equivalent) to backend URL.
2. **`/card/[uuid]` frontend page** — `app/card/[uuid]/page.tsx`. Call `GET /api/health-card/{uuid}`, render HealthCardView. Needed for QR to resolve.
3. **Deploy** — awaiting Unstop instructions. When ready: App Runner (backend) + set `DATABASE_URL` + `AWS_DEFAULT_REGION` env vars + IAM role with Nova/Rekognition/S3 permissions.
4. **Demo video** — 3-minute script in `amazon_reroute_context_handoff.md`.
