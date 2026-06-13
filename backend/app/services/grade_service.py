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
        "Analyze the attached product photo carefully and objectively.\n\n"
        f"Item: {item_metadata.get('product_name', 'Unknown')}\n"
        f"Category: {item_metadata.get('category', 'Unknown')}\n"
        f"Original Retail Price (INR): {item_metadata.get('original_price_inr', 'Unknown')}\n"
    )

    if rekognition_labels:
        prompt += f"\nPre-detected visual features: {', '.join(rekognition_labels)}\n"

    prompt += (
        "\nIMPORTANT RULES:\n"
        "- Only report defects you can visually confirm in the image.\n"
        "- If the item appears new, unused, or defect-free, return an empty defects array [].\n"
        "- Do NOT invent, assume, or guess defects that are not clearly visible.\n"
        "- Be precise: describe only what you actually see.\n\n"
        "Return ONLY a valid JSON object with these exact keys. "
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
        '  ],\n'
        '  "completeness": "complete|incomplete|accessories_missing",\n'
        '  "confidence": 0.0 to 1.0,\n'
        '  "estimated_retail_inr": your best estimate as a number,\n'
        '  "suggested_resale_band_inr": [low_number, high_number]\n'
        "}"
    )

    return prompt


def call_bedrock_vision(s3_key: str, prompt: str) -> dict:
    image_bytes = s3_client.get_object(Bucket=S3_BUCKET_IMAGES, Key=s3_key)[
        "Body"
    ].read()

    # Detect image format for Nova Lite's format field
    key_lower = s3_key.lower()
    if key_lower.endswith(".png"):
        image_format = "png"
    elif key_lower.endswith(".webp"):
        image_format = "webp"
    elif key_lower.endswith(".gif"):
        image_format = "gif"
    else:
        image_format = "jpeg"

    # Nova Lite native format via InvokeModel API:
    # - bytes field must be Base64-encoded string (not raw bytes)
    # - uses inferenceConfig (not max_tokens), no anthropic_version
    b64_image = base64.b64encode(image_bytes).decode()

    body = {
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "image": {
                            "format": image_format,
                            "source": {"bytes": b64_image},
                        }
                    },
                    {"text": prompt},
                ],
            }
        ],
        "inferenceConfig": {"maxTokens": 1024},
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
    # Nova Lite response shape: {"output": {"message": {"content": [{"text": "..."}]}}}
    raw_text = response_body["output"]["message"]["content"][0]["text"]
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
    flow: str = "return",
) -> GradingReport:
    defects = claude_output.get("defects", [])
    confidence = float(claude_output.get("confidence", 0.5))

    manual_review = confidence < 0.70 or (
        len(defects) == 0 and claude_output["condition_grade"] != "Like New"
    )

    resale_band = claude_output.get("suggested_resale_band_inr", [0, 0])
    if isinstance(resale_band, (list, tuple)) and len(resale_band) >= 2:
        resale_band = (float(resale_band[0]), float(resale_band[1]))
    else:
        resale_band = (0.0, 0.0)

    estimated_retail = float(claude_output.get(
        "estimated_retail_inr", item_metadata.get("original_price_inr", 0)
    ) or 0)

    # Routing is a separate concern — only compute it for the Returns flow.
    # ReList (C2C) doesn't go through ReRoute, so the route fields stay blank.
    if flow == "return":
        route, reason = determine_route(claude_output["condition_grade"], estimated_retail)
    else:
        route, reason = "", ""

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
        estimated_retail_inr=estimated_retail,
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
    flow: str = "return",
) -> GradingReport:
    """Orchestrate full grading pipeline. Called by the FastAPI route.
    flow='return' computes a recommended route; flow='relist' leaves it blank."""
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
        item_id, item_metadata, claude_output, rekognition_labels, flow=flow
    )
