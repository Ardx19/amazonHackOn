# backend/app/services/grade_service.py
# Refactored from lambdas/grade_item/lambda_function.py
# Stage 1: Rekognition DetectLabels → feature labels
# Stage 2: Bedrock Nova Lite → GradingReport JSON

import base64
import json
import logging
import re
import time as _time
from datetime import datetime
from uuid import uuid4

import boto3

from app.core.config import (
    AWS_REGION,
    BEDROCK_MODEL_GRADING,
    REKOGNITION_MAX_LABELS,
    REKOGNITION_MIN_CONFIDENCE,
    S3_BUCKET_IMAGES,
    RENEWED_MIN_VALUE,
    CONDITION_GRADES,
)
from app.schemas.schemas import GradingReport, Defect

logger = logging.getLogger(__name__)

rekognition_client = boto3.client("rekognition", region_name=AWS_REGION)
bedrock_client = boto3.client("bedrock-runtime", region_name=AWS_REGION)
s3_client = boto3.client("s3", region_name=AWS_REGION)


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


def run_rekognition(s3_key: str) -> list[str]:
    try:
        response = rekognition_client.detect_labels(
            Image={"S3Object": {"Bucket": S3_BUCKET_IMAGES, "Name": s3_key}},
            MaxLabels=REKOGNITION_MAX_LABELS,
            MinConfidence=REKOGNITION_MIN_CONFIDENCE,
        )
        return [
            label["Name"]
            for label in response.get("Labels", [])
            if label.get("Confidence", 0) >= REKOGNITION_MIN_CONFIDENCE
        ]
    except Exception as e:
        logger.warning(f"Rekognition failed for {s3_key}: {e}")
        return []


def build_grading_prompt(item_metadata: dict, rekognition_labels: list[str]) -> str:
    prompt = (
        "You are a product condition assessor for an e-commerce returns platform. "
        "Analyze the attached product photo and estimate its condition and resale value.\n\n"
        f"Item: {item_metadata.get('product_name', 'Unknown')}\n"
        f"Category: {item_metadata.get('category', 'Unknown')}\n"
        f"Original Retail Price (INR): {item_metadata.get('original_price_inr', 'Unknown')}\n"
    )

    if rekognition_labels:
        prompt += f"\nPre-detected visual features: {', '.join(rekognition_labels)}\n"

    prompt += (
        "\nReturn ONLY a valid JSON object with these exact keys. "
        "No markdown code fences. No explanation before or after. "
        "The first character of your response must be { and the last must be }.\n\n"
        "{\n"
        '  "product_category": "one of: footwear, electronics, clothing, home_goods, baby_products",\n'
        '  "brand_guess": "brand name if recognizable, or null",\n'
        f'  "condition_grade": "one of: {", ".join(CONDITION_GRADES)}",\n'
        '  "defects": [\n'
        '    {"defect_type": "scuff|scratch|crack|stain|missing_part|other",\n'
        '     "severity": "minor|moderate|major",\n'
        '     "location": "descriptive location on the item"}\n'
        "  ],\n"
        '  "completeness": "complete|incomplete|accessories_missing",\n'
        '  "confidence": "0.0 to 1.0 — how confident you are in this assessment",\n'
        '  "estimated_retail_inr": "your best estimate of this item\'s original retail price in INR",\n'
        '  "suggested_resale_band_inr": [low_inr, high_inr]\n'
        "}"
    )

    return prompt


