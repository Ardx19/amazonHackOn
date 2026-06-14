# tests/test_health_card_service.py
# Unit tests for health_card_service.py — QR generation and JSON extraction.
# Bedrock calls are mocked.

import base64
import pytest
from unittest.mock import patch, MagicMock

from app.services.health_card_service import (
    extract_json_from_response,
    generate_qr_code,
)


# ─── extract_json_from_response (same helper, separate module) ────────────────

class TestExtractJson:
    def test_plain_json(self):
        text = '{"condition_summary": "Good item", "usage_estimate": "6", "care_recommendation": null}'
        result = extract_json_from_response(text)
        assert result["condition_summary"] == "Good item"

    def test_fenced_json(self):
        text = '```json\n{"condition_summary": "ok"}\n```'
        result = extract_json_from_response(text)
        assert result["condition_summary"] == "ok"


# ─── generate_qr_code ─────────────────────────────────────────────────────────

class TestGenerateQRCode:
    def test_returns_non_empty_string(self):
        b64 = generate_qr_code("https://reroute.demo/card/HC-2026-MUM-ABCD1234")
        assert isinstance(b64, str)
        assert len(b64) > 0

    def test_is_valid_base64(self):
        b64 = generate_qr_code("https://reroute.demo/card/HC-2026-MUM-TEST0001")
        try:
            decoded = base64.b64decode(b64)
            assert len(decoded) > 0
        except Exception:
            pytest.fail("QR code output is not valid base64")

    def test_decoded_is_png(self):
        b64 = generate_qr_code("https://example.com")
        decoded = base64.b64decode(b64)
        # PNG magic bytes: 89 50 4E 47
        assert decoded[:4] == b"\x89PNG"

    def test_different_urls_produce_different_qr(self):
        qr1 = generate_qr_code("https://reroute.demo/card/CARD_A")
        qr2 = generate_qr_code("https://reroute.demo/card/CARD_B")
        assert qr1 != qr2


# ─── generate_health_card (mocked Bedrock) ────────────────────────────────────

class TestGenerateHealthCard:
    def _make_fake_grading_report(self):
        """Minimal object mimicking GradingReportORM with needed attributes."""
        report = MagicMock()
        report.product_category = "footwear"
        report.brand_guess = "Nike"
        report.condition_grade = "Good"
        report.confidence = 0.90
        report.defects = [{"defect_type": "scuff", "severity": "minor", "location": "toe"}]
        report.completeness = "complete"
        return report

    @patch("app.services.health_card_service.bedrock_client")
    def test_card_uuid_format(self, mock_bedrock):
        mock_response = MagicMock()
        mock_response["body"].read.return_value = (
            b'{"output": {"message": {"content": [{"text": "{\\"condition_summary\\": \\"Good item.\\", '
            b'\\"usage_estimate\\": \\"Light wear\\", \\"care_recommendation\\": null}"}]}}}'
        )
        mock_bedrock.invoke_model.return_value = mock_response

        from app.services.health_card_service import generate_health_card
        card = generate_health_card(
            "PROD_001", self._make_fake_grading_report(),
            "USER_RAHUL", "Rahul Mehta", "Mumbai"
        )
        assert card.card_uuid.startswith("HC-2026-MUM-")
        assert len(card.card_uuid) == len("HC-2026-MUM-") + 8

    @patch("app.services.health_card_service.bedrock_client")
    def test_card_amazon_guarantee_always_true(self, mock_bedrock):
        mock_response = MagicMock()
        mock_response["body"].read.return_value = (
            b'{"output": {"message": {"content": [{"text": "{\\"condition_summary\\": \\"OK.\\", '
            b'\\"usage_estimate\\": null, \\"care_recommendation\\": null}"}]}}}'
        )
        mock_bedrock.invoke_model.return_value = mock_response

        from app.services.health_card_service import generate_health_card
        card = generate_health_card(
            "PROD_001", self._make_fake_grading_report(),
            "USER_RAHUL", "Rahul Mehta", "Mumbai"
        )
        assert card.amazon_guarantee is True

    @patch("app.services.health_card_service.bedrock_client")
    def test_card_url_contains_uuid(self, mock_bedrock):
        mock_response = MagicMock()
        mock_response["body"].read.return_value = (
            b'{"output": {"message": {"content": [{"text": "{\\"condition_summary\\": \\"Good.\\", '
            b'\\"usage_estimate\\": null, \\"care_recommendation\\": null}"}]}}}'
        )
        mock_bedrock.invoke_model.return_value = mock_response

        from app.services.health_card_service import generate_health_card
        card = generate_health_card(
            "PROD_001", self._make_fake_grading_report(),
            "USER_RAHUL", "Rahul Mehta", "Mumbai"
        )
        assert card.card_uuid in card.card_url
