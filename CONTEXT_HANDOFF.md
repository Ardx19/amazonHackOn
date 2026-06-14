# ReRoute — Agent Context Handoff
### Amazon HackOn '26 · Theme 3: Products Without a Second Chance
*Last updated: 14 June 2026 — Return→Float→Simulation pipeline complete, location-aware deals, persona logins*

---

## 1. Current State Summary

**Full Scenario-1 pipeline working end-to-end: Priya returns → AI grades → return path generated → floating discount listing created → nearby buyers see it on Float → simulation advances it through checkpoints (price rises, radius shrinks).**

| Area | Status |
|---|---|
| Backend — 8 endpoints | ✅ Working, live-tested |
| Database (RDS PostgreSQL) | ✅ Seeded; new lat/lng columns added |
| AWS Nova (grading + health card prose) | ✅ Live |
| AWS Rekognition (CV labels) | ✅ Live |
| S3 image storage | ✅ UUID-keyed per upload |
| Frontend (Vite + React 19 + Tailwind v4) | ✅ in `frontend/` |
| Return flow (Priya) | ✅ Upload photo → grade → path → listing. No discount shown to Priya. |
| Float page (location-filtered) | ✅ Deals filtered by user pincode/coords |
| Simulation page (manual advancement) | ✅ Advance checkpoints, price rises, radius shrinks |
| Persona logins (pincode-based) | ✅ Priya / Arul / Rahul / Ishaan |
| ReList C2C grading + Health Card | ✅ Live (uses RELIST_SCRATCH anchor item) |
| `/card/[uuid]` public page | ❌ Backend GET exists, no frontend route |
| Deployment | ❌ Awaiting Unstop instructions |
| Demo video | ❌ Not recorded |

The frontend lives in `frontend/` (Vite + React, runs on port 3000). Old Next.js artifacts may still sit in the folder but are unused — `npm run dev` launches Vite.

---

## 2. The Return → Float → Simulation Pipeline (Scenario 1)

```
PRIYA returns an item (Your Orders → Return → upload photo → Confirm)
   │
   ▼  POST /api/initiate-return  (multipart: images + item_id + price + pincode)
   │     1. Ensures item exists in `items` (auto-creates if catalog ID not in RDS)
   │     2. Grades the photo via Nova (flow="return")  → persists GradingReport
   │     3. generate_return_path(): 4 dynamic checkpoints from Priya's coords → RC
   │        (haversine-spaced; stored in hub_checkpoints with lat/lng)
   │     4. evaluate_route() at ring 0 → creates FloatingDiscount listing
   │        (stores hub_lat/hub_lng = Priya's coords)
   │  Re-returning the same item DELETES prior listing/checkpoints first (no dupes)
   │
   ▼  Priya gets refund, modal closes. She NEVER sees the floating discount.
   │
   ▼  Listing is now live in `floating_discounts` (status=active)
   │
ARUL (nearby buyer) opens Marketplace → Float tab
   │  GET /api/deals?pincode=400057
   │     → server computes haversine(user, listing.hub_lat/lng)
   │     → only returns listings where distance ≤ radius_km
   │  Arul (Vile Parle, ~5km) sees it. Ishaan (Noida, 1160km) does NOT.
   │
SIMULATION page (Marketplace → "⚡ Float Simulation")
   │  Select listing → "Advance to Next Checkpoint"
   │  POST /api/advance-ring  → advance_to_next_ring()
   │     D_remaining shrinks → price RISES toward MRP, radius SHRINKS, discount DROPS
   │  Repeats until Return Center (ring = last checkpoint) → listing expires
```

---

