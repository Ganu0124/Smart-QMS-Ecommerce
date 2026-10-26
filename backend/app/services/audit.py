from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.models.user import User

def log_audit(
    db: Session,
    user: User,
    action: str,
    entity_type: str,
    entity_id: str,
    change_details: str = None
):
    audit_entry = AuditLog(
        user_id=user.id if user else None,
        username=user.username if user else "SYSTEM",
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        change_details=change_details
    )
    db.add(audit_entry)
    db.commit()
