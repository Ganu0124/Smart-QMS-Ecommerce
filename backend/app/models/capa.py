from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database.connection import Base

def utc_now():
    return datetime.now(timezone.utc)

class CAPA(Base):
    __tablename__ = "capas"

    id = Column(Integer, primary_key=True, index=True)
    capa_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. CAPA-2026-001
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    defect_id = Column(Integer, ForeignKey("defects.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    
    root_cause_analysis = Column(Text, nullable=False)
    immediate_correction = Column(Text, nullable=False)
    corrective_action = Column(Text, nullable=False)
    preventive_action = Column(Text, nullable=False)
    
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(30), default="open", nullable=False) # open, in_progress, pending_verification, closed
    
    verification_evidence = Column(Text, nullable=True)
    effectiveness_review = Column(Text, nullable=True)
    is_effective = Column(Boolean, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    # Aliases
    @property
    def root_cause(self) -> str:
        return self.root_cause_analysis

    @root_cause.setter
    def root_cause(self, val: str):
        self.root_cause_analysis = val

    @property
    def correction(self) -> str:
        return self.immediate_correction

    @correction.setter
    def correction(self, val: str):
        self.immediate_correction = val

    @property
    def verification_details(self) -> str:
        return self.verification_evidence

    @verification_details.setter
    def verification_details(self, val: str):
        self.verification_evidence = val

    # Relationships
    project = relationship("Project", back_populates="capas")
    defect = relationship("Defect", back_populates="capas")
    owner = relationship("User", foreign_keys=[owner_id], back_populates="capas_owned")

# Backwards compatible alias
CorrectiveAndPreventiveAction = CAPA

