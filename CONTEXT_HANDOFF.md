# ReRoute — Agent Context Handoff
### Amazon HackOn '26 · Theme 3: Products Without a Second Chance
*Last updated: 15 June 2026 — Return → Float deals verified. Reroute logic working end-to-end. Print diagnostics added to evaluate_route.*
**Git branch: `main`**

---

## 1. Current State Summary

**Backend fully working. Frontend merged (Vite+React Amazon clone). All 3 demo flows wired. Return → Float deal cascade confirmed working (verified with live console trace). C2C listings persisted in DB. S3 images via presigned URLs. ReList items add to cart.**

| Area | Status |
|---|---|
| Backend — 13 endpoints | ✅ 100% working, all live-tested |
| Database — 136 seed rows | ✅ RDS seeded, all FK relationships intact |
| AWS Bedrock (Nova) | ✅ Live grading + health card prose |
| AWS Rekognition | ✅ Live CV labels |
| S3 image storage | ✅ UUID-keyed, delete-before-insert |
| Frontend — Amazon.in clone UI | ✅ Vite+React 19, Tailwind v4, 17 components |
| Frontend → Backend wiring | ✅ Float Deals (GET /api/deals), ReList grading (POST /api/grade), ReRoute intercept modal (POST /api/evaluate-route) |
| Health Card in frontend | ✅ GradingCard + HealthCardView components in Tailwind |
| **Seller Accountability System** | ✅ Phase 3 built — identity gate, declaration form, confidence threshold review, seller trust score |
| Admin Review Queue | ✅ GET/PATCH /api/admin/review-queue + AdminReviewView.tsx |
| Transaction Rating | ✅ POST /api/transactions/{id}/rate |
| Seller Trust Score | ✅ trust_score + trust_score_count on Items, shown in HealthCardView + AdminReviewView |
| **C2C Listings (DB-persistent)** | ✅ New `c2c_listings` table (15 seeded rows). `GET /api/listings` + `POST /api/listings`. Survives refresh. Shared marketplace across all personas. |
| **S3 Presigned URLs** | ✅ Images stored as raw S3 keys. Presigned URLs (7-day expiry) generated on read. |
| **s3_keys in GradeResponse** | ✅ `POST /api/grade` returns `s3_keys` + `s3_urls` so frontend can persist actual S3 references. |
| Green Credits + Sustainability Badge | ✅ GreenCreditsCard (credits, CO₂ saved, tier badge) + SustainabilityBadge (♻ Eco Choice on all marketplace cards) |
| Purchased items removed from marketplace | ✅ Float + ReList items both disappear from marketplace after checkout |
| Chat system | ❌ Removed — Negotiate Peer Deal, chat modal, triggerSellerChat, all gone |
| ReList → Add to Cart | ✅ ReList items add to cart normally (handlePurchaseRelistItem) |
| UI cleanup | ✅ No surplus/escrow/discount stickers. LIVE ORDERS. Clean brutalist style |
| Secure Locker Swap | ❌ Removed |
| `/card/[uuid]` public page | ❌ No frontend route yet |
| Demo video | ❌ Not recorded |

---

## 2. Frontend-Backend Wiring Map

### What's Connected (real API calls, no mocks)

| Frontend Component | Backend Endpoint | Trigger | Status |
|---|---|---|---|
| `MarketplaceView` (Float tab) | `GET /api/deals` | Page mount (`useEffect`) | ✅ Live — shows 10 seed deals |
| `MarketplaceView` (ReList tab) | `POST /api/grade` → `POST /api/health-card` | "Analyze with AI" button | ✅ Live — Nova grades image, generates health card |
| `YourOrdersView` (Return button) | `POST /api/evaluate-route` | "Confirm Return" button | ✅ Live — shows ReRoute intercept modal if `entered_reroute` |
| `GradingCard` component | (renders `GradingReport`) | Displays after grade API | ✅ Tailwind-adapted |
| `HealthCardView` component | (renders `HealthCard`) | Displays after health card API | ✅ Tailwind-adapted, shows QR code |

