# Prompt for Next Agent — Amazon ReRoute v3

Paste this entire file as the first message to the next agent session.

---

## Context

You are continuing work on **Amazon ReRoute** for Amazon HackOn '26. This is a
hackathon project (48-hour window, submission deadline 15 June 23:59). We are building
a working demo prototype, not a production system.

**Read these files in order before doing anything:**

1. `CONTEXT_HANDOFF.md` — exact file-by-file status, known bugs, what to do next
2. `amazon_reroute_context_handoff.md` — full product context and all locked decisions
3. `AWS_INTEGRATION_GUIDE.md` — step-by-step AWS wiring guide

**Do not read the plan or architecture files** — all decisions are locked and those
docs are source material for the handoff. The handoff is the single source of truth.

---

## Current state (as of this handoff)

- **Backend**: Fully written. 67 unit tests pass (SQLite, no AWS). Not yet run against
  live AWS. Has 5 known bugs documented in `CONTEXT_HANDOFF.md` §3.
- **Frontend**: Fully written. `npm run build` passes clean. Not yet connected to a
  live backend — currently points to `http://localhost:8000` via `.env.local`.
- **AWS**: Not provisioned. No RDS, no S3 buckets, no Bedrock model access yet.

---

## What to do next (in order — do not skip steps)

### 1. Fix Bug 3 first (it will crash the seed script)

`backend/app/db/seed.py` — `seed_trajectories` calls `Item._new_uuid()`.
`_new_uuid` is a module-level function in `models.py`, not a class method. Replace
all occurrences with `str(uuid.uuid4())`. Add `import uuid` at the top of `seed.py`.

### 2. Fix Bug 4 (QR code never returned to frontend)

`backend/app/schemas/schemas.py` — add `qr_code_base64: Optional[str] = None` to
the `HealthCard` Pydantic model.

`backend/app/services/health_card_service.py` — `generate_health_card` already
generates `qr_b64 = generate_qr_code(card_url)` but never puts it in the returned
`HealthCard`. Add `qr_code_base64=qr_b64` to the `HealthCard(...)` constructor call.

`frontend/components/HealthCardView.tsx` — the `qrBase64` prop is already handled:
if the card has `qr_code_base64`, pass it. Update `relist/page.tsx` to pass
`card.qr_code_base64` to `HealthCardView`.

### 3. Fix Bug 5 (session lifecycle)

In all three route files (`grade.py`, `routing.py`, `health_card.py`):
- Add `from sqlalchemy.orm import Session` and `from fastapi import Depends`
- Change route function signature: `db: Session = Depends(get_db)`
- Remove `db = next(get_db())` and `db.close()` calls from the function body
- Keep `db.rollback()` in the except block — FastAPI will call `db.close()` for you

### 4. Fix Bug 1 (critical — Nova Lite body format)

In `backend/app/services/grade_service.py`, `call_bedrock_vision`:
Test with a real image against live Bedrock. If you get a `ValidationException`,
the current body format (which uses `anthropic_version`) is wrong for Nova Lite.
Switch to Nova Lite's native format (see `AWS_INTEGRATION_GUIDE.md` §3).

### 5. Fix Bug 2 (S3 client in loop)

In `backend/app/api/routes/grade.py`:
Move `s3_client = boto3.client("s3", region_name=AWS_REGION)` to module level.
Remove the boto3 import and client creation from inside the loop.

### 6. Provision AWS resources

Follow `AWS_INTEGRATION_GUIDE.md` §1–§6 in order:
- IAM role
- S3 buckets
- Bedrock model access
- RDS PostgreSQL

### 7. Smoke test locally

```powershell
cd d:\hackon-new\amazonHackOn\backend
$env:DATABASE_URL = "postgresql://postgres:<pw>@<rds-endpoint>:5432/reroute"
$env:AWS_DEFAULT_REGION = "ap-south-1"
$env:PYTHONPATH = "D:\py-pkgs;d:\hackon-new\amazonHackOn\backend"
python -m app.db.seed --reset
python -m pytest tests/ -v  # should still be 67+ passing
uvicorn app.main:app --reload
```

Then test grading with a real shoe image.

### 8. Deploy

- Backend to App Runner (see `AWS_INTEGRATION_GUIDE.md` §6)
- Create `frontend/amplify.yml` (content in `AWS_INTEGRATION_GUIDE.md` §7)
- Deploy frontend to Amplify
- Update `NEXT_PUBLIC_API_URL` to the App Runner URL

### 9. End-to-end demo run

Run the 3-minute demo script from `amazon_reroute_context_handoff.md` §14.
Record a backup video. Check all three flows:
- Priya: Return Center → grade → routing decision → listing on Deals page
- Rahul: ReList → grade → Health Card with QR code
- Buyer: Deals page → Buy Now → confirmation

---

## Hard constraints

- C: drive is **full** (0 bytes). All pip/npm operations must use D:.
  - pip: `pip install --no-cache-dir --target D:\py-pkgs <pkg>`
  - npm: `npm install --cache D:\npm-cache` (`.npmrc` in `frontend/` already set)
  - pytest: `$env:PYTHONPATH="D:\py-pkgs;d:\hackon-new\amazonHackOn\backend"`
- Do not change any business logic formulas or seed data
- Do not re-open product decisions from the context handoff
- Do not add new Python packages without first checking they fit on D:

---

## AWS account details to check

Ask the user for:
- AWS account ID
- IAM credentials (access key / secret key) or instance role ARN
- RDS endpoint (if already provisioned)
- App Runner URL (if already deployed)

Do not hardcode credentials anywhere. Put them in env vars or `~/.aws/credentials`.

---

## Test command (reference)

```powershell
cd d:\hackon-new\amazonHackOn\backend
$env:PYTHONPATH="D:\py-pkgs;d:\hackon-new\amazonHackOn\backend"
python -m pytest tests/ -v --tb=short
# Expected: 67 passed (all pure/mocked tests)
```

## Dev server commands (reference)

```powershell
# Backend
cd d:\hackon-new\amazonHackOn\backend
$env:DATABASE_URL="postgresql://..."
$env:AWS_DEFAULT_REGION="ap-south-1"
$env:PYTHONPATH="D:\py-pkgs;d:\hackon-new\amazonHackOn\backend"
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd d:\hackon-new\amazonHackOn\frontend
npm run dev
# → http://localhost:3000
```
