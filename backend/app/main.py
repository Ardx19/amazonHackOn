# backend/app/main.py
# FastAPI application entry point.

# Load .env FIRST — before any AWS/DB imports so boto3 and SQLAlchemy pick up
# the correct credentials and DATABASE_URL.
import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    _env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(_env_path, override=False)
except ImportError:
    pass  # python-dotenv not installed — rely on shell env vars

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import grade, routing, health_card, returns, listings
from app.api.routes.admin import router as admin_router, TRUST_ROUTER

app = FastAPI(
    title="ReRoute API",
    description="AI-powered returns marketplace — grading, routing, health cards",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(grade.router)
app.include_router(routing.router)
app.include_router(health_card.router)
app.include_router(returns.router)
app.include_router(admin_router)
app.include_router(TRUST_ROUTER)
app.include_router(listings.router)


@app.get("/")
async def root():
    return {"status": "ok", "service": "ReRoute API", "version": "1.0.0"}
