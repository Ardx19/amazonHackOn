# Amazon HackOn '26 — Full Context Handoff Document
### Amazon ReRoute · Theme 3: Products Without a Second Chance
*This document captures all decisions, product design, architecture, and status from the strategy session. Start here.*

---

## 1. Hackathon Metadata

- **Event:** Amazon HackOn '26 — top 300 qualified teams
- **Build window:** 13 June 00:00 → 14 June 23:59 (48 hours)
- **Submission deadline:** 15 June 23:59
- **Deliverables required:** PRD + Demo Video + Working Prototype (deployed via Unstop)
- **IDE:** Amazon Kiro (pair programmer credits provided)
- **AWS budget:** $100 credits
- **Team:** 3 members · strong ML/DL background · one member has done collaborative filtering properly · web-first preference · Indian context

---

## 2. Scoring Rubric (Verbatim from Amazon)

These four pillars are the only thing that matters. Every decision traces back to them.

**1. Quality of Presentation**
- Clear story: what problem, why, impact — woven into a narrative
- Always start with WHY. WHO is the customer, what problem, why important for Amazon, what ROI does Amazon get
- Clarity, storytelling, communicating complex ideas simply

**2. Quality of Implementation**
- Working prototype, code quality, UX polish. NO slide deck.
- Solving 1 piece end-to-end beats 4 pieces partially. The 1 complete piece scores higher.

**3. Technical Architecture**
- Architecture diagram that scales to millions of users
- Scalability, system design decisions, systems thinking are critical

**4. Futuristic Vision**
- Roadmap beyond hackathon, innovation, think big
- Customer is at the center. Work backwards from the customer.

**What Amazon looks for:** Problem solving · Rapid prototype building · Ability to leverage AI tools · Collaboration

**What helps:** Strong coding + system design fundamentals · Innovation & AI fluency

---

## 3. Theme and Problem Statement

**Selected: Theme 3 — "Products Without a Second Chance" / Intelligent Bridge**

Amazon's four pillars for this theme:
- 01 AI Grading: instant condition assessment through image analysis, under 2 seconds per item
- 02 Smart Routing: millisecond decisions — resell as-is, refurbish, peer-to-peer exchange, or donate
- 03 Trust Layer: "Product Health Card" so the next buyer knows exactly what they're getting
- 04 Prevention: predict returns before they happen

**Amazon's personas (use verbatim in pitch):**
- **Priya:** Returns ₹500 shoes — 600km trip back to warehouse. Costs more to re-list than they're worth. Liquidated. → Cost > Value = Written off
- **Rahul:** Baby monitor works perfectly. Won't list on classifieds — strangers, haggling, doorstep visits. It sits in a drawer. → 50 parents nearby want it
- **Small Seller:** 200 returns/month marked "didn't match." All fine. Manually inspects, guesses price, re-photographs on phone. → Needs AI, not better logistics

**Why this theme was chosen:**
- Amazon literally wrote the customer story (Priya, Rahul, Small Seller with ₹ values)
- Direct Amazon ROI in rupees — every sold item = recovered margin + logistics saved
- Lower competition density (~40–80 teams vs 100–130 on other themes)
- Genuine technical depth: CV + routing = real systems work, not LLM wrapper
- Collaborative filtering expertise of the team maps directly to Smart Routing
- Bezos-grade vision: "every product finds its next best owner"

---

## 4. Product: Amazon ReRoute

**One-liner:** Amazon ReRoute turns every returned, unused, or outgrown product into a marketplace opportunity — recovering maximum value at every point in the return journey.

**The core insight:** Every returned item has a "value recovery window." The longer it travels back to the source warehouse, the more logistical cost eats into its recoverable value. ReRoute front-runs that decay — it tries to sell the item *while it's in transit*, at the point where the logistics savings are largest, passing those savings to a nearby buyer as a discount.

### The Three Scenarios ReRoute Addresses

