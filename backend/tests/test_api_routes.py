# tests/test_api_routes.py
# Integration tests for FastAPI routes using TestClient.
# Mocks all AWS calls. Uses SQLite in-memory DB injected via dependency override.

import json
import pytest
from datetime import datetime
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.database import Base, get_db
from app.db.models import Item, GradingReport


# ─── Test DB setup (SQLite) ───────────────────────────────────────────────────

TEST_DB_URL = "sqlite:///:memory:"

@pytest.fixture(scope="module")
def test_db_engine():
    # StaticPool keeps a single shared connection so every session sees the same
    # in-memory database (otherwise each connection gets its own empty DB).
    engine = create_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture(scope="module")
def client(test_db_engine):
    TestSessionLocal = sessionmaker(
        bind=test_db_engine, autocommit=False, autoflush=False
    )

    def override_get_db():
        db = TestSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="module")
def seeded_db(test_db_engine):
    """Seed an item + grading report once for the whole module."""
    Session = sessionmaker(bind=test_db_engine)
    db = Session()

    item = Item(
        item_id="PROD_001",
        name="Nike Revolution 6 Running Shoes",
        category="footwear",
        brand="Nike",
        original_price_inr=599.0,
        is_trajectory_product=True,
    )
    db.add(item)

    report = GradingReport(
        report_id="RPT_TEST_001",
        item_id="PROD_001",
        product_category="footwear",
        brand_guess="Nike",
        condition_grade="Good",
        defects=[{"defect_type": "scuff", "severity": "minor", "location": "toe cap"}],
        completeness="complete",
        confidence=0.90,
        estimated_retail_inr=599.0,
        suggested_resale_band_inr=[300.0, 400.0],
        recommended_route="reroute_deals",
        routing_reason="Good condition",
        manual_review_recommended=False,
        graded_at=datetime.utcnow(),
        rekognition_labels=["Shoe"],
    )
    db.add(report)
    db.commit()
    db.close()


# ─── GET / ────────────────────────────────────────────────────────────────────

class TestRoot:
    def test_root_returns_ok(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
        assert resp.json()["service"] == "ReRoute API"


# ─── GET /api/deals ───────────────────────────────────────────────────────────

class TestDealsEndpoint:
    def test_deals_returns_200(self, client):
        resp = client.get("/api/deals")
        assert resp.status_code == 200

    def test_deals_response_structure(self, client):
        resp = client.get("/api/deals")
        data = resp.json()
        assert "status" in data
        assert "count" in data
        assert "deals" in data
        assert isinstance(data["deals"], list)

    def test_deals_count_matches_list_length(self, client):
        resp = client.get("/api/deals")
        data = resp.json()
        assert data["count"] == len(data["deals"])

    def test_deals_hub_filter_returns_subset(self, client):
        resp = client.get("/api/deals?hub_id=MUM_H1")
        assert resp.status_code == 200
        data = resp.json()
        for deal in data["deals"]:
            assert deal["current_hub_id"] == "MUM_H1"


# ─── POST /api/evaluate-route ─────────────────────────────────────────────────

class TestEvaluateRouteEndpoint:
    def test_route_good_condition_enters_reroute(self, client, seeded_db):
        payload = {
            "item_id": "PROD_001",
            "original_price_inr": 599.0,
            "category": "footwear",
            "current_location": {
                "hub_id": "MUM_H1",
                "distance_to_home_warehouse_km": 48.0,
            },
            "ring_index": 0,
        }
        resp = client.post("/api/evaluate-route", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        result = data["result"]
        assert result["item_id"] == "PROD_001"
        assert result["final_route"] in [
            "reroute_deals", "standard_return", "amazon_renewed",
            "recycle", "donate", "relist"
        ]

    def test_route_response_has_all_fields(self, client, seeded_db):
        payload = {
            "item_id": "PROD_001",
            "original_price_inr": 599.0,
            "category": "footwear",
            "current_location": {"hub_id": "MUM_H1", "distance_to_home_warehouse_km": 48.0},
            "ring_index": 0,
        }
        resp = client.post("/api/evaluate-route", json=payload)
        result = resp.json()["result"]
        required_fields = [
            "item_id", "final_route", "ring_index", "sale_price_inr",
            "profitable_radius_km", "listing_id", "routing_reason",
            "mvsp_inr", "overhead_ratio", "entered_reroute",
        ]
        for field in required_fields:
            assert field in result, f"Missing field: {field}"

    def test_route_nonexistent_item_returns_500(self, client):
        payload = {
            "item_id": "NONEXISTENT",
            "original_price_inr": 599.0,
            "category": "footwear",
            "current_location": {"hub_id": "MUM_H1", "distance_to_home_warehouse_km": 48.0},
            "ring_index": 0,
        }
        resp = client.post("/api/evaluate-route", json=payload)
        assert resp.status_code == 500

    def test_route_missing_field_returns_422(self, client):
        # Missing required field: item_id
        payload = {
            "original_price_inr": 599.0,
            "category": "footwear",
            "current_location": {},
        }
        resp = client.post("/api/evaluate-route", json=payload)
        assert resp.status_code == 422


# ─── POST /api/health-card ────────────────────────────────────────────────────

class TestHealthCardEndpoint:
    @patch("app.services.health_card_service.bedrock_client")
    def test_health_card_returns_200(self, mock_bedrock, client, seeded_db):
        mock_resp = MagicMock()
        mock_resp["body"].read.return_value = json.dumps({
            "output": {"message": {"content": [{"text": json.dumps({
                "condition_summary": "Good item.",
                "usage_estimate": "Light wear",
                "care_recommendation": "Keep dry",
            })}]}}
        }).encode()
        mock_bedrock.invoke_model.return_value = mock_resp

        payload = {
            "item_id": "PROD_001",
            "seller_id": "USER_RAHUL",
            "seller_name": "Rahul Mehta",
            "seller_city": "Mumbai",
        }
        resp = client.post("/api/health-card", json=payload)
        assert resp.status_code == 200

    @patch("app.services.health_card_service.bedrock_client")
    def test_health_card_uuid_format(self, mock_bedrock, client, seeded_db):
        mock_resp = MagicMock()
        mock_resp["body"].read.return_value = json.dumps({
            "output": {"message": {"content": [{"text": json.dumps({
                "condition_summary": "Fine.",
                "usage_estimate": None,
                "care_recommendation": None,
            })}]}}
        }).encode()
        mock_bedrock.invoke_model.return_value = mock_resp

        payload = {
            "item_id": "PROD_001",
            "seller_id": "USER_RAHUL",
            "seller_name": "Rahul Mehta",
            "seller_city": "Mumbai",
        }
        resp = client.post("/api/health-card", json=payload)
        card = resp.json()["card"]
        assert card["card_uuid"].startswith("HC-2026-MUM-")

    def test_health_card_nonexistent_item_returns_500(self, client):
        payload = {
            "item_id": "NONEXISTENT",
            "seller_id": "X",
            "seller_name": "X",
            "seller_city": "X",
        }
        resp = client.post("/api/health-card", json=payload)
        assert resp.status_code == 500
