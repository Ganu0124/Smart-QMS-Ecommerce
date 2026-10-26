from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.database.connection import Base

def utc_now():
    return datetime.now(timezone.utc)

class QualityObjective(Base):
    __tablename__ = "quality_objectives"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    quality_factor = Column(String(50), nullable=False) # reliability, security, correctness, data_integrity, efficiency, usability, maintainability, testability
    target_value = Column(Float, nullable=True)
    measurement_unit = Column(String(50), default="%", nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    priority = Column(String(20), default="high", nullable=False) # critical, high, medium, low
    status = Column(String(30), default="in_progress", nullable=False) # not_started, in_progress, achieved, at_risk, overdue
    
    # Backward-compatible fields
    measurable_target = Column(String(200), nullable=True)
    metric_key = Column(String(100), nullable=True)
    responsible_owner = Column(String(100), nullable=True)

    @property
    def deadline(self):
        return self.due_date

    @deadline.setter
    def deadline(self, val):
        self.due_date = val

    @property
    def unit(self):
        return self.measurement_unit or "%"

    @unit.setter
    def unit(self, val):
        self.measurement_unit = val

    def __init__(self, **kwargs):
        if "deadline" in kwargs and "due_date" not in kwargs:
            kwargs["due_date"] = kwargs.pop("deadline")
        if "unit" in kwargs and "measurement_unit" not in kwargs:
            kwargs["measurement_unit"] = kwargs.pop("unit")
        super().__init__(**kwargs)

    project = relationship("Project", back_populates="objectives")
    owner = relationship("User", back_populates="owned_objectives", foreign_keys=[owner_id])
    requirements = relationship("Requirement", back_populates="quality_objective")

class QualityMetric(Base):
    __tablename__ = "quality_metrics"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    metric_key = Column(String(50), nullable=True, index=True) # DevP, CRe, DocRe
    metric_name = Column(String(100), nullable=False, index=True)
    formula = Column(String(255), nullable=True)
    raw_inputs = Column(Text, nullable=True) # JSON of inputs
    value = Column(Float, nullable=False)
    unit = Column(String(50), default="%", nullable=False)
    interpretation = Column(Text, nullable=True)
    measurement_date = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    calculation_details = Column(Text, nullable=True)
    recorded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    project = relationship("Project", back_populates="metrics")
    recorded_by = relationship("User", foreign_keys=[recorded_by_id])

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    risk_item = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False) # payment, data_integrity, security, performance, compliance
    probability = Column(String(20), nullable=False) # high, medium, low
    impact = Column(String(20), nullable=False)      # high, medium, low
    risk_score = Column(Integer, default=5, nullable=False) # 1 to 25
    mitigation_strategy = Column(Text, nullable=False)
    status = Column(String(30), default="mitigated", nullable=False) # identified, analyzing, mitigating, mitigated, closed

    project = relationship("Project", back_populates="risk_assessments")

class QualityAssurancePlan(Base):
    __tablename__ = "quality_assurance_plans"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(String(20), default="1.0", nullable=False)
    title = Column(String(200), nullable=False)
    scope = Column(Text, nullable=False)
    quality_standards = Column(Text, nullable=False)
    review_cadence = Column(String(100), nullable=False)
    release_criteria_summary = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    project = relationship("Project", back_populates="qa_plans")

class ProjectMilestone(Base):
    __tablename__ = "project_milestones"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    target_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(30), default="pending", nullable=False) # pending, in_progress, completed, delayed
    criteria = Column(Text, nullable=True)

    project = relationship("Project", back_populates="milestones")