**Scenario 1 — Customer Return (Priya)**
- Priya initiates return → uploads 2–3 photos → AI grades instantly → system calculates floating discount
- Item still travels back through normal return route (Hub H1 → H2 → H3 → Source Warehouse W)
- While in transit, item is listed on ReRoute Deals tab with floating discount visible to buyers near each hub
- Discount is largest at H1 (farthest from warehouse), shrinks as item approaches W
- If a buyer purchases: item ships from current hub. If nobody buys: item reaches warehouse as normal

**Scenario 2 — Unused/Outgrown Item (Rahul)**
- Rahul opens "Sell with ReList" → uploads 2–3 photos → AI grades → Health Card generated → price suggested
- Listing appears on ReList (C2C) tab
- Buyer purchases via Amazon Pay (escrow) → Amazon Flex picks up from Rahul's door → delivers to buyer
- Funds released to Rahul only after buyer confirms receipt

**Scenario 3 — Small Seller (parked for now, implement if time permits)**
- Seller receives 200 returns/month → uploads photos → AI grader suggests condition grade + price
- Eliminates 50 staff-hours/month of manual inspection
- Output goes back to main Amazon catalog as "Used — Good · ₹X (Amazon AI-graded)"

---

## 5. The Floating Discount Mechanism (Core Innovation)

### The Formula

```
At each hub checkpoint H_i:

V_graded    = condition_multiplier × P_original
              (Like New: 0.85 · Good: 0.60 · Fair: 0.35 · Poor: 0.15)

C_remaining = logistics cost from H_i to source warehouse W

MVSP (Minimum Viable Sale Price) = V_graded − C_remaining

Discount % = (P_original − MVSP) / P_original × 100
```

As item moves toward W: C_remaining decreases → MVSP increases → price rises → discount shrinks.

### Example (₹599 shoes, V_graded = ₹359, full C_return = ₹240)

| Checkpoint | C_remaining | Sale Price | Discount | Radius |
|---|---|---|---|---|
| Hub H1 (near Priya) | ₹240 | ₹359 | 40% off | 15km |
| Hub H2 (midpoint) | ₹150 | ₹449 | 25% off | 25km (expanded) |
| Hub H3 (near warehouse) | ₹60 | ₹539 | 10% off | 35km |
| Source W | ₹0 | ₹599 | 0% | — |

### Routing Decision Tree

```
IF condition = "Like New" AND item_value > ₹2000
    → Amazon Renewed (high-value refurbishment)
ELSE IF condition IN ["Good", "Fair"] AND MVSP > 0
    → ReRoute Deals (Sc.1) OR ReList (Sc.2)
ELSE IF condition IN ["Good", "Fair"] AND MVSP ≤ 0
    → Donate
ELSE IF condition = "Poor"
    → Recycle / Destroy
```

### Radius Logic
- **Demo (Tier 1):** Fixed initial radius 15km, expands 10km every 24h without a sale. Max 50km then donate/recycle.
- **PRD (Tier A):** Logistics-cost radius — max distance where delivery still saves vs continuing return
- **PRD (Tier B):** Demand-density radius — tighter in high-density areas, wider in sparse ones

---

## 6. All Locked Decisions

| Decision Point | Locked Answer |
|---|---|
| Priya's refund | Unchanged. Existing Amazon policy. Issued immediately on return acceptance. Experience identical to today. |
| Item movement | Continuous transit (Behaviour B). Item keeps moving on normal return route. Ships from current hub when purchased. |
| Radius logic | Option C for demo: fixed + time-expansion. Options A & B in PRD as production refinements. |
| Profitability formula | `MVSP = V_graded − C_remaining`. Donate if MVSP ≤ 0 and Good/Like New. Recycle if Poor. |
| C2C delivery | Amazon Flex pickup from seller's door. Leveraging existing Amazon delivery network. |
| Small seller (Sc.3) | Parked. Implement if time remains after Sc.1 and Sc.2 are complete. |
| Buyer urgency timer | Yes — "Price increases in ~18h as item moves to next hub" on every ReRoute Deal listing |
| Priya bonus credit | No. Would reward returning behaviour. |
| High-value routing | Like New + value > ₹2000 → Amazon Renewed (implicit in decision tree) |
| C2C price freedom | Seller sets price within ±20% of AI suggestion band |
| Grading photos | 2–3 photos. Single photo for MVP if time constrained. Multi-image is PRD. |
| Health Card | Web page at /card/[uuid]. QR code generated. Immutable — seller cannot edit. |