### What's Still Static/Unwired

| Component | Current State | What It Needs |
|---|---|---|
| `Header`, `HeroCarousel`, `BentoContainer` | Static catalog (17 hardcoded products in `products.ts`) | None — homepage UI only |
| `CartDrawer` | Local state only | Would need `POST /api` checkout in production |
| `YourAccountView` | Session state, hardcoded wallet | Reads from `session` prop (controlled by `App.tsx`) |
| `SearchResultsView` | Static product grid | None — catalog UI, not ReRoute-specific |
| `ProductDetailModal` | Static detail view | None |
| `MockSignIn` | Mock auth (no real auth) | None — demo only |
| Float deal images | `CATEGORY_IMAGE_MAP` (dummyjson CDN) | Replace with real Amazon.in m.media-amazon.com CDN URLs |
| Compatibility check (S3) | Backend built, frontend not wired | `POST /api/grading/check-compat` exists but no UI hook |
| ReList listing submission | Creates listing in local state only | No backend endpoint to persist C2C listings |

### Loose Connections (field name mismatches resolved)

| API Field | Frontend Mapping | Resolution |
|---|---|---|
| `DealItem.current_sale_price_inr` | `price` (card display) | Mapped in `useEffect` transform |
| `DealItem.original_price_inr` | `originalPrice` | Mapped |
| `DealItem.discount_pct` | `discount` | Used directly for glow accent color |
| `DealItem.listing_id` | `id` | Mapped |
| No `image_url` in DealItem | `CATEGORY_IMAGE_MAP[category]` | Fallback per category |
| No `rating/reviewCount` in DealItem | Generated random 4-5 stars | Acceptable for demo |

---

## 3. AWS Resources (do not re-provision)

| Resource | Value |
|---|---|
| AWS Account ID | 720800607906 |
| Region | ap-south-1 |
| IAM User | `reroute-backend` |
| Credentials | In `.env` file at project root |
| S3 images bucket | `reroute-item-images-720800607906` |
| S3 health cards bucket | `reroute-health-cards-720800607906` |
| Bedrock grading | `apac.amazon.nova-lite-v1:0` |
| Bedrock health card | `apac.amazon.nova-lite-v1:0` |
| RDS identifier | `reroute-db` |
| RDS port / DB / User / PW | `5432` / `reroute` / `postgres` / `ReRoute2026!` |
| RDS security group | `reroute-rds-sg` — port 5432 open 0.0.0.0/0 |

---

## 4. API Endpoints

| Method | Path | Notes |
|---|---|---|---|
| GET | `/` | Health check |
| POST | `/api/grade` | Multipart: `images` (File[]), `item_id`, `original_price_inr`, `category`, `product_name`, `flow` ("return" or "relist") |
| POST | `/api/evaluate-route` | JSON: `{ item_id, original_price_inr, category, current_location: { hub_id, distance_to_home_warehouse_km }, ring_index? }` |
| GET | `/api/deals` | Query: `?hub_id=` (optional filter) |
| POST | `/api/health-card` | JSON: `{ item_id, seller_id, seller_name, seller_city, seller_usage_description? }` |
| GET | `/api/health-card/{uuid}` | Path param — returns stored health card |
| POST | `/api/returns/submit` | Return item → evaluate route |
| GET | `/api/admin/review-queue` | Admin: list pending reviews |
| PATCH | `/api/admin/review-queue/{card_uuid}` | Admin: approve/reject |
| POST | `/api/transactions/{id}/rate` | Rate seller trust score |
| GET | `/api/listings` | Fetch all C2C listings with health card hydration + presigned image URLs |
| POST | `/api/listings` | Create C2C listing. Stores raw S3 keys (extracted from full URLs). |

---

## 5. Database State (after `python -m app.db.seed_demo --reset`)

