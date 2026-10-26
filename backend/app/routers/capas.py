import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.capa import CAPA
from app.models.user import User
from app.schemas.all_schemas import CAPACreate, CAPAUpdate, CAPAResponse
from app.services.auth import get_current_user, require_roles
from app.services.audit import log_audit

router = APIRouter(prefix="/api/capas", tags=["Corrective & Preventive Actions (CAPA)"])

def generate_capa_code(db: Session, project_id: int) -> str:
    count = db.query(CAPA).filter(CAPA.project_id == project_id).count() + 1
    year = datetime.datetime.now(datetime.timezone.utc).year
    return f"CAPA-{year}-{project_id:02d}-{count:03d}"

@router.get("", response_model=list[CAPAResponse])
def get_capas(
    project_id: int = None,
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CAPA)
    if project_id:
        query = query.filter(CAPA.project_id == project_id)
    if status_filter:
        query = query.filter(CAPA.status == status_filter)
    
    capas = query.all()
    now = datetime.datetime.now(datetime.timezone.utc)
    # Compute overdue flag
    result = []
    for c in capas:
        is_overdue = (c.status != "closed") and (c.due_date < now)
        c_dict = {
            "id": c.id,
            "capa_code": c.capa_code,
            "project_id": c.project_id,
            "defect_id": c.defect_id,
            "title": c.title,
            "root_cause_analysis": c.root_cause_analysis,
            "immediate_correction": c.immediate_correction,
            "corrective_action": c.corrective_action,
            "preventive_action": c.preventive_action,
            "owner_id": c.owner_id,
            "due_date": c.due_date,
            "status": c.status,
            "verification_evidence": c.verification_evidence,
            "effectiveness_review": c.effectiveness_review,
            "is_effective": c.is_effective,
            "created_at": c.created_at,
            "closed_at": c.closed_at,
            "is_overdue": is_overdue
        }
        result.append(CAPAResponse(**c_dict))
    return result

@router.get("/{capa_id}", response_model=CAPAResponse)
def get_capa(capa_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(CAPA).filter(CAPA.id == capa_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="CAPA not found")
    is_overdue = (c.status != "closed") and (c.due_date < datetime.datetime.now(datetime.timezone.utc))
    return CAPAResponse(
        id=c.id,
        capa_code=c.capa_code,
        project_id=c.project_id,
        defect_id=c.defect_id,
        title=c.title,
        root_cause_analysis=c.root_cause_analysis,
        immediate_correction=c.immediate_correction,
        corrective_action=c.corrective_action,
        preventive_action=c.preventive_action,
        owner_id=c.owner_id,
        due_date=c.due_date,
        status=c.status,
        verification_evidence=c.verification_evidence,
        effectiveness_review=c.effectiveness_review,
        is_effective=c.is_effective,
        created_at=c.created_at,
        closed_at=c.closed_at,
        is_overdue=is_overdue
    )

@router.post("", response_model=CAPAResponse)
def create_capa(
    data: CAPACreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    code = generate_capa_code(db, data.project_id)
    capa = CAPA(
        capa_code=code,
        project_id=data.project_id,
        defect_id=data.defect_id,
        title=data.title,
        root_cause_analysis=data.root_cause_analysis,
        immediate_correction=data.immediate_correction,
        corrective_action=data.corrective_action,
        preventive_action=data.preventive_action,
        owner_id=data.owner_id,
        due_date=data.due_date,
        status="open"
    )
    db.add(capa)
    db.commit()
    db.refresh(capa)
    log_audit(db, current_user, "CREATE", "CAPA", capa.capa_code, f"Created CAPA {capa.title}")
    return CAPAResponse(
        id=capa.id,
        capa_code=capa.capa_code,
        project_id=capa.project_id,
        defect_id=capa.defect_id,
        title=capa.title,
        root_cause_analysis=capa.root_cause_analysis,
        immediate_correction=capa.immediate_correction,
        corrective_action=capa.corrective_action,
        preventive_action=capa.preventive_action,
        owner_id=capa.owner_id,
        due_date=capa.due_date,
        status=capa.status,
        verification_evidence=capa.verification_evidence,
        effectiveness_review=capa.effectiveness_review,
        is_effective=capa.is_effective,
        created_at=capa.created_at,
        closed_at=capa.closed_at,
        is_overdue=False
    )

@router.put("/{capa_id}", response_model=CAPAResponse)
def update_capa(
    capa_id: int,
    data: CAPAUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    capa = db.query(CAPA).filter(CAPA.id == capa_id).first()
    if not capa:
        raise HTTPException(status_code=404, detail="CAPA not found")

    old_status = capa.status
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(capa, k, v)

    if data.status == "closed" and old_status != "closed":
        capa.closed_at = datetime.datetime.now(datetime.timezone.utc)

    db.commit()
    db.refresh(capa)
    is_overdue = (capa.status != "closed") and (capa.due_date < datetime.datetime.now(datetime.timezone.utc))
    log_audit(db, current_user, "UPDATE", "CAPA", capa.capa_code, f"Updated CAPA status: {capa.status}")
    return CAPAResponse(
        id=capa.id,
        capa_code=capa.capa_code,
        project_id=capa.project_id,
        defect_id=capa.defect_id,
        title=capa.title,
        root_cause_analysis=capa.root_cause_analysis,
        immediate_correction=capa.immediate_correction,
        corrective_action=capa.corrective_action,
        preventive_action=capa.preventive_action,
        owner_id=capa.owner_id,
        due_date=capa.due_date,
        status=capa.status,
        verification_evidence=capa.verification_evidence,
        effectiveness_review=capa.effectiveness_review,
        is_effective=capa.is_effective,
        created_at=capa.created_at,
        closed_at=capa.closed_at,
        is_overdue=is_overdue
    )
