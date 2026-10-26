from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.quality_plan import QualityObjective, RiskAssessment, QualityAssurancePlan, ProjectMilestone
from app.models.user import User
from app.schemas.all_schemas import (
    QualityObjectiveCreate, QualityObjectiveUpdate, QualityObjectiveResponse,
    RiskAssessmentCreate, RiskAssessmentResponse,
    QAPlanCreate, QAPlanResponse,
    MilestoneCreate, MilestoneResponse
)
from app.core.dependencies import get_current_user, require_roles
from app.services.audit import log_audit

router = APIRouter(prefix="/api/quality-plans", tags=["Quality Planning"])

# Objectives
@router.get("/objectives", response_model=List[QualityObjectiveResponse])
def get_objectives(
    project_id: Optional[int] = Query(None),
    quality_factor: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    owner_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve quality objectives with optional project_id, quality_factor, priority, search, and status filters."""
    query = db.query(QualityObjective)
    if project_id:
        query = query.filter(QualityObjective.project_id == project_id)
    if quality_factor:
        query = query.filter(QualityObjective.quality_factor.ilike(f"%{quality_factor}%"))
    if status_filter:
        query = query.filter(QualityObjective.status == status_filter)
    if priority_filter:
        query = query.filter(QualityObjective.priority == priority_filter)
    if owner_id:
        query = query.filter(QualityObjective.owner_id == owner_id)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (QualityObjective.title.ilike(s)) | (QualityObjective.description.ilike(s))
        )
    return query.order_by(QualityObjective.id.desc()).offset(skip).limit(limit).all()

@router.get("/objectives/{obj_id}", response_model=QualityObjectiveResponse)
def get_objective(
    obj_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve a single quality objective by ID."""
    obj = db.query(QualityObjective).filter(QualityObjective.id == obj_id).first()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Quality Objective {obj_id} not found")
    return obj

@router.post("/objectives", response_model=QualityObjectiveResponse, status_code=status.HTTP_201_CREATED)
def create_objective(
    data: QualityObjectiveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Administrator", "Quality Manager", "admin", "quality_manager"]))
):
    """Create a new quality objective (Quality Manager or Admin only)."""
    if not data.title or len(data.title.strip()) < 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Objective title must be at least 3 characters")
    if not data.quality_factor:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quality factor is required")
    if data.target_value is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A measurable target value is required for quality objectives")

    payload = data.model_dump()
    # Map compatibility fields if due_date / owner_id not set
    if not payload.get("due_date") and payload.get("deadline"):
        payload["due_date"] = payload["deadline"]
    if payload.get("unit") and not payload.get("measurement_unit"):
        payload["measurement_unit"] = payload["unit"]
    if not payload.get("owner_id"):
        payload["owner_id"] = current_user.id
    
    obj = QualityObjective(**payload)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    log_audit(db, current_user, "CREATE", "QualityObjective", str(obj.id), f"Created objective '{obj.title}'")
    return obj

@router.put("/objectives/{obj_id}", response_model=QualityObjectiveResponse)
def update_objective(
    obj_id: int,
    data: QualityObjectiveUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Administrator", "Quality Manager", "admin", "quality_manager"]))
):
    """Update a quality objective (Quality Manager or Admin only)."""
    obj = db.query(QualityObjective).filter(QualityObjective.id == obj_id).first()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Quality Objective {obj_id} not found")
    
    for k, v in data.model_dump(exclude_unset=True).items():
        if hasattr(obj, k) and v is not None:
            setattr(obj, k, v)
        elif k == "deadline" and v is not None:
            obj.due_date = v
        elif k == "unit" and v is not None:
            obj.measurement_unit = v
            
    db.commit()
    db.refresh(obj)
    log_audit(db, current_user, "UPDATE", "QualityObjective", str(obj.id), f"Updated objective '{obj.title}'")
    return obj

@router.delete("/objectives/{obj_id}", status_code=status.HTTP_200_OK)
def delete_objective(
    obj_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Administrator", "Quality Manager", "admin", "quality_manager"]))
):
    """Delete a quality objective (Quality Manager or Admin only)."""
    obj = db.query(QualityObjective).filter(QualityObjective.id == obj_id).first()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Quality Objective {obj_id} not found")
    
    title = obj.title
    db.delete(obj)
    db.commit()
    log_audit(db, current_user, "DELETE", "QualityObjective", str(obj_id), f"Deleted objective '{title}'")
    return {"message": f"Quality Objective '{title}' deleted successfully", "id": obj_id}


# Risk Assessments
@router.get("/risks", response_model=list[RiskAssessmentResponse])
def get_risks(project_id: int = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(RiskAssessment)
    if project_id:
        query = query.filter(RiskAssessment.project_id == project_id)
    return query.all()

@router.post("/risks", response_model=RiskAssessmentResponse)
def create_risk(
    data: RiskAssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Administrator", "Quality Manager", "admin", "quality_manager"]))
):
    risk = RiskAssessment(**data.dict())
    db.add(risk)
    db.commit()
    db.refresh(risk)
    log_audit(db, current_user, "CREATE", "RiskAssessment", str(risk.id), f"Created risk assessment: {risk.risk_item}")
    return risk

# QA Plans
@router.get("/qa-plans", response_model=list[QAPlanResponse])
def get_qa_plans(project_id: int = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(QualityAssurancePlan)
    if project_id:
        query = query.filter(QualityAssurancePlan.project_id == project_id)
    return query.all()

@router.post("/qa-plans", response_model=QAPlanResponse)
def create_qa_plan(
    data: QAPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "quality_manager"]))
):
    plan = QualityAssurancePlan(**data.dict())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    log_audit(db, current_user, "CREATE", "QualityAssurancePlan", str(plan.id), f"Created QA Plan: {plan.title}")
    return plan

# Milestones
@router.get("/milestones", response_model=list[MilestoneResponse])
def get_milestones(project_id: int = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(ProjectMilestone)
    if project_id:
        query = query.filter(ProjectMilestone.project_id == project_id)
    return query.all()

@router.post("/milestones", response_model=MilestoneResponse)
def create_milestone(
    data: MilestoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "quality_manager"]))
):
    ms = ProjectMilestone(**data.dict())
    db.add(ms)
    db.commit()
    db.refresh(ms)
    log_audit(db, current_user, "CREATE", "ProjectMilestone", str(ms.id), f"Created milestone {ms.name}")
    return ms
