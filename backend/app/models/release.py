from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database.connection import Base

def utc_now():
    return datetime.now(timezone.utc)

class Release(Base):
    __tablename__ = "releases"

    id = Column(Integer, primary_key=True, index=True)
    release_identifier = Column(String(50), unique=True, index=True, nullable=False) # e.g. REL-2026.01-RC1
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(String(100), nullable=False)
    status = Column(String(30), default="BLOCKED", nullable=False) # BLOCKED, READY_FOR_APPROVAL, APPROVED
    target_environment = Column(String(50), default="production", nullable=False) # production, staging, uat
    
    evaluator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    evaluation_timestamp = Column(DateTime(timezone=True), nullable=True)
    
    approved_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    
    approval_notes = Column(Text, nullable=True)
    approval_history = Column(Text, nullable=True) # JSON log of evaluation and sign-off events
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Aliases for backward compatibility
    @property
    def release_code(self) -> str:
        return self.release_identifier

    @release_code.setter
    def release_code(self, val: str):
        self.release_identifier = val

    @property
    def version_name(self) -> str:
        return self.version

    @version_name.setter
    def version_name(self, val: str):
        self.version = val

    @property
    def release_decision(self) -> str:
        return self.status

    @release_decision.setter
    def release_decision(self, val: str):
        self.status = val

    @property
    def evaluated_at(self):
        return self.evaluation_timestamp

    @evaluated_at.setter
    def evaluated_at(self, val):
        self.evaluation_timestamp = val

    def __init__(self, **kwargs):
        if "release_code" in kwargs and "release_identifier" not in kwargs:
            kwargs["release_identifier"] = kwargs.pop("release_code")
        if "version_name" in kwargs and "version" not in kwargs:
            kwargs["version"] = kwargs.pop("version_name")
        if "release_decision" in kwargs and "status" not in kwargs:
            kwargs["status"] = kwargs.pop("release_decision")
        if "evaluated_at" in kwargs and "evaluation_timestamp" not in kwargs:
            kwargs["evaluation_timestamp"] = kwargs.pop("evaluated_at")
        super().__init__(**kwargs)


    # Relationships
    project = relationship("Project", back_populates="releases")
    evaluator = relationship("User", foreign_keys=[evaluator_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    gate_results = relationship("ReleaseGateResult", back_populates="release", cascade="all, delete-orphan")

class ReleaseGateResult(Base):
    __tablename__ = "release_gate_results"

    id = Column(Integer, primary_key=True, index=True)
    release_id = Column(Integer, ForeignKey("releases.id", ondelete="CASCADE"), nullable=False, index=True)
    check_code = Column(String(50), nullable=False) # e.g. GATE-REQ, GATE-DESIGN, GATE-CODE, GATE-TEST, etc.
    check_name = Column(String(200), nullable=False)
    is_mandatory = Column(Boolean, default=True, nullable=False)
    status = Column(String(20), nullable=False) # PASS, FAIL
    explanation = Column(Text, nullable=False)
    related_record = Column(String(255), nullable=True)
    required_corrective_action = Column(Text, nullable=True)
    evaluation_timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    release = relationship("Release", back_populates="gate_results")

