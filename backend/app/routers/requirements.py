from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.requirement import Requirement, RequirementVersion
from app.models.review import Review, ReviewChecklistItem
from app.models.user import User
from app.schemas.all_schemas import (
    RequirementCreate, RequirementUpdate, RequirementApproval,
    RequirementResponse, RequirementHistoryResponse
)
from app.core.dependencies import get_current_user, require_roles
from app.services.audit import log_audit
from app.routers.reviews import DEFAULT_REQUIREMENT_CHECKLIST, generate_review_code

router = APIRouter(prefix="/api/requirements", tags=["Requirements"])

def utc_now():
    return datetime.now(timezone.utc)

def generate_req_code(db: Session, project_id: int) -> str:
    count = db.query(Requirement).filter(Requirement.project_id == project_id).count() + 1
    return f"REQ-{project_id:02d}-{count:03d}"

@router.get("", response_model=List[RequirementResponse])
def get_requirements(
    project_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    risk_level: Optional[str] = Query(None),
    risk: Optional[str] = Query(None),
    owner_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Requirement)
    if project_id:
        query = query.filter(Requirement.project_id == project_id)
    if status_filter:
        query = query.filter(Requirement.approval_status == status_filter)
    if priority_filter:
        query = query.filter(Requirement.priority == priority_filter)
    target_risk = risk_level or risk
    if target_risk:
        query = query.filter(Requirement.risk_level == target_risk)
    if owner_id:
        query = query.filter((Requirement.created_by == owner_id) | (Requirement.assigned_to == owner_id))
    if category:
        query = query.filter(Requirement.category == category)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Requirement.title.ilike(s)) | 
            (Requirement.requirement_code.ilike(s)) | 
            (Requirement.description.ilike(s))
        )
    return query.order_by(Requirement.id.desc()).all()

