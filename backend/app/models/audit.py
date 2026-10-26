from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

def utc_now():
    return datetime.now(timezone.utc)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    username = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False, index=True) # CREATE, UPDATE, APPROVE, REJECT, STATUS_CHANGE, GATE_EVALUATION, RELEASE_APPROVAL, CAPA_CLOSE
    entity_type = Column(String(50), nullable=False, index=True) # Project, Requirement, Review, TestCase, Defect, Release, CAPA
    entity_id = Column(String(50), nullable=False, index=True) # e.g. REQ-PAY-001 or id
    change_details = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    @property
    def affected_record_id(self) -> str:
        return self.entity_id

    @affected_record_id.setter
    def affected_record_id(self, val: str):
        self.entity_id = val

    user = relationship("User", back_populates="audit_logs")

