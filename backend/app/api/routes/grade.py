# backend/app/api/routes/grade.py
# POST /api/grade — AI Grading endpoint

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import List

from app.services.grade_service import grade_item
from app.db.models import GradingReport as GradingReportORM
from app.db.database import get_db
from app.schemas.schemas import GradingReport

router = APIRouter(prefix="/api", tags=["grading"])


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
):
    if not images:
        raise HTTPException(status_code=400, detail="At least one image is required")

    db = next(get_db())
    s3_keys = []

    try:
        for img in images[:3]:
            content = await img.read()
            import boto3
            from app.core.config import S3_BUCKET_IMAGES, AWS_REGION

            s3_client = boto3.client("s3", region_name=AWS_REGION)
            s3_client.put_object(
                Bucket=S3_BUCKET_IMAGES,
                Key=img.filename,
                Body=content,
                ContentType=img.content_type,
            )
            s3_keys.append(img.filename)

        report = grade_item(
            item_id=item_id,
            product_name=product_name,
            category=category,
            original_price=original_price_inr,
            s3_keys=s3_keys,
        )

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
    finally:
        db.close()
