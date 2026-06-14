# backend/app/services/health_card_service.py
# Generate Amazon's AI Product Health Card + QR code.
#
# The Health Card is a TRUST primitive: Amazon's AI — not the seller — states the
# item's condition, so a buyer can trust a used/C2C listing. The prose is
# deliberately neutral and honest (never salesy); overselling would defeat the
# whole point of an independent verifier.
#
# Prose is written by Amazon Nova (already enabled on the account). If the model
# call fails for any reason (access, throttling, network), we fall back to a
# deterministic template so the card ALWAYS generates — the demo never hard-fails.

import base64
import io
import json
import logging
import re
import time as _time
from datetime import datetime

import boto3
import qrcode

from app.core.config import (
    AWS_REGION,
    BEDROCK_MODEL_HEALTH_CARD,
    HEALTH_CARD_BASE_URL,
)
from app.schemas.schemas import HealthCard, generate_card_uuid

logger = logging.getLogger(__name__)

# Lazy singleton — created on first use so env vars are already loaded
_bedrock_client = None


def _get_bedrock():
    global _bedrock_client
    if _bedrock_client is None:
        _bedrock_client = boto3.client("bedrock-runtime", region_name=AWS_REGION)
    return _bedrock_client


def extract_json_from_response(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    raise ValueError(f"Could not extract JSON from Bedrock response: {text[:500]}")


def _extract_model_text(response_body: dict) -> str:
    """Pull the generated text out of a Bedrock response, handling both the
    Amazon Nova shape and the Anthropic Claude shape."""
    # Nova: {"output": {"message": {"content": [{"text": "..."}]}}}
    if "output" in response_body:
        return response_body["output"]["message"]["content"][0]["text"]
    # Claude: {"content": [{"text": "..."}]}
    if "content" in response_body:
        return response_body["content"][0]["text"]
    raise ValueError(f"Unrecognized Bedrock response shape: {str(response_body)[:300]}")


def generate_qr_code(data: str) -> str:
    qr = qrcode.QRCode(box_size=10, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


# ─── Deterministic fallback prose ─────────────────────────────────────────────

_CARE_TIPS = {
    "footwear": "Store in a cool, dry place and use a shoe tree to keep the shape.",
    "electronics": "Charge fully before first use and keep away from moisture.",
    "clothing": "Follow the garment's wash-care label to preserve the fabric.",
    "home_goods": "Wipe clean before first use and check all parts are present.",
    "baby_products": "Sanitise thoroughly before use as a precaution.",
}

_GRADE_PHRASE = {
    "Like New": "shows little to no signs of use and appears fully functional",
    "Good": "shows light, normal signs of use and is fully functional",
    "Fair": "shows clear signs of use but remains functional",
    "Poor": "shows heavy wear",
}


def _template_prose(grading_report) -> dict:
    """Honest, deterministic summary built straight from the grading data.
    Used when the model is unavailable so the card still generates."""
    grade = grading_report.condition_grade
    category = grading_report.product_category or "item"
    conf = grading_report.confidence or 0.0
    defects = grading_report.defects or []

    phrase = _GRADE_PHRASE.get(grade, "has been assessed")
    if defects:
        defect_str = ", ".join(
            f"{d.get('defect_type', 'mark')} ({d.get('severity', 'minor')}) "
            f"on the {d.get('location', 'item')}"
            for d in defects
        )
        defect_sentence = f" Noted: {defect_str}."
    else:
        defect_sentence = " No notable defects were detected."

    summary = (
        f"Amazon's AI assessed this {category} as {grade} condition "
        f"({conf:.0%} confidence). The item {phrase}.{defect_sentence}"
    )

    return {
        "condition_summary": summary,
        "usage_estimate": None,
        "care_recommendation": _CARE_TIPS.get(category),
    }


def generate_health_prose(grading_report, seller_name: str) -> dict:
    """Ask Amazon Nova for a neutral condition summary; fall back to a
    deterministic template on any failure."""
    _wear = {
        "Like New": "Minimal to no visible wear.",
        "Good": "Light visible wear consistent with regular use.",
        "Fair": "Moderate wear visible.",
        "Poor": "Heavy wear visible.",
    }

    prompt = (
        "You are Amazon's AI product condition verifier. Write a NEUTRAL, honest "
        "condition assessment for a used product so a buyer can trust the listing. "
        "Do NOT use sales or marketing language. Do NOT exaggerate. State the "
        "condition factually, including any defects.\n\n"
        f"Product: {grading_report.product_category}\n"
        f"Brand: {grading_report.brand_guess or 'Unknown'}\n"
        f"Condition Grade: {grading_report.condition_grade}\n"
        f"Confidence: {grading_report.confidence:.0%}\n"
        f"Defects: {json.dumps(grading_report.defects)}\n"
        f"Completeness: {grading_report.completeness}\n\n"
        "Return ONLY a JSON object with these keys (no markdown, no text outside JSON):\n"
        '{"condition_summary": "2-3 factual sentences describing the actual condition '
        'and any defects, neutral tone", '
        '"usage_estimate": "describe the VISIBLE WEAR LEVEL in plain English — e.g. '
        "'minimal wear', 'light regular use', 'moderate use', 'heavy use'. "
        'Do NOT guess a time duration in months or years.", '
        '"care_recommendation": "one short care tip for the buyer, or null"}\n'
        "The first character must be { and the last must be }."
    )

    body = {
        "messages": [
            {"role": "user", "content": [{"text": prompt}]},
        ],
        "inferenceConfig": {"maxTokens": 512},
    }

    try:
        bedrock = _get_bedrock()
        try:
            response = bedrock.invoke_model(
                modelId=BEDROCK_MODEL_HEALTH_CARD,
                body=json.dumps(body),
            )
        except bedrock.exceptions.ThrottlingException:
            logger.warning("Bedrock throttled — retrying in 2s")
            _time.sleep(2)
            response = bedrock.invoke_model(
                modelId=BEDROCK_MODEL_HEALTH_CARD,
                body=json.dumps(body),
            )

        response_body = json.loads(response["body"].read())
        raw_text = _extract_model_text(response_body)
        return extract_json_from_response(raw_text)
    except Exception as e:
        logger.warning(f"Health-card prose model unavailable, using template: {e}")
        return _template_prose(grading_report)


def generate_health_card(
    item_id: str,
    grading_report,
    seller_id: str,
    seller_name: str,
    seller_city: str,
    seller_usage_description: str | None = None,
) -> HealthCard:
    card_uuid = generate_card_uuid("MUM")
    card_url = f"{HEALTH_CARD_BASE_URL}/{card_uuid}"
    qr_b64 = generate_qr_code(card_url)

    prose = generate_health_prose(grading_report, seller_name)

    return HealthCard(
        card_id=card_uuid,
        item_id=item_id,
        card_uuid=card_uuid,
        card_url=card_url,
        condition_grade=grading_report.condition_grade,
        defects=grading_report.defects,
        brand_guess=grading_report.brand_guess,
        product_category=grading_report.product_category,
        confidence=grading_report.confidence,
        seller_name=seller_name,
        seller_city=seller_city,
        amazon_guarantee=True,
        generated_at=datetime.utcnow(),
        grading_model_version="amazon-nova-lite-v1",
        qr_code_base64=qr_b64,
        condition_summary=prose.get("condition_summary"),
        usage_estimate=prose.get("usage_estimate"),
        care_recommendation=prose.get("care_recommendation"),
        seller_usage_description=seller_usage_description,
    )
