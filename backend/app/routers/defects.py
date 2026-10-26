import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.defect import Defect, DefectHistory
from app.models.user import User
from app.schemas.all_schemas import DefectCreate, DefectUpdate, DefectStatusUpdate, DefectResponse
from app.services.auth import get_current_user, require_roles
from app.services.audit import log_audit

router = APIRouter(prefix="/api/defects", tags=["Defects & Non-Conformance"])

def generate_defect_code(db: Session, project_id: int) -> str:
    count = db.query(Defect).filter(Defect.project_id == project_id).count() + 1
    return f"DEF-{project_id:02d}-{count:03d}"

@router.get("", response_model=list[DefectResponse])
def get_defects(
    project_id: int = None,
    severity: str = None,
    status_filter: str = None,
    category: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Defect)
    if project_id:
        query = query.filter(Defect.project_id == project_id)
    if severity:
        query = query.filter(Defect.severity == severity)
    if status_filter:
        query = query.filter(Defect.status == status_filter)
    if category:
        query = query.filter(Defect.category == category)
    return query.all()

@router.get("/{defect_id}", response_model=DefectResponse)
def get_defect(defect_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    return defect

@router.post("", response_model=DefectResponse)
def create_defect(
    data: DefectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    code = generate_defect_code(db, data.project_id)
    defect = Defect(
        defect_code=code,
        project_id=data.project_id,
        requirement_id=data.requirement_id,
        test_case_id=data.test_case_id,
        title=data.title,
        description=data.description,
        category=data.category,
        severity=data.severity,
        priority=data.priority,
        affected_module=data.affected_module,
        steps_to_reproduce=data.steps_to_reproduce,
        expected_result=data.expected_result,
        actual_result=data.actual_result,
        assigned_to_id=data.assigned_to_id,
        is_production_leakage=data.is_production_leakage,
        status="open",
        retest_result="pending"
    )
    db.add(defect)
    db.flush()

    # Initial history record
    hist = DefectHistory(
        defect_id=defect.id,
        changed_by=current_user.username,
        old_status="none",
        new_status="open",
        comments="Defect reported and logged into registry"
    )
    db.add(hist)
    db.commit()
    db.refresh(defect)
    log_audit(db, current_user, "CREATE", "Defect", defect.defect_code, f"Logged {defect.severity} defect: {defect.title}")
    return defect

@router.put("/{defect_id}/status", response_model=DefectResponse)
def update_defect_status(
    defect_id: int,
    data: DefectStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    old_status = defect.status
    target_status = data.new_status

    # Preserve any updated resolution information
    if data.root_cause:
        defect.root_cause = data.root_cause
    if data.corrective_action:
        defect.corrective_action = data.corrective_action
    if data.preventive_action:
        defect.preventive_action = data.preventive_action
    if data.resolution_notes:
        defect.resolution_notes = data.resolution_notes

    # Retest evaluation rule:
    # If retesting fails, automatically reopen defect!
    if data.retest_result == "failed":
        target_status = "open"
        defect.retest_result = "failed"
        comments = f"Retest FAILED. Defect automatically reopened: {data.comments or 'Verification failed in retest'}"
    elif data.retest_result == "passed":
        defect.retest_result = "passed"
        comments = f"Retest PASSED. {data.comments or ''}"
    else:
        comments = data.comments or f"Status changed from {old_status} to {target_status}"

    defect.status = target_status

    if target_status == "closed":
        defect.closed_at = datetime.datetime.utcnow()
    elif old_status == "closed" and target_status != "closed":
        defect.closed_at = None

    hist = DefectHistory(
        defect_id=defect.id,
        changed_by=current_user.username,
        old_status=old_status,
        new_status=defect.status,
        comments=comments
    )
    db.add(hist)
    db.commit()
    db.refresh(defect)
    log_audit(db, current_user, "DEFECT_STATUS", "Defect", defect.defect_code, f"Transitioned {old_status} -> {defect.status}")
    return defect

@router.put("/{defect_id}", response_model=DefectResponse)
def update_defect_details(
    defect_id: int,
    data: DefectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    for k, v in data.dict(exclude_unset=True).items():
        setattr(defect, k, v)

    db.commit()
    db.refresh(defect)
    log_audit(db, current_user, "UPDATE", "Defect", defect.defect_code, "Updated defect fields")
    return defect