| Table | Rows |
|---|---|
| items | 38 (30 products + 8 personas) |
| grading_reports | 30 |
| floating_discounts | 10 |
| hub_checkpoints | 40 |
| health_cards | 12 |
| c2c_listings | 15 (10 with health cards, 5 without) |
| transactions | 6 |
| abuse_flags | 0 |

---

## 6. Personas

| ID | Name | Role | Scenario |
|---|---|---|---|
| USER_PRIYA | Priya Sharma | Returner | Nike shoes — Return Center → floating discount |
| USER_RAHUL | Rahul Mehta | C2C Seller | Baby monitor — ReList → health card |
| USER_ARUL | Arul Kumar | Buyer | Buys Nike shoes + Air fryer via Deals |
| USER_KAVYA | Kavya Iyer | Buyer | Buys baby monitor via ReList |
| USER_VIKRAM | Vikram Joshi | Seller | iPhone 15 owner — compatibility prevention (S3) |
| USER_MEERA | Meera Nair | Returner | High return rate (18%) — borderline, not flagged |
| USER_KARAN | Karan Malhotra | Buyer | Power buyer — 3 completed transactions |
| USER_SNEHA | Sneha Deshmukh | Seller | C2C queen — 4 listings (Puma, boAt, PE shirt, blazer) |
| USER_ANANYA | Ananya Patel | Buyer | Andheri East buyer — proximity-based deal proof |
| USER_ISHAAN | Ishaan Kapoor | Power Seller | Default persona — 3 relist items, 2 orders |

---

## 7. How to Run (WSL / Linux)

### Prerequisites

```bash
# One-time: install dependencies
cd /mnt/c/Users/Aryan\ Datt/Desktop/Aryan/hackathon/amazonHackOn/ReRoute/backend
pip install -r requirements.txt

cd /mnt/c/Users/Aryan\ Datt/Desktop/Aryan/hackathon/amazonHackOn/ReRoute/frontend
npm install
```

### Seed the Database (first time only)

```bash
```

### Run Backend (Terminal 1)




### Run Frontend (Terminal 2)

```bash
cd /mnt/c/Users/Aryan\ Datt/Desktop/Aryan/hackathon/amazonHackOn/ReRoute/frontend
npm run dev
# → http://localhost:3000
# Vite proxy auto-forwards /api/* → localhost:8000
```

### Run Tests

```bash
cd /mnt/c/Users/Aryan\ Datt/Desktop/Aryan/hackathon/amazonHackOn/ReRoute/backend
export AWS_DEFAULT_REGION="ap-south-1"
export PYTHONPATH="$(pwd)"
python -m pytest tests/ -v --tb=short
```

### Important: Use Single Quotes for DATABASE_URL

The password contains `!` which bash interprets as history expansion. Always use single quotes:
```bash
export DATABASE_URL='postgresql://postgres:ReRoute2026!@reroute-db.cbqqm40c6trt.ap-south-1.rds.amazonaws.com:5432/reroute'
```

---

## 8. Frontend File Map (post-merge)