## 3. API Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/` | Health check |
| POST | `/api/grade` | Multipart. `flow` = "return" or "relist". UUID S3 keys, delete-before-insert. |
| POST | `/api/evaluate-route` | JSON. Routing decision + creates listing. (Called internally by initiate-return.) |
| POST | `/api/initiate-return` | **Main return endpoint.** Multipart: `images`, `item_id`, `product_name`, `category`, `original_price_inr`, `pincode`. Grade + path + listing in one call. |
| POST | `/api/advance-ring` | JSON: `{ item_id, category }`. Moves listing to next checkpoint. |
| GET | `/api/deals` | Query: `pincode` OR `lat`+`lng` (location filter), `hub_id` (optional). |
| POST | `/api/health-card` | JSON: `{ item_id, seller_id, seller_name, seller_city, seller_usage_description? }` |
| GET | `/api/health-card/{uuid}` | QR verification target |

---

## 4. Key Backend Files

| File | Role |
|---|---|
| `app/services/return_service.py` | **NEW.** `initiate_return()`, `generate_return_path()` (haversine checkpoints), `persist_checkpoints()`, `get_next_checkpoint()`, `pincode_to_coords()` |
| `app/services/routing_service.py` | Floating-discount economic model. `evaluate_route`, `compute_radius`, `compute_floating_price`, `advance_to_next_ring` (now stores hub_lat/lng) |
| `app/services/grade_service.py` | Nova grading. `flow` param; prompt hardened against defect hallucination |
| `app/services/health_card_service.py` | Nova prose + QR + deterministic fallback |
| `app/api/routes/returns.py` | **NEW.** `/api/initiate-return`, `/api/advance-ring` |
| `app/api/routes/routing.py` | `/api/evaluate-route`, `/api/deals` (with haversine location filter) |
| `app/core/config.py` | Cost ratios, `RETURN_CENTER`, `PINCODE_COORDS`, `HUB_ZONES`, `DELIVERY_COST_PER_KM` |

## 5. Key Frontend Files

| File | Role |
|---|---|
| `src/lib/api.ts` | All endpoint wrappers incl. `initiateReturn()`, `advanceRing()`, `getDeals(hubId, pincode)` |
| `src/components/YourOrdersView.tsx` | Return modal with photo upload → `initiateReturn()`. No intercept modal (Priya never sees float). |
| `src/components/MarketplaceView.tsx` | Float tab: `getDeals(undefined, session.pincode)`. "⚡ Float Simulation" button. ReList grading. |
| `src/components/SimulationView.tsx` | **NEW.** Lists active listings, "Advance to Next Checkpoint", live price/radius/discount + history log. |
| `src/components/MockSignIn.tsx` | Persona quick-logins (each sets pincode + city) |
| `src/App.tsx` | View router incl. `'simulation'`. Demo order = Skechers shoes (₹999, reroute-friendly). Nav handlers scroll-to-top. |

---

## 6. Demo Personas (login via Sign In → quick-login buttons)

| Persona | Role | Pincode | City | Purpose |
|---|---|---|---|---|
| Priya Sharma | Returner | 400069 | Mumbai Andheri | Returns the Skechers → creates float listing |
| Arul Kumar | Buyer | 400057 | Mumbai Vile Parle | ~5km from Priya → SEES the listing |
| Rahul Mehta | C2C Seller | 400602 | Mumbai Thane | Sees listing; also ReList demo |
| Ishaan Raj | Buyer | 110091 | Noida | 1160km away → does NOT see Mumbai listings |

**Demo order:** "Skechers Summits Slip-On Sneakers (Navy)" ₹999, footwear, item_id `DEMO_RETURN_SHOE`. Chosen because it reliably enters reroute (8% return overhead > 7% threshold, below ₹2000 Renewed cutoff). High-value items (e.g. the ₹32990 AC) correctly route to Amazon Renewed and do NOT create float listings.

---

## 7. Demo Script

