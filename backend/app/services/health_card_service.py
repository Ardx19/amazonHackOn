# backend/app/services/health_card_service.py
# Generate AI-written Product Health Card + QR code.
# Uses Bedrock Claude 3.5 Sonnet for quality prose (consumer-facing).

import base64
import io
import json
import logging
import re
from datetime import datetime

import boto3
import qrcode

from app.core.config import (
    AWS_REGION,
    BEDROCK_MODEL_HEALTH_CARD,
    S3_BUCKET_HEALTH_CARDS,
)
from app.schemas.schemas import HealthCard, generate_card_uuid

logger = logging.getLogger(__name__)
bedrock_client = boto3.client("bedrock-runtime", region_name=AWS_REGION)


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


def generate_qr_code(data: str) -> str:
    qr = qrcode.QRCode(box_size=10, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def generate_health_prose(grading_report, seller_name: str) -> dict:
    prompt = (
        "You are Amazon's AI product condition verifier. "
        "Write a consumer-facing health assessment for a used product listed for resale.\n\n"
        f"Product: {grading_report.product_category}\n"
        f"Brand: {grading_report.brand_guess or 'Unknown'}\n"
        f"Condition Grade: {grading_report.condition_grade}\n"
        f"Confidence: {grading_report.confidence:.0%}\n"
        f"Defects: {json.dumps(grading_report.defects)}\n"
        f"Completeness: {grading_report.completeness}\n"
        f"Seller: {seller_name}\n\n"
        "Return ONLY a JSON object with these keys:\n"
        '{"condition_summary": "2-3 sentences for a buyer. Describe condition honestly '
        'but highlight that the item is functional and a good value.", '
        '"usage_estimate": "estimated months of prior use or null if unknown", '
        '"care_recommendation": "optional care tip for buyer or null"}\n\n'
        "No markdown fences. No text outside the JSON."
    )

    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 512,
        "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}],
    }

    try:
        response = bedrock_client.invoke_model(
            modelId=BEDROCK_MODEL_HEALTH_CARD,
            body=json.dumps(body),
        )
    except bedrock_client.exceptions.ThrottlingException:
        logger.warning("Bedrock throttled — retrying in 2s")
        import time

        time.sleep(2)
        response = bedrock_client.invoke_model(
            modelId=BEDROCK_MODEL_HEALTH_CARD,
            body=json.dumps(body),
        )

    response_body = json.loads(response["body"].read())
    raw_text = response_body["content"][0]["text"]
    return extract_json_from_response(raw_text)


def generate_health_card(
    item_id: str,
    grading_report,
    seller_id: str,
    seller_name: str,
    seller_city: str,
) -> HealthCard:
    card_uuid = generate_card_uuid("MUM")
    card_url = f"https://reroute.demo/card/{card_uuid}"
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
        grading_model_version="claude-3-5-sonnet-20241022",
    )
