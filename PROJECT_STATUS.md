# ReRoute -- Project Status

> **Last updated**: V3 refactor complete. Lambda/DynamoDB/Streamlit layer fully migrated to FastAPI/PostgreSQL.
> **Next**: Frontend (Next.js), then deployment.

---

## FILE STATUS

### Backend (`backend/`) -- NEW

| File | Status |
|---|---|
| `app/core/config.py` | Done (refactored from v2, Nova Lite swap, DATABASE_URL added) |
| `app/schemas/schemas.py` | Done (8 Pydantic models + request/response schemas) |
| `app/db/database.py` | Done (SQLAlchemy engine + session) |
| `app/db/models.py` | Done (7 ORM models, FK constraints) |
| `app/db/seed.py` | Done (reads existing seed/*.json) |
| `app/api/routes/grade.py` | Done (POST /api/grade) |
| `app/api/routes/routing.py` | Done (POST /api/evaluate-route + GET /api/deals) |
| `app/api/routes/health_card.py` | Done (POST /api/health-card) |
| `app/services/grade_service.py` | Done (refactored from grade_item lambda) |
| `app/services/routing_service.py` | Done (refactored from route_evaluator lambda) |
| `app/services/health_card_service.py` | Done (Claude 3.5 + QR) |
| `app/main.py` | Done (FastAPI app, CORS, routers) |
| `requirements.txt` | Done |
| `Dockerfile` | Done |
| `apprunner.yaml` | Done |

### Lambda (`lambdas/`) -- KEPT / DEPRECATED

| File | Status |
|---|---|
| `cron/advance_rings.py` | Done (only Lambda kept from v2) |
| `shared/config.py` | DEPRECATED -- migrated to backend/app/core/config.py |
| `shared/models.py` | DEPRECATED -- migrated to backend/app/schemas/ + backend/app/db/ |

### Seed Data (`seed/`) -- UNCHANGED

| File | Status |
|---|---|
| `products.json` | Done (10 products, unchanged from v2) |
| `trajectories.json` | Done (3 trajectories, unchanged from v2) |
| `personas.json` | Done (3 personas, unchanged from v2) |

### Frontend (`frontend/`) -- NOT STARTED

| File | Status |
|---|---|
| Next.js 14 App Router | Not started |

### Docs

| File | Status |
|---|---|
| `README.md` | Done (updated for v3) |
| `PROJECT_STATUS.md` | Done (updated) |
| `FUTURE_IDEAS.md` | Done (unchanged) |
| `docs/plans/2026-06-13-001-feat-reroute-v3-migration-plan.md` | Done |

### Deleted (v2 Lambda artifacts)

| File | Reason |
|---|---|
| `lambdas/grade_item/` (4 files) | Refactored into `backend/app/services/grade_service.py` + `grade.py` route |
| `lambdas/route_evaluator/` (4 files) | Refactored into `backend/app/services/routing_service.py` + `routing.py` route |
| `lambdas/shared/db.py` | DynamoDB CRUD replaced by SQLAlchemy |
| `lambdas/shared/CONNECTORS.md` | Replaced by OpenAPI auto-docs |
| `seed/seed_dynamodb.py` | Replaced by `backend/app/db/seed.py` |
| All `CONNECTORS.md` files | Replaced by OpenAPI auto-docs at `/docs` |

---

## Key Changes Summary

| What | v2 | v3 |
|---|---|---|
| Grading model | Claude 3.5 Sonnet | Nova Lite (faster, cheaper) |
| Database | DynamoDB (7 tables) | PostgreSQL + SQLAlchemy (7 tables, FK constraints) |
| API layer | Lambda + API Gateway | FastAPI on App Runner |
| Docs | CONNECTORS.md files | OpenAPI auto-docs at `/docs` |
| Health Card AI | (not in v2) | Claude 3.5 Sonnet (prose quality) |
| QR Code | -- | Python qrcode in FastAPI |
| Cron | -- | Lambda `advance_rings.py` |

**Zero business logic changes**: All formulas, thresholds, multipliers, prompts, and boto3 call patterns are identical to v2.
