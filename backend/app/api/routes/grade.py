# backend/app/api/routes/grade.py
# POST /api/grade — AI Grading endpoint

import uuid as _uuid
import boto3
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session

from app.core.config import S3_BUCKET_IMAGES, AWS_REGION
from app.services.grade_service import grade_item
from app.db.models import GradingReport as GradingReportORM
from app.db.database import get_db
from app.schemas.schemas import GradingReport

router = APIRouter(prefix="/api", tags=["grading"])

# Module-level S3 client — not recreated per request or per image
s3_client = boto3.client("s3", region_name=AWS_REGION)


class GradeResponse(BaseModel):
    status: str = "ok"
    report: GradingReport


@router.post("/grade", response_model=GradeResponse)
async def grade_product(
    images: List[UploadFile] = File(...),
    item_id: str = Form(...),
    original_price_inr: float = Form(...),
    category: str = Form(...),
    product_name: str = Form(...),
    flow: str = Form("return"),  # "return" (default) or "relist"
    db: Session = Depends(get_db),
):
    if not images:
        raise HTTPException(status_code=400, detail="At least one image is required")

    s3_keys = []

    try:
        for img in images[:3]:
            content = await img.read()
            # Prefix with a unique token so every upload gets its own S3 object.
            # Without this, uploading the same filename would overwrite the old
            # object and Nova could return a cached/stale response.
            unique_key = f"{_uuid.uuid4().hex}/{img.filename}"
            s3_client.put_object(
                Bucket=S3_BUCKET_IMAGES,
                Key=unique_key,
                Body=content,
                ContentType=img.content_type,
            )
            s3_keys.append(unique_key)

        report = grade_item(
            item_id=item_id,
            product_name=product_name,
            category=category,
            original_price=original_price_inr,
            s3_keys=s3_keys,
            flow=flow,
        )

        # Auto-create the item row if it doesn't exist (C2C listings use
        # dynamic IDs like C2C-DEMO-xxx that aren't in the seeded items table).
        from app.db.models import Item as ItemORM
        if not db.query(ItemORM).filter_by(item_id=item_id).first():
            db.add(ItemORM(
                item_id=item_id,
                name=product_name,
                category=category,
                brand=None,
                original_price_inr=original_price_inr,
                is_trajectory_product=False,
            ))
            db.flush()

        # Delete any previous grading report for this item before inserting.
        db.query(GradingReportORM).filter_by(item_id=item_id).delete()

        db_report = GradingReportORM(
            report_id=report.report_id,
            item_id=report.item_id,
            product_category=report.product_category,
            brand_guess=report.brand_guess,
            condition_grade=report.condition_grade,
            defects=[d.model_dump() for d in report.defects] if report.defects else [],
            completeness=report.completeness,
            confidence=report.confidence,
            estimated_retail_inr=report.estimated_retail_inr,
            suggested_resale_band_inr=list(report.suggested_resale_band_inr),
            recommended_route=report.recommended_route,
            routing_reason=report.routing_reason,
            manual_review_recommended=report.manual_review_recommended,
            graded_at=report.graded_at,
            rekognition_labels=report.rekognition_labels,
        )
        db.add(db_report)
        db.commit()

        return GradeResponse(report=report)

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