def call_bedrock_vision(s3_key: str, prompt: str) -> dict:
    image_bytes = s3_client.get_object(Bucket=S3_BUCKET_IMAGES, Key=s3_key)[
        "Body"
    ].read()
    b64_image = base64.b64encode(image_bytes).decode()

    key_lower = s3_key.lower()
    if key_lower.endswith(".png"):
        media_type = "image/png"
    elif key_lower.endswith(".webp"):
        media_type = "image/webp"
    elif key_lower.endswith(".gif"):
        media_type = "image/gif"
    else:
        media_type = "image/jpeg"

    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1024,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": b64_image,
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    }

    try:
        response = bedrock_client.invoke_model(
            modelId=BEDROCK_MODEL_GRADING,
            body=json.dumps(body),
        )
    except bedrock_client.exceptions.ThrottlingException:
        logger.warning("Bedrock throttled — retrying in 2s")
        _time.sleep(2)
        response = bedrock_client.invoke_model(
            modelId=BEDROCK_MODEL_GRADING,
            body=json.dumps(body),
        )

    response_body = json.loads(response["body"].read())
    raw_text = response_body["content"][0]["text"]
    return extract_json_from_response(raw_text)


def determine_route(
    condition_grade: str, estimated_retail_inr: float
) -> tuple[str, str]:
    if condition_grade == "Poor":
        return "recycle", "Condition graded as Poor — recommended for recycling"
    if condition_grade == "Like New" and estimated_retail_inr >= RENEWED_MIN_VALUE:
        return (
            "amazon_renewed",
            "Like New with high value — eligible for Amazon Renewed",
        )
    if condition_grade in ("Like New", "Good"):
        return (
            "reroute_deals",
            "Good condition — eligible for ReRoute floating discount deals",
        )
    if condition_grade == "Fair":
        return "relist", "Fair condition — suitable for C2C relisting"
    return "donate", "Below resale threshold — recommended for donation"


def build_grading_report(
    item_id: str,
    item_metadata: dict,
    claude_output: dict,
    rekognition_labels: list[str],
) -> GradingReport:
    route, reason = determine_route(
        claude_output["condition_grade"],
        claude_output.get(
            "estimated_retail_inr", item_metadata.get("original_price_inr", 0)
        ),
    )

    defects = claude_output.get("defects", [])
    confidence = claude_output.get("confidence", 0.5)

    manual_review = confidence < 0.70 or (
        len(defects) == 0 and claude_output["condition_grade"] != "Like New"
    )

    resale_band = claude_output.get("suggested_resale_band_inr", [0, 0])
    if isinstance(resale_band, (list, tuple)) and len(resale_band) >= 2:
        resale_band = (float(resale_band[0]), float(resale_band[1]))
    else:
        resale_band = (0.0, 0.0)

    return GradingReport(
        report_id=str(uuid4()),
        item_id=item_id,
        product_category=claude_output.get(
            "product_category", item_metadata.get("category", "Unknown")
        ),
        brand_guess=claude_output.get("brand_guess"),
        condition_grade=claude_output["condition_grade"],
        defects=[Defect(**d) for d in defects] if isinstance(defects, list) else [],
        completeness=claude_output.get("completeness", "complete"),
        confidence=confidence,
        estimated_retail_inr=claude_output.get(
            "estimated_retail_inr", item_metadata.get("original_price_inr", 0)
        ),
        suggested_resale_band_inr=resale_band,
        recommended_route=route,
        routing_reason=reason,
        manual_review_recommended=manual_review,
        graded_at=datetime.utcnow(),
        rekognition_labels=rekognition_labels,
    )


def grade_item(
    item_id: str,
    product_name: str,
    category: str,
    original_price: float,
    s3_keys: list[str],
) -> GradingReport:
    """Orchestrate full grading pipeline. Called by the FastAPI route."""
    if not s3_keys:
        raise ValueError("s3_keys is required and must be non-empty")

    primary_image = s3_keys[0]
    item_metadata = {
        "product_name": product_name,
        "category": category,
        "original_price_inr": original_price,
    }

    rekognition_labels = run_rekognition(primary_image)
    prompt = build_grading_prompt(item_metadata, rekognition_labels)
    claude_output = call_bedrock_vision(primary_image, prompt)
    return build_grading_report(
        item_id, item_metadata, claude_output, rekognition_labels
    )
