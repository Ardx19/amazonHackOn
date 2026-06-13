# ReRoute

AI-powered returns marketplace. Intercepts returned products mid-transit, grades them via AI, and routes them to the most profitable destination using a cascade auction model.

**Amazon HackOn 2026** — Theme 3: "Products Without a Second Chance"

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router (TypeScript) |
| Backend | FastAPI (Python 3.11) on App Runner |
| Cron | Lambda (ring progression) |
| Database | PostgreSQL 15 on RDS |
| AI Grading | Rekognition + Bedrock Nova Lite |
| AI Health Card | Bedrock Claude 3.5 Sonnet |
| QR Code | Python `qrcode` (server-side PNG) |
| Storage | S3 |
| Deployment | Amplify (frontend) + App Runner (backend) |

## Project Structure

```
ReRoute/
├── backend/                      # FastAPI on App Runner
│   ├── app/
│   │   ├── main.py               # FastAPI app, CORS, router registration
│   │   ├── core/config.py        # All constants, model IDs, thresholds
│   │   ├── schemas/schemas.py    # Pydantic v2 models (API validation)
│   │   ├── db/
│   │   │   ├── database.py       # SQLAlchemy engine + session
│   │   │   ├── models.py         # SQLAlchemy ORM (7 tables, FK constraints)
│   │   │   └── seed.py           # PostgreSQL seeder (reads seed/*.json)
│   │   ├── api/routes/
│   │   │   ├── grade.py          # POST /api/grade
│   │   │   ├── routing.py        # POST /api/evaluate-route + GET /api/deals
│   │   │   └── health_card.py    # POST /api/health-card
│   │   └── services/
│   │       ├── grade_service.py       # AI grading pipeline
│   │       ├── routing_service.py     # Cascade auction routing
│   │       └── health_card_service.py # Health Card + QR generation
│   ├── requirements.txt
│   ├── Dockerfile
│   └── apprunner.yaml
├── lambdas/
│   ├── cron/advance_rings.py     # 24h ring progression (only Lambda kept)
│   └── shared/                   # DEPRECATED — v2 DynamoDB era
├── seed/                         # Unchanged from v2
│   ├── products.json
│   ├── trajectories.json
│   └── personas.json
├── docs/plans/
│   └── 2026-06-13-001-feat-reroute-v3-migration-plan.md
├── README.md
├── PROJECT_STATUS.md
└── FUTURE_IDEAS.md
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/grade` | POST | AI grading — Rekognition + Bedrock Nova Lite |
| `/api/evaluate-route` | POST | Cascade auction routing — MVSP + ring price |
| `/api/health-card` | POST | AI Health Card + QR code — Claude 3.5 Sonnet |
| `/api/deals` | GET | Active marketplace listings |

OpenAPI docs auto-generated at `/docs` when running.

## Cascade Auction Model

5-ring pricing: items listed at deepest discount when farthest from warehouse, price rises as they move closer.

| Ring | Price Floor | Location |
|---|---|---|
| 0 | 0.88x graded value | Customer origin |
| 1 | 0.91x | Nearest hub |
| 2 | 0.93x | Intermediate |
| 3 | 0.95x | Intermediate |
| 4 | 0.97x | Intermediate |
| 5 | 1.00x | Home warehouse |

**Example (Priya's shoes, INR 599, Good)**:
Ring 0: 316 (47% off) -> Ring 1: 327 -> ... -> Home: 359 (40% off)

## Setup

```bash
# Backend
cd backend
pip install -r requirements.txt
DATABASE_URL=postgresql://... uvicorn app.main:app --reload

# Seed data
python -m app.db.seed --reset
```

## What's Built

| Component | Status |
|---|---|
| Backend config + ORM + seed | Done |
| POST /api/grade | Done |
| POST /api/evaluate-route | Done |
| POST /api/health-card | Done |
| GET /api/deals | Done |
| Cron Lambda (ring progression) | Done |
| Frontend (Next.js) | Not started |
| backend/.env | Add DATABASE_URL |
| Alembic migrations | Run alembic init |
| Deployment (App Runner + Amplify) | Connect GitHub |

## Prior Architecture (v2 -- preserved for history)

- `lambdas/shared/config.py` -- DEPRECATED (-> backend/app/core/config.py)
- `lambdas/shared/models.py` -- DEPRECATED (-> backend/app/schemas/ + backend/app/db/)
- Architecture docs: `brainstorming/architecture-v1.md`, `v2.md`, `v2-final.md`, `v3-final.md`
