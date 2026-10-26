from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.all_schemas import AuditLogResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/audit", tags=["Audit Trail"])

@router.get("/logs", response_model=list[AuditLogResponse])
def get_audit_logs(
    entity_type: str = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(AuditLog).order_by(AuditLog.timestamp.desc())
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    return query.limit(limit).all()