1. **Sign in as Priya** → Returns & Orders → the Skechers order → "Return or Replace" → upload any photo → Confirm. Refund issued; Priya is done.
2. **Sign in as Arul** → Marketplace → Float Deals → the Skechers appears at a discount (he's within radius).
3. **Marketplace → ⚡ Float Simulation** → select the Skechers → "Advance to Next Checkpoint" repeatedly. Watch price climb (₹~480 → ₹999), radius shrink (27km → 0), discount drop (8% → 0%) until it reaches the Return Center.
4. **(Optional) Sign in as Ishaan (Noida)** → Float Deals → the Mumbai item is correctly absent.
5. **ReList demo (Rahul):** Marketplace → ReList → List Product → upload photo → "Analyze with AI" → Nova grades + Health Card with QR.

---

## 8. AWS Resources (do not re-provision)

| Resource | Value |
|---|---|
| AWS Account ID | 720800607906 |
| Region | ap-south-1 |
| Credentials | `~/.aws/credentials` or env vars (not in repo) |
| S3 images | `reroute-item-images-720800607906` |
| S3 health cards | `reroute-health-cards-720800607906` |
| Bedrock grading + health card | `apac.amazon.nova-lite-v1:0` |
| RDS endpoint | `reroute-db.cbqqm40c6trt.ap-south-1.rds.amazonaws.com:5432` |
| RDS DB / user / pw | `reroute` / `postgres` / `ReRoute2026!` |

---

## 9. Database Schema Changes (this session)

Added via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`:
- `floating_discounts.hub_lat FLOAT`, `floating_discounts.hub_lng FLOAT` — precise location for radius filtering
- `hub_checkpoints.lat FLOAT`, `hub_checkpoints.lng FLOAT` — checkpoint coords for advancement
- `health_cards`: `condition_summary`, `usage_estimate`, `care_recommendation`, `seller_usage_description`, `qr_code_base64` (earlier session)

Anchor row: `items.RELIST_SCRATCH` — FK anchor for ReList gradings (do not delete).

---

## 10. How to Run

```powershell
# Backend (Terminal 1) — use python (Python 3.13 at C:\Python313, all deps installed)
cd d:\amazonHackOn\backend
$env:DATABASE_URL="postgresql://postgres:ReRoute2026!@reroute-db.cbqqm40c6trt.ap-south-1.rds.amazonaws.com:5432/reroute"
$env:AWS_DEFAULT_REGION="ap-south-1"
$env:PYTHONPATH="d:\amazonHackOn\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
# NOTE: --reload is unreliable on Windows for picking up changes. Hard-restart
# the process after backend edits to be safe.

# Frontend (Terminal 2)
cd d:\amazonHackOn\frontend
npm run dev   # → http://localhost:3000 (Vite proxy forwards /api → :8000)

# Tests
cd d:\amazonHackOn\backend
$env:PYTHONPATH="d:\amazonHackOn\backend"; $env:DATABASE_URL="sqlite:///:memory:"
python -m pytest tests/ -q   # 89 passing

# Full demo reseed (if needed)
python -m app.db.seed_demo --reset
```

---

## 11. Economic Model (unchanged, reference)

```
D_remaining = cost_per_km × distance_to_RC_km
radius      = D_remaining / cost_per_km            (capped at 50km)
price       = MRP − min(D_remaining, MRP − COGS)
MRP = original_price × 0.85   (COGS 0.55, margin 0.30, delivery 0.15)
```
Price rises and radius shrinks as the item nears the Return Center. Routing pre-filters: Poor→recycle, Like New+≥₹2000→Amazon Renewed, confidence<85%→standard return, overhead<7%→standard return, else→floating discount.

---

## 12. Known Gaps / Notes

- **Backend `--reload` flaky on Windows** — hard-restart the uvicorn process after edits.
- **Float card images**: deals carry no image URL → frontend uses `CATEGORY_IMAGE_MAP` fallback stock photos. Names/prices/discounts are real.
- **Seeded vs live listings**: seeded listings (from `seed_demo.json`) have no hub_lat/lng → location filter falls back to `HUB_ZONES` coords or includes by default. Live return listings have precise coords.
- **`/card/[uuid]`**: backend `GET /api/health-card/{uuid}` exists; no frontend page renders it yet (QR target).
- **Tests**: 89 passing (`tests/test_routing_service.py`, `test_grade_service.py`, `test_health_card_service.py`, `test_api_routes.py`).
