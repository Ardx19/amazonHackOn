# ReRoute — Project Status

> **Last updated**: Solo night session — foundation layer + grade_item + route_evaluator complete.
> **Next**: health_card lambda (P1), then app.py (P3).
> **Ask me nothing** — read the CONNECTORS.md files.

---

## FILE STATUS

| File | Status | Owner |
|---|---|---|
| `lambdas/shared/config.py` | ✅ COMPLETE | Solo night session |
| `lambdas/shared/models.py` | ✅ COMPLETE | Solo night session |
| `lambdas/shared/db.py` | ✅ COMPLETE | Solo night session |
| `lambdas/shared/CONNECTORS.md` | ✅ COMPLETE | Solo night session |
| `seed/products.json` | ✅ COMPLETE | Solo night session |
| `seed/trajectories.json` | ✅ COMPLETE | Solo night session |
| `seed/personas.json` | ✅ COMPLETE | Solo night session |
| `seed/seed_dynamodb.py` | ✅ COMPLETE | Solo night session |
| `lambdas/grade_item/CONNECTORS.md` | ✅ COMPLETE | P1 (solo night) |
| `lambdas/route_evaluator/CONNECTORS.md` | ✅ COMPLETE | P2 (solo night) |
| `lambdas/health_card/CONNECTORS.md` | ✅ PLACEHOLDER | Handoff to P1 |
| `lambdas/grade_item/lambda_function.py` | ✅ COMPLETE | P1 |
| `lambdas/grade_item/test_local.py` | ✅ COMPLETE | P1 |
| `lambdas/grade_item/requirements.txt` | ✅ COMPLETE | P1 |
| `lambdas/route_evaluator/lambda_function.py` | ✅ COMPLETE | P2 |
| `lambdas/route_evaluator/test_local.py` | ✅ COMPLETE | P2 |
| `lambdas/route_evaluator/requirements.txt` | ✅ COMPLETE | P2 |
| `lambdas/health_card/lambda_function.py` | 🔲 NOT STARTED | P1 — START HERE |
| `lambdas/health_card/lambda_function.py` | 🔲 NOT STARTED | P1 |
| `app.py` | 🔲 NOT STARTED | P3 — START HERE |
| `requirements.txt` | 🔲 NOT STARTED | Anyone |
| `.streamlit/config.toml` | 🔲 NOT STARTED | P3 |

---

## WHAT P1 SHOULD BUILD FIRST (grade_item lambda)

1. Read `lambdas/grade_item/CONNECTORS.md`
2. Read `lambdas/shared/CONNECTORS.md` — every export you need is listed
3. Build `lambdas/grade_item/lambda_function.py`:
   - Rekognition DetectLabels → feature extraction
   - Bedrock Claude 3.5 Sonnet + Vision → condition grading
   - JSON extraction fallback (handles markdown fences)
   - Returns a `GradingReport` Pydantic model
4. Test on the 10 demo products in `seed/products.json`
5. **The grading prompt is the most important string in the entire project.** See architecture-v2-final.md for the template.

## WHAT P2 SHOULD BUILD FIRST (route_evaluator lambda)

1. Read `lambdas/route_evaluator/CONNECTORS.md`
2. Read `lambdas/shared/CONNECTORS.md` — every export you need is listed
3. Build `lambdas/route_evaluator/lambda_function.py`:
   - MVSP = V_graded − C_remaining
   - 5-path routing tree (amazon_renewed, reroute_deals, relist, donate, recycle)
   - Floating discount trajectory calculator
   - Radius expansion logic
4. Test against seed trajectory data in `seed/trajectories.json`

## WHAT P3 SHOULD BUILD FIRST (app.py)

1. Read `lambdas/shared/CONNECTORS.md` — models, config, db
2. Build `app.py` with multi-tab layout:
   - Tab 1 — Return Center (upload photos → grade)
   - Tab 2 — ReRoute Deals Marketplace (floating discount cards + price trajectory chart)
   - Tab 3 — ReList C2C (seller upload → grade → health card + QR → listing)
3. Use `st.session_state` for state, `st.spinner()` during grading, `st.plotly_chart()` for trajectory

---

## BLOCKERS (none)

No blockers discovered during this session. All imports resolve. Seed script is ready to run once AWS credentials are configured and DynamoDB is accessible.

---

## KEY CONSTANTS (at a glance)

| Constant | Value |
|---|---|
| AWS Region | ap-south-1 (Mumbai) |
| Bedrock Grading Model | `anthropic.claude-3-5-sonnet-20241022-v2:0` |
| Bedrock Pricing Model | `amazon.nova-lite-v1:0` |
| DynamoDB Tables | 7 tables, all prefixed `ReRoute_` |
| Condition Grades | Like New (0.85), Good (0.60), Fair (0.35), Poor (0.15) |
| Route Paths | amazon_renewed, reroute_deals, relist, donate, recycle |
| Renewed Min Value | ₹2000 |
| Demo Hubs | MUM_H1 (Andheri), MUM_H2 (Thane), MUM_H3 (Kalyan), MUM_W (Bhiwandi Warehouse) |

---

## SEED DATA SUMMARY

- **10 products** across 5 categories (₹299 – ₹8999)
- **3 trajectory products**: Priya's shoes (Good, ₹599), Rahul's baby monitor (Good, ₹2499), phone case (Fair, ₹349)
- **3 personas**: Priya (returner), Rahul (seller), Ananya (buyer)
- **3 trajectories**: Each has 4 checkpoints (H1 → H2 → H3 → W) with decreasing C_remaining
- **3 floating discounts**: Active at MUM_H1 with full price trajectory pre-calculated
