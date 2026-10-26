from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

def utc_now():
    return datetime.now(timezone.utc)

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(30), default="active", nullable=False)  # active, planning, completed, archived
    project_owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    
    # Optional release planning date
    target_release_date = Column(DateTime(timezone=True), nullable=True)

    # Backward-compatible property for code
    @property
    def code(self) -> str:
        return self.project_code

    @code.setter
    def code(self, value: str):
        self.project_code = value

    def __init__(self, **kwargs):
        if "code" in kwargs and "project_code" not in kwargs:
            kwargs["project_code"] = kwargs.pop("code")
        super().__init__(**kwargs)

    # Relationships
    owner = relationship("User", back_populates="owned_projects", foreign_keys=[project_owner_id])
    objectives = relationship("QualityObjective", back_populates="project", cascade="all, delete-orphan")
    risk_assessments = relationship("RiskAssessment", back_populates="project", cascade="all, delete-orphan")
    qa_plans = relationship("QualityAssurancePlan", back_populates="project", cascade="all, delete-orphan")
    milestones = relationship("ProjectMilestone", back_populates="project", cascade="all, delete-orphan")
    requirements = relationship("Requirement", back_populates="project", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("DevTask", back_populates="project", cascade="all, delete-orphan")
    test_cases = relationship("TestCase", back_populates="project", cascade="all, delete-orphan")
    defects = relationship("Defect", back_populates="project", cascade="all, delete-orphan")
    releases = relationship("Release", back_populates="project", cascade="all, delete-orphan")
    metrics = relationship("QualityMetric", back_populates="project", cascade="all, delete-orphan")
    capas = relationship("CAPA", back_populates="project", cascade="all, delete-orphan")