```
frontend/
├── .env                          # VITE_API_URL=http://localhost:8000
├── index.html                    # Vite entry
├── package.json                  # Vite + React 19 + Tailwind v4 + Motion
├── vite.config.ts                # API proxy: /api → localhost:8000
├── src/
│   ├── main.tsx                  # React entry
│   ├── App.tsx                   # View router (landing/search/orders/account/marketplace)
│   ├── index.css                 # Tailwind v4 @theme — Amazon colors
│   ├── types.ts                  # Product, CartItem, Order, CarouselBanner
│   ├── vite-env.d.ts            # Vite client type reference
│   ├── lib/
│   │   ├── api.ts               # 5 endpoint wrappers (grade, evaluateRoute, getDeals, generateHealthCard, getHealthCard)
│   │   └── types.ts             # Pydantic-matched TS interfaces (GradingReport, RoutingResult, DealItem, HealthCard, Defect)
│   ├── data/
│   │   └── products.ts          # INITIAL_PRODUCTS (17), CATEGORY_IMAGE_MAP, CAROUSEL_BANNERS
│   └── components/
│       ├── Header.tsx            # Amazon nav bar (with subtle Admin link)
│       ├── HeroCarousel.tsx      # Promo banners
│       ├── BentoContainer.tsx    # Category card grid
│       ├── NavigationBelt.tsx    # Category ribbon
│       ├── SearchResultsView.tsx # Product catalog
│       ├── ProductDetailModal.tsx# Detail view
│       ├── CartDrawer.tsx        # Cart/checkout (includes GreenCreditsCard on success)
│       ├── MockSignIn.tsx        # Mock auth
│       ├── AmazonPayModal.tsx    # Wallet
│       ├── YourOrdersView.tsx    # Orders + ReRoute intercept modal
│       ├── YourAccountView.tsx   # Profile + seller
│       ├── MarketplaceView.tsx   # Float Deals + ReList tabs (API-wired, chat removed, Add to Cart)
│       ├── GradingCard.tsx       # Tailwind-adapted from ReRoute
│       ├── HealthCardView.tsx    # Tailwind-adapted from ReRoute (QR code + trust score)
│       ├── AdminReviewView.tsx   # Admin review queue (approve/reject)
│       ├── GreenCreditsCard.tsx  # Green credits earned + CO₂ saved + tier badge
│       ├── SustainabilityBadge.tsx # ♻ Eco Choice on all marketplace listing cards
│       └── SimulationView.tsx    # Float simulation controls
└── node_modules/
```

### Key files with real API connections

| File | API Calls |
|---|---|
| `MarketplaceView.tsx:175-210` | `getDeals()` on mount → populates Float tab |
| `MarketplaceView.tsx:270-314` | `gradeProduct()` + `generateHealthCard()` → ReList AI evaluation |
| `YourOrdersView.tsx:37-72` | `evaluateRoute()` on return → ReRoute intercept modal |
| `HealthCardView.tsx` | Renders `qr_code_base64` as `<img src="data:image/png;base64,...">` |

---

## 9. Demo Flow Walkthrough

### Scenario 1 — Priya's Return (Float Deal)

1. Open `http://localhost:3000` → Amazon.in landing
2. Click **Marketplace** in navigation ribbon → Float Deals tab
3. Loads 10 deals from `GET /api/deals` (backend seed data)
4. Each card shows: product name, original price, sale price, discount%, ring number, hub name
5. Click a deal → detail view with transit timeline, discount breakdown
6. Click **Capture item into basket** → adds to cart

### Scenario 2 — Rahul's C2C ReList

1. Marketplace → **ReList Peer** tab
2. Click **List Product** → fill form (name, category, price, condition, description)
3. Click **Analyze with AI** → `POST /api/grade` (Nova grades image)
4. Shows real `GradingCard` (condition, confidence, defects, resale band)
5. Automatically calls `POST /api/health-card` → shows `HealthCardView` with QR code
6. QR code renders as base64 PNG image

### Scenario 3 — Return Intercept (ReRoute modal)

1. Click **Returns & Orders** in header → Your Orders
2. Select an order → click **Return or Replace Items**
3. Choose refund reason → click **Confirm Return**
4. `POST /api/evaluate-route` is called
5. If `entered_reroute === true`: ReRoute intercept modal appears showing:
   - Sale price, discount%, profitable radius, ring number, routing reason
6. Click **Accept ReRoute** → return processed with ReRoute path

### Scenario 4 — Compatibility Check (backend exists, frontend not wired)

1. `POST /api/grading/check-compat` accepts `item_id` + `account_id`
2. Checks purchase history for incompatible match (e.g. iPhone 14 case + iPhone 15)
3. Frontend needs to call this before adding to cart — currently static

---

## 10. Seller Accountability System (Phase 3 — Built)

