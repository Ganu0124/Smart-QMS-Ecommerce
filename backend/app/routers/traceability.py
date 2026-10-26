"""Traceability Router for SmartQMS (mounted at /api/traceability).

Computes end-to-end matrix linking:
Quality Objective -> Requirement -> Design Review -> Development Task -> Code Review -> Test Case
and identifies coverage gaps across the engineering lifecycle.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.project import Project
from app.models.quality_plan import QualityObjective
from app.models.requirement import Requirement
from app.models.review import Review
from app.models.task import DevTask
from app.models.test_case import TestCase
from app.models.defect import Defect
from app.models.user import User
from app.schemas.all_schemas import (
    TraceabilityMatrixResponse, TraceabilityItem, TraceabilityMatrixItem, TraceabilitySummary
)
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/traceability", tags=["Traceability Matrix"])

@router.get("/matrix", response_model=TraceabilityMatrixResponse)
def get_traceability_matrix(
    project_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve end-to-end traceability matrix connecting Quality Objectives to Test Cases."""
    # Default to first active project if none specified
    if not project_id:
        proj = db.query(Project).first()
        project_id = proj.id if proj else 1

    req_query = db.query(Requirement).filter(Requirement.project_id == project_id)
    if status_filter:
        req_query = req_query.filter(Requirement.approval_status == status_filter)
    requirements = req_query.all()

    items: List[TraceabilityItem] = []
    matrix: List[TraceabilityMatrixItem] = []
    fully_traceable_count = 0

    for req in requirements:
        gaps: List[str] = []
        
        # 1. Quality Objective link
        qo_data = None
        qo_summary = None
        if req.quality_objective:
            qo_data = {
                "id": req.quality_objective.id,
                "title": req.quality_objective.title,
                "quality_factor": req.quality_objective.quality_factor,
                "target_value": req.quality_objective.target_value,
                "measurement_unit": req.quality_objective.measurement_unit,
                "status": req.quality_objective.status,
            }
            qo_summary = {
                "id": req.quality_objective.id,
                "title": req.quality_objective.title,
                "quality_factor": req.quality_objective.quality_factor,
            }
        else:
            gaps.append("Unlinked Quality Objective")

        # 2. Design Review link (all reviews + primary)
        design_reviews = db.query(Review).filter(
            Review.project_id == project_id,
            Review.review_type == "design",
            ((Review.requirement_id == req.id) | (Review.target_ref.ilike(f"%{req.requirement_code}%")))
        ).order_by(Review.id.desc()).all()
        
        dr_data = None
        dr_list = []
        if design_reviews:
            dr_primary = design_reviews[0]
            dr_data = {
                "id": dr_primary.id,
                "review_code": dr_primary.review_code,
                "title": dr_primary.title,
                "status": dr_primary.status,
                "is_baselined": dr_primary.is_baselined,
            }
            dr_list = [
                {
                    "id": dr.id,
                    "review_code": dr.review_code,
                    "status": dr.status,
                    "is_baselined": dr.is_baselined,
                }
                for dr in design_reviews
            ]
            if not any(dr.is_baselined for dr in design_reviews):
                gaps.append("Design Review Not Baselined")
        else:
            gaps.append("Missing Design Review")

        # 3. Development Task link (all tasks + primary)
        tasks = db.query(DevTask).filter(
            DevTask.requirement_id == req.id
        ).order_by(DevTask.id.desc()).all()

        task_data = None
        task_list = []
        cr_data = None
        cr_list = []
        
        if tasks:
            t_primary = tasks[0]
            task_data = {
                "id": t_primary.id,
                "task_code": t_primary.task_code,
                "title": t_primary.title,
                "status": t_primary.status,
                "code_reference": t_primary.code_reference,
            }
            task_list = [
                {
                    "id": t.id,
                    "task_code": t.task_code,
                    "title": t.title,
                    "status": t.status,
                }
                for t in tasks
            ]
            
            # 4. Code Review link
            task_ids = [t.id for t in tasks]
            code_reviews = db.query(Review).filter(
                Review.review_type == "code",
                ((Review.task_id.in_(task_ids)) | (Review.requirement_id == req.id))
            ).order_by(Review.id.desc()).all()

            if code_reviews:
                cr_primary = code_reviews[0]
                cr_data = {
                    "id": cr_primary.id,
                    "review_code": cr_primary.review_code,
                    "title": cr_primary.title,
                    "status": cr_primary.status,
                    "outcome": cr_primary.outcome,
                }
                cr_list = [
                    {
                        "id": cr.id,
                        "review_code": cr.review_code,
                        "status": cr.status,
                        "outcome": cr.outcome or cr.status,
                    }
                    for cr in code_reviews
                ]
                if not any(cr.status == "passed" for cr in code_reviews):
                    gaps.append("Code Review Unapproved")
            else:
                gaps.append("Missing Code Review")
        else:
            gaps.append("Missing Development Task")

        # 5. Test Cases link
        test_cases = db.query(TestCase).filter(TestCase.requirement_id == req.id).all()
        tc_list = [
            {
                "id": tc.id,
                "test_code": getattr(tc, "tc_code", getattr(tc, "test_code", f"TC-{tc.id}")),
                "tc_code": getattr(tc, "tc_code", getattr(tc, "test_code", f"TC-{tc.id}")),
                "scenario_title": getattr(tc, "scenario_title", getattr(tc, "title", f"Test {tc.id}")),
                "title": getattr(tc, "scenario_title", getattr(tc, "title", f"Test {tc.id}")),
                "priority": getattr(tc, "priority", "high"),
                "status": tc.status,
            }
            for tc in test_cases
        ]
        if len(tc_list) == 0:
            gaps.append("Missing Test Case")

        # 6. Defects link
        defects = db.query(Defect).filter(Defect.requirement_id == req.id).all()
        defect_list = [
            {
                "id": d.id,
                "defect_code": getattr(d, "defect_code", getattr(d, "defect_identifier", f"DEF-{d.id}")),
                "defect_identifier": getattr(d, "defect_code", getattr(d, "defect_identifier", f"DEF-{d.id}")),
                "title": d.title,
                "severity": d.severity,
                "status": getattr(d, "status", getattr(d, "lifecycle_status", "open")),
                "lifecycle_status": getattr(d, "status", getattr(d, "lifecycle_status", "open")),
            }
            for d in defects
        ]

        # Status synthesis
        if len(gaps) == 0:
            coverage_status = "Fully Traceable"
            fully_traceable_count += 1
        elif len(gaps) <= 2:
            coverage_status = "Partially Traceable"
        else:
            coverage_status = "Significant Gaps"

        items.append(TraceabilityItem(
            quality_objective=qo_data,
            requirement={
                "id": req.id,
                "requirement_code": req.requirement_code,
                "title": req.title,
                "category": req.category,
                "priority": req.priority,
                "risk_level": req.risk_level,
                "version": req.current_version,
                "approval_status": req.approval_status,
                "review_status": req.review_status,
            },
            design_review=dr_data,
            dev_task=task_data,
            code_review=cr_data,
            test_cases=tc_list,
            defects=defect_list,
            coverage_status=coverage_status,
            gaps=gaps
        ))

        matrix.append(TraceabilityMatrixItem(
            requirement_id=req.id,
            req_code=req.requirement_code,
            title=req.title,
            status=req.approval_status,
            quality_objective=qo_summary,
            design_reviews=dr_list,
            dev_tasks=task_list,
            code_reviews=cr_list,
            test_cases=tc_list,
            defects=defect_list,
            coverage_gaps=gaps
        ))

    total = len(requirements)
    coverage_percentage = round((fully_traceable_count / total * 100), 1) if total > 0 else 0.0
    gap_count = len([m for m in matrix if len(m.coverage_gaps) > 0])

    summary = TraceabilitySummary(
        fully_traceable_count=fully_traceable_count,
        gap_count=gap_count,
        coverage_percentage=coverage_percentage
    )

    return TraceabilityMatrixResponse(
        project_id=project_id,
        total_requirements=total,
        fully_traceable_count=fully_traceable_count,
        coverage_percentage=coverage_percentage,
        items=items,
        matrix=matrix,
        summary=summary
    )