@router.get("/{req_id}", response_model=RequirementResponse)
def get_requirement(req_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    req = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Requirement {req_id} not found")
    return req

@router.get("/{req_id}/versions", response_model=List[RequirementHistoryResponse])
def get_requirement_versions(req_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    req = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Requirement {req_id} not found")
    return db.query(RequirementVersion).filter(
        RequirementVersion.requirement_id == req_id
    ).order_by(RequirementVersion.version_number.desc()).all()

@router.post("", response_model=RequirementResponse)
def create_requirement(
    data: RequirementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validation rules
    if not data.title or len(data.title.strip()) < 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Requirement title must be at least 5 characters")
    if not data.description or len(data.description.strip()) < 10:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Requirement description must be at least 10 characters")
    if not data.acceptance_criteria or len(data.acceptance_criteria.strip()) < 10:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Acceptance criteria must be explicitly detailed (minimum 10 characters)")
        
    code = generate_req_code(db, data.project_id)
    
    req = Requirement(
        requirement_code=code,
        project_id=data.project_id,
        title=data.title.strip(),
        description=data.description.strip(),
        acceptance_criteria=data.acceptance_criteria.strip(),
        category=data.category or "functional",
        priority=data.priority,
        risk_level=data.risk_level,
        quality_factor=data.quality_factor,
        quality_objective_id=data.quality_objective_id,
        is_mandatory=data.is_mandatory,
        current_version=1,
        created_by=current_user.id,
        approval_status="draft",
        review_status="unreviewed",
        created_at=utc_now(),
        updated_at=utc_now()
    )
    db.add(req)
    db.flush()
    
    # Version 1 history snapshot
    initial_ver = RequirementVersion(
        requirement_id=req.id,
        version_number=1,
        title=req.title,
        description=req.description,
        acceptance_criteria=req.acceptance_criteria,
        author_id=current_user.id,
        change_description="Initial requirement specification baselined",
        created_at=utc_now()
    )
    db.add(initial_ver)
    db.commit()
    db.refresh(req)
    log_audit(db, current_user, "CREATE", "Requirement", req.requirement_code, f"Created requirement: '{req.title}'")
    return req

@router.put("/{req_id}", response_model=RequirementResponse)
def update_requirement(
    req_id: int,
    data: RequirementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    req = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Requirement {req_id} not found")

    # If requirement was previously approved, modifying it increments the version and resets approval
    was_approved = req.approval_status == "approved"
    was_rejected = req.approval_status == "rejected"
    change_summary = "Requirement edited"
    
    if was_approved:
        req.current_version += 1
        req.approval_status = "submitted" # Returns to review
        req.review_status = "in_review"
        change_summary = f"Version {req.current_version} created: changes require re-review"
    elif was_rejected:
        req.approval_status = "draft" # Returns to draft revision state
        req.review_status = "unreviewed"
        change_summary = f"Revised rejected requirement: returned to draft"
    
    for k, v in data.model_dump(exclude_unset=True).items():
        if hasattr(req, k) and v is not None:
            setattr(req, k, v)
            
    req.updated_at = utc_now()

    # Create immutable version record
    new_version = RequirementVersion(
        requirement_id=req.id,
        version_number=req.current_version,
        title=req.title,
        description=req.description,
        acceptance_criteria=req.acceptance_criteria,
        author_id=current_user.id,
        change_description=change_summary,
        created_at=utc_now()
    )
    db.add(new_version)
    db.commit()
    db.refresh(req)
    log_audit(db, current_user, "UPDATE", "Requirement", req.requirement_code, f"Updated to version {req.current_version} (was_approved={was_approved})")
    return req

@router.post("/{req_id}/submit", response_model=RequirementResponse)
def submit_requirement_for_review(
    req_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    req = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Requirement {req_id} not found")
        
    req.approval_status = "submitted"
    req.review_status = "in_review"
    req.updated_at = utc_now()

    # Automatically ensure a requirement review exists with the 10 standard checklist items
    existing_rev = db.query(Review).filter(
        Review.requirement_id == req.id,
        Review.review_type == "requirement"
    ).first()

    if not existing_rev:
        review_code = generate_review_code(db, req.project_id, "requirement")
        rev = Review(
            review_code=review_code,
            project_id=req.project_id,
            review_type="requirement",
            title=f"Requirements Quality Review: {req.requirement_code} - {req.title}",
            target_ref=req.requirement_code,
            requirement_id=req.id,
            reviewer_id=None,
            status="in_progress",
            is_baselined=False,
            created_at=utc_now()
        )
        db.add(rev)
        db.flush()
        
        for cat, name, desc, mand in DEFAULT_REQUIREMENT_CHECKLIST:
            ci = ReviewChecklistItem(
                review_id=rev.id,
                category=cat,
                checklist_description=f"{name}: {desc}",
                is_mandatory=mand,
                review_result="pending"
            )
            db.add(ci)

    db.commit()
    db.refresh(req)
    log_audit(db, current_user, "SUBMIT", "Requirement", req.requirement_code, "Submitted requirement for review")
    return req

@router.post("/{req_id}/approval", response_model=RequirementResponse)
def approve_or_reject_requirement(
    req_id: int,
    approval: RequirementApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Administrator", "Quality Manager", "Reviewer", "admin", "quality_manager", "reviewer"]))
):
    req = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Requirement {req_id} not found")

    decision = approval.decision.lower().strip()
    if decision not in ["approved", "rejected"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Decision must be 'approved' or 'rejected'")

    # Rule: Rejection requires explanatory comments
    if decision == "rejected":
        if not approval.comments or len(approval.comments.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reviewer comments (minimum 5 characters) are mandatory when rejecting a requirement."
            )
        req.approval_status = "rejected"
        req.review_status = "failed"
    else:
        # Rule: Prevent approval when mandatory fields or acceptance criteria are missing
        if not req.description or len(req.description.strip()) < 10:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot approve requirement: Description is incomplete (minimum 10 characters)")
        if not req.acceptance_criteria or len(req.acceptance_criteria.strip()) < 10:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot approve requirement: Acceptance criteria is missing or incomplete (minimum 10 characters)")

        # Rule: Block approval while any mandatory checklist item fails or remains incomplete
        linked_review = db.query(Review).filter(
            Review.requirement_id == req.id,
            Review.review_type == "requirement"
        ).order_by(Review.id.desc()).first()

        if linked_review:
            unresolved = [
                i for i in linked_review.checklist_items 
                if i.is_mandatory and (i.review_result not in ["pass", "not_applicable", "not applicable"])
            ]
            if len(unresolved) > 0:
                names = ", ".join([i.checklist_description.split(':')[0] for i in unresolved[:3]])
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot approve requirement: Mandatory review checklist items remain incomplete or failed ({names})."
                )
            linked_review.status = "passed"
            linked_review.outcome = "approved"
            linked_review.reviewer_id = current_user.id
            linked_review.completion_time = utc_now()

        req.approval_status = "approved"
        req.review_status = "passed"

    req.assigned_to = current_user.id
    req.review_comments = approval.comments
    req.updated_at = utc_now()

    db.commit()
    db.refresh(req)
    log_audit(db, current_user, decision.upper(), "Requirement", req.requirement_code, f"Reviewer decision: {decision}. Notes: {approval.comments}")
    return req