### Overview

The ReList flow now has a seller accountability pipeline: identity verification → declaration → grading → confidence gate → admin review queue. Every seller is scored on trust.

### ReList Flow (Updated)

```
1. User clicks "ReList Peer" tab → sees feed
2. Clicks "List Product" → IDENTITY VERIFICATION GATE
   - Full name, Aadhaar (12 digits), phone (10 digits), confirm checkbox
   - 1.5s spinner → sessionStorage.setItem('reroute_verified', 'true')
   - Persists across browser tabs in same session
3. SELLER DECLARATION FORM (5 mandatory checkboxes):
   - Product is fully functional
   - Never repaired/serviced by third party
   - No hidden defects beyond photos
   - All original accessories present
   - Misrepresentation = account suspension + chargeback
   - All 5 must be checked to proceed
4. Standard listing form (name, category, price, condition, photos)
5. "Analyze with AI" → POST /api/grade → POST /api/health-card
6. CONFIDENCE GATE in backend health_card.py:
   - If confidence < 85% OR manual_review_recommended:
     → review_status = "pending_review"
     → review_reason = "AI confidence X% — below 85% threshold"
     → Item enters admin review queue
   - Else: review_status = "auto_approved"
7. Frontend shows review_status banner:
   - Amber: "Under review. Team will verify within 24 hours"
   - Green: "Listed successfully! AI confidence: X%"
   - "Submit Listing" button locked if pending_review
8. Admin clicks subtle "Admin" link in header → AdminReviewView
   - Table: Product, Seller, Trust, Confidence, Condition, Reason, Action
   - Approve/Reject buttons → PATCH /api/admin/review-queue/{card_uuid}
9. After approval: listing goes live on ReList feed

### New Backend Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/review-queue` | List all health_cards where review_status = "pending_review" |
| PATCH | `/api/admin/review-queue/{card_uuid}` | Body: `{ decision: "approved" | "rejected", note?: str }` → updates review_status |
| POST | `/api/transactions/{transaction_id}/rate` | Body: `{ rating: 1.0-5.0 }` → updates seller trust_score as rolling average |

### New Database Columns

**health_cards table:**
| Column | Type | Default | Purpose |
|---|---|---|---|
| review_status | VARCHAR | auto_approved | auto_approved / pending_review / reviewed_approved / reviewed_rejected |
| review_reason | TEXT | NULL | e.g. "AI confidence 78% — below 85% threshold" |
| declaration_timestamp | TIMESTAMP | NULL | When seller submitted the 5-checkbox form |
| declaration_all_checked | BOOLEAN | FALSE | All 5 declaration checkboxes were checked |

**items table (personas only):**
| Column | Type | Default | Purpose |
|---|---|---|---|
| trust_score | FLOAT | NULL | Rolling average of ratings (null = new seller) |
| trust_score_count | INT | 0 | Number of ratings received |

**c2c_listings table (new — persistent ReList marketplace):**
| Column | Type | Purpose |
|---|---|---|
| id | VARCHAR PK | Listing ID (seed-xxx or user-list-xxx) |
| name | VARCHAR | Product name |
| category | VARCHAR | Category |
| listed_by | VARCHAR | Seller display name |
| location | VARCHAR | Seller city/area |
| asking_price | FLOAT | Listed sale price |
| original_price | FLOAT | Original retail price |
| condition | VARCHAR | Like New / Good / Fair / Poor |
| years_used | VARCHAR | e.g. "6 months" |
| image_url | VARCHAR | Raw S3 key (presigned URL generated on read) |
| uploaded_images | JSON | Array of raw S3 keys |
| video_url | VARCHAR | Optional |
| description | TEXT | Seller description |
| health_card_uuid | VARCHAR | FK to health_cards.card_uuid (nullable) |
| created_at | TIMESTAMP | Listing creation time |

### New Frontend Components