---

## 7. AI Grader — How It Actually Works

**Not a custom CV model. A well-engineered prompt sent to a multimodal foundation model.**

### Pipeline

```
User uploads photo → S3 (pre-signed URL)
        ├── Rekognition DetectLabels    (~300ms) → instant category pre-warm on UI
        ├── Rekognition DetectModeration (~300ms) → PII/unsafe content gate
        └── Bedrock Nova Lite (stream)  (~2000ms) → full grading JSON
```

Both Rekognition and Bedrock fire simultaneously (parallel calls). Rekognition result shown immediately on UI while Bedrock streams in — perceived latency ~0.3s.

### Bedrock Prompt Template (use this exactly)

```python
prompt = """
You are an Amazon return-grading AI. Analyze the attached image of a
returned/used product and output strict JSON only:

{
  "product_category": "<broad category>",
  "product_subcategory": "<specific>",
  "brand_guess": "<brand or null>",
  "model_guess": "<model or null>",
  "condition_grade": "<Like New | Good | Fair | Poor | Damaged>",
  "defects": [{"type": "...", "severity": "minor|moderate|major", "location": "..."}],
  "completeness": "<complete | missing_minor | missing_major>",
  "confidence": <0.0-1.0>,
  "estimated_retail_inr": <number or null>,
  "suggested_resale_band_inr": [<low>, <high>],
  "recommended_route": "<resell_as_new | refurbish | p2p_marketplace | donate>",
  "routing_reason": "<one sentence>",
  "sensitive_data_detected": <bool>,
  "manual_review_recommended": <bool>
}

Only respond with the JSON. No prose.
"""
```

### AWS Services Used for Grading

| Service | Call | Why | Cost |
|---|---|---|---|
| Amazon Bedrock Nova Lite | Full grading | Fast multimodal, Amazon-native | ~$0.0006/1K input tokens |
| Rekognition DetectLabels | Pre-warm speed trick | 300ms category labels for instant UI feedback | Free tier (1000/month) |
| Rekognition DetectModerationLabels | Safety gate | PII + unsafe content before listing | Free tier |

**If confidence < 0.72:** set `manual_review_recommended: true`. Show in UI: "91% confidence" (honest = trustworthy).

---

## 8. Product Health Card

Generated automatically at C2C listing creation. **Immutable — seller cannot edit.**

### What It Contains

