from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.quality_plan import QualityMetric
from app.schemas.all_schemas import (
    DashboardSummary, QualityMetricsDetails,
    DevPCalculateRequest, CReCalculateRequest, DocReCalculateRequest,
    SoftwareQualityMetricResponse
)
from app.services.auth import get_current_user
from app.services.audit import log_audit
from app.services.metrics import (
    calculate_dashboard_summary, calculate_quality_metrics,
    calculate_and_store_devp, calculate_and_store_cre, calculate_and_store_docre
)

router = APIRouter(prefix="/api/metrics", tags=["Metrics & Analytics"])

@router.get("/dashboard", response_model=DashboardSummary)
def get_dashboard_metrics(
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return calculate_dashboard_summary(db, project_id)

@router.get("/quality", response_model=QualityMetricsDetails)
def get_detailed_quality_metrics(
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return calculate_quality_metrics(db, project_id)

@router.get("/software-development", response_model=List[SoftwareQualityMetricResponse])
def get_software_development_metrics(
    project_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve recorded software development quality measurements (DevP, CRe, DocRe)."""
    query = db.query(QualityMetric)
    if project_id:
        query = query.filter(QualityMetric.project_id == project_id)
    # Filter to the software quality metrics keys
    query = query.filter(QualityMetric.metric_key.in_(["DevP", "CRe", "DocRe"]))
    return query.order_by(QualityMetric.measurement_date.desc()).all()

@router.post("/calculate/devp", response_model=SoftwareQualityMetricResponse)
def compute_devp(
    data: DevPCalculateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate and store Metric A: Development Effort per KLOC (DevP = Hours / KLOC)."""
    try:
        metric = calculate_and_store_devp(
            db=db,
            project_id=data.project_id,
            development_hours=data.development_hours,
            software_size_kloc=data.software_size_kloc,
            user_id=current_user.id
        )
        log_audit(db, current_user, "METRIC_CALC", "QualityMetric", str(metric.id), f"Calculated DevP: {metric.value} hours/KLOC")
        return metric
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/calculate/cre", response_model=SoftwareQualityMetricResponse)
def compute_cre(
    data: CReCalculateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate and store Metric B: Code Reuse Ratio (CRe = Reused KLOC / Total KLOC * 100)."""
    try:
        metric = calculate_and_store_cre(
            db=db,
            project_id=data.project_id,
            reused_kloc=data.reused_kloc,
            total_kloc=data.total_kloc,
            user_id=current_user.id
        )
        log_audit(db, current_user, "METRIC_CALC", "QualityMetric", str(metric.id), f"Calculated CRe: {metric.value}%")
        return metric
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/calculate/docre", response_model=SoftwareQualityMetricResponse)
def compute_docre(
    data: DocReCalculateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate and store Metric C: Documentation Reuse Ratio (DocRe = Reused Docs / Total Docs * 100)."""
    try:
        metric = calculate_and_store_docre(
            db=db,
            project_id=data.project_id,
            reused_documents=data.reused_documents,
            total_documents=data.total_documents,
            user_id=current_user.id
        )
        log_audit(db, current_user, "METRIC_CALC", "QualityMetric", str(metric.id), f"Calculated DocRe: {metric.value}%")
        return metric
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

