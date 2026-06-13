# tests/test_grade_service.py
# Unit tests for grade_service.py — pure logic functions only.
# No boto3 calls. AWS-dependent functions (run_rekognition, call_bedrock_vision)
# are tested with mocks where needed.

import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime

from app.services.grade_service import (
    extract_json_from_response,
    build_grading_prompt,
    determine_route,
    build_grading_report,
)
from app.core.config import CONDITION_GRADES, RENEWED_MIN_VALUE


# ─── extract_json_from_response ───────────────────────────────────────────────

class TestExtractJsonFromResponse:
    def test_clean_json_string(self):
        text = '{"condition_grade": "Good", "confidence": 0.9}'
        result = extract_json_from_response(text)
        assert result["condition_grade"] == "Good"
        assert result["confidence"] == 0.9

    def test_json_in_markdown_fence(self):
        text = '```json\n{"condition_grade": "Fair", "confidence": 0.7}\n```'
        result = extract_json_from_response(text)
        assert result["condition_grade"] == "Fair"

    def test_json_in_plain_fence(self):
        text = '```\n{"condition_grade": "Like New"}\n```'
        result = extract_json_from_response(text)
        assert result["condition_grade"] == "Like New"

    def test_json_embedded_in_prose(self):
        text = 'Here is the result: {"condition_grade": "Poor", "confidence": 0.5} done.'
        result = extract_json_from_response(text)
        assert result["condition_grade"] == "Poor"

    def test_raises_on_no_json(self):
        with pytest.raises(ValueError, match="Could not extract JSON"):
            extract_json_from_response("This has no JSON at all.")

    def test_raises_on_empty_string(self):
        with pytest.raises((ValueError, Exception)):
            extract_json_from_response("")


# ─── build_grading_prompt ─────────────────────────────────────────────────────

class TestBuildGradingPrompt:
    def test_contains_product_name(self):
        meta = {"product_name": "Nike Shoes", "category": "footwear", "original_price_inr": 599}
        prompt = build_grading_prompt(meta, [])
        assert "Nike Shoes" in prompt

    def test_contains_category(self):
        meta = {"product_name": "X", "category": "electronics", "original_price_inr": 1000}
        prompt = build_grading_prompt(meta, [])
        assert "electronics" in prompt

    def test_contains_rekognition_labels_when_present(self):
        meta = {"product_name": "X", "category": "footwear", "original_price_inr": 500}
        prompt = build_grading_prompt(meta, ["Shoe", "Footwear", "Nike"])
        assert "Shoe" in prompt
        assert "Footwear" in prompt

    def test_no_labels_section_when_empty(self):
        meta = {"product_name": "X", "category": "footwear", "original_price_inr": 500}
        prompt = build_grading_prompt(meta, [])
        assert "Pre-detected" not in prompt

    def test_all_condition_grades_in_prompt(self):
        meta = {"product_name": "X", "category": "footwear", "original_price_inr": 500}
        prompt = build_grading_prompt(meta, [])
        for grade in CONDITION_GRADES:
            assert grade in prompt

    def test_json_schema_in_prompt(self):
        meta = {"product_name": "X", "category": "footwear", "original_price_inr": 500}
        prompt = build_grading_prompt(meta, [])
        assert "condition_grade" in prompt
        assert "confidence" in prompt
        assert "defects" in prompt


# ─── determine_route ──────────────────────────────────────────────────────────

class TestDetermineRoute:
    def test_poor_routes_to_recycle(self):
        route, reason = determine_route("Poor", 500.0)
        assert route == "recycle"

    def test_like_new_high_value_routes_to_renewed(self):
        route, reason = determine_route("Like New", RENEWED_MIN_VALUE + 1)
        assert route == "amazon_renewed"

    def test_like_new_low_value_routes_to_reroute_deals(self):
        # Like New but below ₹2000 threshold
        route, reason = determine_route("Like New", RENEWED_MIN_VALUE - 1)
        assert route == "reroute_deals"

    def test_good_routes_to_reroute_deals(self):
        route, reason = determine_route("Good", 599.0)
        assert route == "reroute_deals"

    def test_fair_routes_to_relist(self):
        route, reason = determine_route("Fair", 349.0)
        assert route == "relist"

    def test_exactly_at_renewed_threshold(self):
        route, _ = determine_route("Like New", RENEWED_MIN_VALUE)
        assert route == "amazon_renewed"


# ─── build_grading_report ─────────────────────────────────────────────────────