1. Header: "Amazon Product Health Card" + card ID (e.g., `HC-2026-MUM-4F8A21E9`) + QR code
2. Item identity: AI-detected category, brand, model
3. Condition grade + confidence score
4. Defects list (AI-detected, each with type, severity, location)
5. Item history: purchase date (if Amazon order-linked), owner count, warranty status
6. Seller info: display name, rating, city area, distance — never exact address
7. Trust section: A-to-Z Guarantee (7-day return if item doesn't match card), Amazon Pay escrow, seller rating
8. Price section: asking price vs retail, discount %, delivery method + ETA
9. Footer: card UUID, "Amazon A-to-Z Protected"

### Implementation

- Web page at `/card/[uuid]` — Next.js dynamic route, server-side rendered from PostgreSQL
- QR code: `qrcode.react` client-side, points to card URL
- "Download as PDF": `window.print()` with CSS `@media print` — 20 min of work, add last
- "Share on WhatsApp": deep-link with card URL — Indian context, judges will feel it

### Trust Statement to Show in UI

> *"This report was generated by Amazon's AI — not the seller. The seller cannot edit it."*

---

## 9. Marketplace Structure

**Entry: "ReRoute" tab in Amazon app**

**Tab 1 — ReRoute Deals** (returns in transit, floating discounts)
- Item card: hero photo · condition badge · discount % pill · current price · hub distance · countdown timer
- Urgency banner when < 12h to next hub checkpoint
- Filter: category · distance · price range · condition
- Sort: discount % · distance · time remaining

**Tab 2 — ReList** (C2C individual listings)
- Item card: hero photo · condition badge · price · seller rating · distance · "AI Verified" badge
- Health Card QR visible on every listing
- Amazon Flex delivery badge

---

## 10. Abuse Prevention

### Tier 1 — Structural Rules (Build in 48h)

1. **Same-address block:** FloatingDiscount listing invisible to accounts sharing returner's delivery address. Generated at listing creation, stored as exclusion list.
2. **Same-payment-instrument block:** Purchase blocked if buyer's card/UPI VPA matches original purchaser's payment method.
3. **Category cooldown:** 30-day block — if you return in category C, you cannot buy any ReRoute Deal in category C for 30 days.
4. **Item hard-block:** Specific `item_id` blocked for the returner's household (same address + payment) for duration of its ReRoute listing.

### Tier 2 — Z-score Anomaly Detection (Build in 48h)

```python
from scipy import stats
import numpy as np

def is_anomalous_returner(customer_return_rate: float, category_rates: list[float]) -> bool:
    mean = np.mean(category_rates)
    std  = np.std(category_rates)
    if std == 0:
        return False
    z = (customer_return_rate - mean) / std
    return z > 2.0  # flags top 5% of returners by category

# If flagged: item ineligible for ReRoute Deals → routed to normal return
# No message shown to customer
```

### Tier 3 — ML Fraud Scoring (PRD Roadmap only)

Production: ML classifier integrating all Tier 1/2 signals + return-then-nearby-purchase correlation + velocity checks + graph analysis of connected accounts. Integrates with existing Amazon Pay fraud infrastructure.

### Pitch Answer if Judge Asks About Fraud

> *"The abuse pattern requires a connected party to purchase the item within the return window, at the correct hub, within radius. Rules 1 and 2 — same address and same payment instrument — eliminate most connected-party abuse because households typically share both. For organised rings, the Z-score detector closes the loop: customers returning at > 2σ above category baseline lose ReRoute eligibility entirely. The system is self-correcting — abusers lose access to the very mechanism they're exploiting."*

---

## 11. Technical Architecture

### Stack (All Decisions Final)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS | PWA, mobile-first, deployed on Amplify |
| Backend | FastAPI (Python 3.11) | ML-native, async, App Runner |
| Database | PostgreSQL 15 (RDS t4g.micro) | Single DB, no microservices |
| Object storage | Amazon S3 | Pre-signed URLs for direct upload |
| AI grading | Bedrock Nova Lite (primary), Sonnet fallback | Stream responses, use Nova for speed |
| Pre-warm | Rekognition DetectLabels + DetectModeration | Parallel with Bedrock |
| Maps/Geo | Amazon Location Service | Hub radius map view, free tier |
| Notifications | SES (email) + Web Push | Free tier |
| Auth | JWT magic link | Skip Cognito |
| QR | qrcode.react (frontend) | Browser-side generation |
| Statistics | scipy + numpy | Z-score anomaly |
| Deployment | App Runner (backend) + Amplify (frontend) | One-click deploys |
| Monitoring | CloudWatch billing alarm at $20 | Set on day 1 |

**Estimated total AWS cost for hackathon window: under $20**

### Domain Model

```
Item                — id, category, brand, condition_grade, status, photos[]
ReturnRequest       — id, item_id, returner_id, initiated_at, refund_status
GradingReport       — id, item_id, condition, defects[], confidence, route, graded_at
FloatingDiscount    — id, item_id, current_hub, current_price, discount_pct, radius_km, expires_at
HubCheckpoint       — id, item_id, hub_name, hub_lat, hub_lng, arrived_at, c_remaining
C2CListing          — id, item_id, seller_id, asking_price, status, created_at
HealthCard          — id, item_id, card_uuid, card_url, qr_code_url, generated_at
Transaction         — id, listing_id, buyer_id, amount, status, completed_at
AbuseFlag           — id, account_id, rule_triggered, category, expires_at
CustomerReturnStats — id, customer_id, category, return_rate, z_score, flagged
```

### AWS Architecture Layers

```
Layer 1 — Client
    Next.js PWA · ReRoute Deals tab · ReList tab · Health Card (/card/[uuid])
    ↓ HTTPS
Layer 2 — API
    FastAPI on App Runner · handles grading, routing, listings, health cards, abuse, transactions
    ↓
Layer 3 — AI & Logic (parallel calls)
    Bedrock Nova Lite (grading) | Rekognition (pre-warm + moderation) | Abuse Detector (scipy Z-score)
    ↓
Layer 4 — Data
    PostgreSQL (RDS) · Amazon S3 (images) · Amazon Location Service (geo/radius)
    ↓
Layer 5 — Infra
    App Runner · Amplify · SES · CloudWatch
```

---

## 12. 48-Hour Build Scope

### Build End-to-End (Demo Path)

The single demo flow: **Priya initiates return → uploads photos → AI grades → floating discount created → hub progression → buyer purchases.**

Supplementary demo: **Rahul lists baby monitor → AI grades → Health Card generated → Priya buys via ReList.**

### In Scope (Build)

- AI Grader endpoint (Bedrock + Rekognition, parallel calls, streaming output)
- Return initiation UI with photo upload (pre-signed S3 URL)
- Floating discount calculation + listing creation
- Marketplace with 2 tabs (ReRoute Deals + ReList)
- Hub progression (3 hardcoded waypoints for demo) + countdown timer + urgency signal
- C2C seller listing flow (upload → grade → price → list)
- Product Health Card (web page + QR code)
- Buyer purchase flow (mock Amazon Pay)
- Tier 1 abuse prevention (Rules 1–4)
- Z-score return rate anomaly detection (Tier 2)

### Out of Scope (PRD Roadmap — mention but don't build)

- Real Amazon logistics API integration
- GPS real-time hub tracking
- Amazon Renewed channel routing
- Small seller batch repricing interface
- Demand-density radius calculation
- Priya bonus credit incentive
- ML fraud scoring (Tier 3)
- Multi-image 360° grading
- Physical QR sticker printing
- Defect bounding-box annotation on images

### Scope Cut Priority (if behind at hour 24)

1. First cut: Health Card PDF download (keep web page, drop PDF)
2. Second cut: WhatsApp share button
3. Third cut: Multi-image upload → single photo only
4. Never cut: Grading endpoint, floating discount listing, 2-tab marketplace, one complete demo flow

---

## 13. 48-Hour Team Split (3 people)

| Person | Track | Core Deliverable |
|---|---|---|
| Engineer A | Backend + Bedrock | Grading endpoint · MVSP calculation · FloatingDiscount DB writes · Bedrock streaming · Rekognition parallel call |
| Engineer B | CF / ML | Z-score anomaly detector · Abuse rules implementation · (Optional: CF matching if time) · Synthetic buyer seed data |
| Engineer C | Frontend | Return initiation UI · Marketplace 2 tabs · Listing cards · Health Card page · Urgency timer · QR code display |

**Integration checkpoint: Hour 24** — wire grading output into FloatingDiscount creation. If anything is behind, apply scope cuts.

### Hour-by-Hour Plan

| Hours | Focus |
|---|---|
| 0–4 | AWS setup: RDS provision, S3 bucket, Bedrock access test, App Runner config, Amplify connect, billing alarm |
| 4–12 | Each track builds core: grading endpoint · frontend scaffold + photo upload · DB schema + abuse rules |
| 12–20 | Grading → routing → listing creation wired up · hub progression logic · C2C listing flow |
| 20–28 | Health Card generation · buyer-side listing display · urgency timer · QR code |
| 28–36 | Full end-to-end wire-up · demo data seeding · push notifications |
| 36–42 | Bug bash · polish · demo data freeze · Z-score integration |
| 42–48 | Deploy to App Runner · smoke test · rehearse demo script 5x |
| 48–60 | PRD finalization · architecture diagram finalization |
| 60–72 | Demo video recording (2 people demo, 1 records) · edit · submit |

---

## 14. The Demo Script (60–90 seconds)

**Beat 1 (0–10s):** "Amazon spends billions returning items to warehouses — only to liquidate most of them for pennies. The problem isn't the item. It's that there's no intelligent system to find a buyer *before* the logistics costs eat the value."

**Beat 2 (10–30s):** "Meet Priya. She's returning a pair of shoes. She uploads 3 photos. In 2.5 seconds, our AI grades them: Like New, 91% confidence, ₹359 suggested price. Before pickup is even scheduled."

**Beat 3 (30–50s):** "The item travels back through Amazon's normal return route. But now, it's visible to buyers near every hub along the way — at a discount that's highest when it's closest to Priya, because that's when Amazon saves the most by not shipping it further. *Price increases in 18 hours as it moves to the next hub.* Real urgency — because it's real math."

**Beat 4 (50–70s):** "A buyer 12km from Hub H1 taps buy. The item ships from the hub. It never reaches the warehouse. For Amazon: ₹240 in logistics saved + ₹359 in recovered value + a 5% marketplace fee. Per item. At millions of returns annually, that's a new revenue line."

**Beat 5 (70–90s) — ReList:** "And for Rahul, who has a perfectly good baby monitor in a drawer — ReList. 30 seconds to list, AI-verified Health Card, Amazon Flex delivery, Amazon Pay protection. No strangers. No haggling. That's trust OLX can never offer."

---

## 15. The Amazon ROI Argument (for judges)

**Unit economics per prevented warehouse return:**
- Logistics cost saved: ₹150–300
- Recovery via ReRoute vs liquidation: ₹280 additional
- Amazon marketplace fee (5%): ₹15–110
- **Net benefit per item: ₹300–450**

**Scale:**
- India processes ~500M e-commerce returns/year (estimated)
- 10% ReRoute interception = 50M items
- At ₹350 avg benefit = **₹17,500 crore recovered annually**

**Additional value (non-financial):**
- Every item sold in transit = one fewer item in a landfill
- Circular economy narrative at Amazon scale
- New GMV category (C2C) with zero new inventory cost
- Student/young adult demographic acquisition via ReList

---

## 16. PRD Status

Full PRD written and available as `amazon_reroute_prd.md`. Contains:
- Working-backwards press release
- Full problem statement
- All three customer personas
- Complete feature specs (AI Grader, ReRoute Deals, ReList, Health Card, Abuse Prevention)
- Success metrics with baselines and targets
- In-scope / out-of-scope lists
- Full tech stack with cost estimates
- Domain model
- 12-month roadmap

---

## 17. What to Tell the New Claude Instance

Paste this document and say:

> *"This is the full context for our Amazon HackOn '26 project. We are building Amazon ReRoute for Theme 3. All major decisions are locked. We need help with [specific next task — e.g., writing the grading endpoint code / building the frontend marketplace / setting up the database schema / drafting the demo video script]. Please read the full document before responding."*

**Suggested next tasks depending on where you are:**
- Starting backend: "Write the complete FastAPI grading endpoint including the Bedrock call, Rekognition parallel call, MVSP calculation, and FloatingDiscount DB write"
- Starting frontend: "Build the Next.js marketplace page with the two-tab structure (ReRoute Deals + ReList) and the listing card component"
- Starting DB: "Write the complete PostgreSQL schema for the domain model, including all tables, indexes, and the abuse prevention tables"
- Starting Health Card: "Build the /card/[uuid] Next.js page using the Health Card design"
- Demo prep: "Write the demo video script with exact screen transitions and narration"

---

*Document version: Post-strategy-session · 13 June 2026*
*All decisions locked as of this document. Do not re-open closed decisions.*

