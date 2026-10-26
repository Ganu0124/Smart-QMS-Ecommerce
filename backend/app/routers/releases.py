import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.release import Release
from app.models.user import User
from app.schemas.all_schemas import ReleaseCreate, ReleaseResponse, ReleaseApproveRequest
from app.services.auth import get_current_user, require_roles
from app.services.gate_engine import evaluate_release_gate
from app.services.audit import log_audit

router = APIRouter(prefix="/api/releases", tags=["Smart Release Gate"])

def generate_release_code(db: Session, project_id: int) -> str:
    count = db.query(Release).filter(Release.project_id == project_id).count() + 1
    return f"REL-{project_id:02d}-{count:03d}"

@router.get("", response_model=list[ReleaseResponse])
def get_releases(
    project_id: int = None,
    decision: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Release)
    if project_id:
        query = query.filter(Release.project_id == project_id)
    if decision:
        query = query.filter(Release.release_decision == decision)
    return query.all()

@router.get("/{release_id}", response_model=ReleaseResponse)
def get_release(release_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rel = db.query(Release).filter(Release.id == release_id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Release not found")
    return rel

@router.post("", response_model=ReleaseResponse)
def create_release(
    data: ReleaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "quality_manager"]))
):
    code = generate_release_code(db, data.project_id)
    release = Release(
        release_code=code,
        project_id=data.project_id,
        version_name=data.version_name,
        target_environment=data.target_environment,
        release_decision="BLOCKED",
        approval_history=f"[{datetime.datetime.now(datetime.timezone.utc).isoformat()}] Release created by {current_user.username}"
    )
    db.add(release)
    db.commit()
    db.refresh(release)

    # Automatically run initial evaluation
    evaluate_release_gate(db, release, current_user)
    log_audit(db, current_user, "CREATE", "Release", release.release_code, f"Created release candidate {release.version_name}")
    return release

@router.post("/{release_id}/evaluate", response_model=ReleaseResponse)
def evaluate_release(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    release = db.query(Release).filter(Release.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")

    evaluated = evaluate_release_gate(db, release, current_user)
    log_audit(
        db,
        current_user,
        "GATE_EVALUATION",
        "Release",
        release.release_code,
        f"Smart Release Gate evaluated. Decision: {evaluated.release_decision}"
    )
    return evaluated

@router.post("/{release_id}/approve", response_model=ReleaseResponse)
def approve_release(
    release_id: int,
    data: ReleaseApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "quality_manager"]))
):
    release = db.query(Release).filter(Release.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")

    # Strict Rule: Cannot approve if release_decision is BLOCKED or any mandatory check fails!
    # Freshly check current gate results
    failed_mandatory = [g for g in release.gate_results if g.is_mandatory and g.status == "FAIL"]
    if len(failed_mandatory) > 0 or release.release_decision == "BLOCKED":
        failed_names = ", ".join([g.check_name for g in failed_mandatory])
        raise HTTPException(
            status_code=400,
            detail=f"Release approval prohibited by Smart Release Gate: Mandatory criteria failed ({failed_names}). You cannot bypass quality gates."
        )

    if release.release_decision != "READY_FOR_APPROVAL":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve release with status '{release.release_decision}'. Must be in 'READY_FOR_APPROVAL' state."
        )

    release.release_decision = "APPROVED"
    release.approved_by_id = current_user.id
    release.approved_at = datetime.datetime.now(datetime.timezone.utc)
    release.approval_notes = data.notes

    approval_log = f"[{release.approved_at.isoformat()}] Formally APPROVED for {release.target_environment} deployment by {current_user.full_name} ({current_user.role})"
    if data.notes:
        approval_log += f" - Notes: {data.notes}"
        
    release.approval_history += f"\n{approval_log}"
    db.commit()
    db.refresh(release)

    log_audit(
        db,
        current_user,
        "RELEASE_APPROVAL",
        "Release",
        release.release_code,
        f"Formally approved deployment to {release.target_environment}"
    )
    return release