class TestBuildGradingReport:
    def _claude_output(self, **overrides):
        base = {
            "product_category": "footwear",
            "brand_guess": "Nike",
            "condition_grade": "Good",
            "defects": [
                {"defect_type": "scuff", "severity": "minor", "location": "toe"}
            ],
            "completeness": "complete",
            "confidence": 0.90,
            "estimated_retail_inr": 599.0,
            "suggested_resale_band_inr": [300.0, 400.0],
        }
        base.update(overrides)
        return base

    def test_report_has_correct_item_id(self):
        report = build_grading_report(
            "PROD_001", {"original_price_inr": 599}, self._claude_output(), []
        )
        assert report.item_id == "PROD_001"

    def test_report_confidence_stored(self):
        report = build_grading_report(
            "PROD_001", {"original_price_inr": 599}, self._claude_output(confidence=0.87), []
        )
        assert report.confidence == pytest.approx(0.87)

    def test_defects_parsed_as_defect_objects(self):
        report = build_grading_report(
            "PROD_001", {"original_price_inr": 599}, self._claude_output(), []
        )
        assert len(report.defects) == 1
        assert report.defects[0].defect_type == "scuff"
        assert report.defects[0].severity == "minor"

    def test_manual_review_triggered_for_low_confidence(self):
        report = build_grading_report(
            "PROD_001", {"original_price_inr": 599},
            self._claude_output(confidence=0.60), []
        )
        assert report.manual_review_recommended is True

    def test_no_manual_review_for_high_confidence_with_defects(self):
        report = build_grading_report(
            "PROD_001", {"original_price_inr": 599},
            self._claude_output(confidence=0.92), []
        )
        assert report.manual_review_recommended is False

    def test_rekognition_labels_stored(self):
        labels = ["Shoe", "Nike", "Footwear"]
        report = build_grading_report(
            "PROD_001", {"original_price_inr": 599}, self._claude_output(), labels
        )
        assert report.rekognition_labels == labels

    def test_resale_band_tuple_from_list(self):
        report = build_grading_report(
            "PROD_001", {"original_price_inr": 599},
            self._claude_output(suggested_resale_band_inr=[280.0, 350.0]), []
        )
        assert report.suggested_resale_band_inr == (280.0, 350.0)

    def test_fallback_resale_band_on_missing_field(self):
        output = self._claude_output()
        del output["suggested_resale_band_inr"]
        report = build_grading_report("PROD_001", {"original_price_inr": 599}, output, [])
        assert report.suggested_resale_band_inr == (0.0, 0.0)

    def test_grade_poor_routes_to_recycle(self):
        report = build_grading_report(
            "PROD_001", {"original_price_inr": 599},
            self._claude_output(condition_grade="Poor"), []
        )
        assert report.recommended_route == "recycle"


# ─── grade_item (mocked AWS) ──────────────────────────────────────────────────

class TestGradeItemMocked:
    """Tests for the top-level grade_item orchestrator with mocked AWS calls."""

    def _mock_claude_output(self):
        return {
            "product_category": "footwear",
            "brand_guess": "Nike",
            "condition_grade": "Good",
            "defects": [{"defect_type": "scuff", "severity": "minor", "location": "toe"}],
            "completeness": "complete",
            "confidence": 0.90,
            "estimated_retail_inr": 599.0,
            "suggested_resale_band_inr": [300.0, 400.0],
        }

    @patch("app.services.grade_service.run_rekognition", return_value=["Shoe", "Footwear"])
    @patch("app.services.grade_service.call_bedrock_vision")
    def test_grade_item_full_pipeline(self, mock_bedrock, mock_rekog):
        mock_bedrock.return_value = self._mock_claude_output()
        from app.services.grade_service import grade_item
        report = grade_item("PROD_001", "Nike Shoes", "footwear", 599.0, ["test.jpg"])
        assert report.condition_grade == "Good"
        assert report.confidence == 0.90
        assert len(report.rekognition_labels) == 2
        mock_rekog.assert_called_once_with("test.jpg")
        mock_bedrock.assert_called_once()

    @patch("app.services.grade_service.run_rekognition", return_value=[])
    @patch("app.services.grade_service.call_bedrock_vision")
    def test_rekognition_failure_is_non_fatal(self, mock_bedrock, mock_rekog):
        """Empty rekognition labels should not crash the pipeline."""
        mock_bedrock.return_value = self._mock_claude_output()
        from app.services.grade_service import grade_item
        report = grade_item("PROD_001", "Nike Shoes", "footwear", 599.0, ["test.jpg"])
        assert report.item_id == "PROD_001"
        assert report.rekognition_labels == []

    def test_grade_item_raises_on_empty_s3_keys(self):
        from app.services.grade_service import grade_item
        with pytest.raises(ValueError, match="s3_keys is required"):
            grade_item("PROD_001", "Nike Shoes", "footwear", 599.0, [])