| File | Purpose |
|---|---|
| `src/components/AdminReviewView.tsx` | Internal ops: pending review queue table, approve/reject, trust score column |
| `MarketplaceView.tsx` (updated) | Identity gate (`relistPage = 'identity'`), declaration form (`relistPage = 'declaration'`), review_status banner after health card |
| `HealthCardView.tsx` (updated) | Seller trust score display: ⭐ rating + count, or "NEW SELLER" badge |
| `Header.tsx` (updated) | Subtle gray "Admin" link between Marketplace and Returns |
| `App.tsx` (updated) | `currentView = 'admin'` routing, onOpenAdmin prop |

### Seller Trust Score

- Stored on `items` table (persona-type rows): `trust_score` (float, null), `trust_score_count` (int)
- Updated via `POST /api/transactions/{id}/rate`
- Formula: `new_score = ((old_score * count) + rating) / (count + 1)`
- Displayed in HealthCardView as: ⭐ 4.3 (12 ratings) or amber "NEW SELLER" badge
- Displayed in AdminReviewView table alongside seller name; null-score rows flagged as higher risk

### How to Run (unchanged from Section 7)

Everything runs from WSL — never run `npm install` from PowerShell (installs Windows binaries incompatible with WSL).

---

## 11. Known Issues / Quick Fixes

| Issue | Fix |
|---|---|
| `DATABASE_URL` with `!` breaks in bash | Always use single quotes: `export DATABASE_URL='...'` |
| Vite `Bus error` / rollup missing binary on WSL | `npm install` from PowerShell installs Windows binaries incompatible with WSL. Delete node_modules from PowerShell: `Remove-Item -Recurse -Force node_modules`, then `npm install` from WSL only |
| Frontend images not loading for Float deals | `CATEGORY_IMAGE_MAP` uses dummyjson CDN — replace with real Amazon.in CDN URLs |
| ReList form requires file upload | Must select actual image files; the form doesn't allow text-only grading |
| Bedrock Nova rate limits | Nova Lite has 5 RPM — slow down consecutive grading requests |
| CORS errors | Vite proxy handles `/api/*` → no CORS in dev. In production, backend CORS middleware allows all origins |
| Admin view has no auth | Demo only. Add auth middleware before production. #TODO in admin.py |
| New DB columns not in seed_demo.json | New columns (review_status, trust_score, etc.) have sensible defaults in model. Seed data still works. Run `python -m app.db.seed_demo --reset` for updated schema |
| Chat / Negotiate Peer Deal | Removed entirely. ReList items now use "Add to Cart" via handlePurchaseRelistItem. Chat modal, triggerSellerChat, handleSendChatMessage all removed. |
| Purchased items remain in marketplace | Fixed. Float and ReList items both removed from marketplace view after checkout (excludePurchaseIds prop flows from App.tsx handlePlaceOrder). |
| ReList listings not persistent | Fixed. New `c2c_listings` table + `GET/POST /api/listings`. 15 seeded rows. Listings survive refresh. SESSION_LISTINGS removed. |
| User-uploaded images not persistent | Fixed. `POST /api/grade` returns `s3_keys`. Frontend stores raw S3 keys in listing. `GET /api/listings` generates presigned URLs (7-day expiry). |
| Return → Float deal cascade | Verified working. `evaluate_route()` creates a `FloatingDiscount` row when all 4 gates pass (condition ≠ Poor, not Like New+high value, confidence ≥ 0.85, overhead_ratio ≥ 0.07). Console prints active in `routing_service.py` for debugging. |
| Default return reason blocking Float deals | Fixed. Default changed from `'Item defective / doesn\'t work'` to `'No longer needed / bought by mistake'` in `YourOrdersView.tsx:28` — avoids matching the `return_reason` filter keywords. |
| `return_reason` floating_discount column | Added to `floating_discounts` model. `POST /api/initiate-return` accepts + stores it. `GET /api/deals` excludes returns matching "defective/not working/broken/damaged" keywords. |
