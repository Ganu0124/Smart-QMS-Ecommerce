from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database.connection import Base

def utc_now():
    return datetime.now(timezone.utc)

class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    tc_code = Column(String(50), unique=True, index=True, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    requirement_id = Column(Integer, ForeignKey("requirements.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    scenario = Column(Text, nullable=False)
    preconditions = Column(Text, nullable=True)
    steps = Column(Text, nullable=False)
    expected_result = Column(Text, nullable=False)
    priority = Column(String(20), default="high", nullable=False) # critical, high, medium, low
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Compatibility attributes
    scenario_category = Column(String(50), default="e-commerce", nullable=False)
    is_mandatory = Column(Boolean, default=True, nullable=False)
    status = Column(String(20), default="not_run", nullable=False) # pass, fail, blocked, not_run
    actual_result = Column(Text, nullable=True)
    tester_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    execution_date = Column(DateTime(timezone=True), nullable=True)
    evidence_notes = Column(Text, nullable=True)
    evidence_url = Column(String(255), nullable=True)

    # Aliases
    @property
    def scenario_title(self) -> str:
        return self.title

    @scenario_title.setter
    def scenario_title(self, val: str):
        self.title = val

    @property
    def test_steps(self) -> str:
        return self.steps

    @test_steps.setter
    def test_steps(self, val: str):
        self.steps = val

    def __init__(self, **kwargs):
        if "scenario_title" in kwargs and "title" not in kwargs:
            kwargs["title"] = kwargs.pop("scenario_title")
        if "test_steps" in kwargs and "steps" not in kwargs:
            kwargs["steps"] = kwargs.pop("test_steps")
        if "scenario" not in kwargs or not kwargs["scenario"]:
            kwargs["scenario"] = kwargs.get("title", "Standard execution scenario")
        super().__init__(**kwargs)

    # Relationships
    project = relationship("Project", back_populates="test_cases")
    requirement = relationship("Requirement", back_populates="test_cases")
    tester = relationship("User", foreign_keys=[tester_id])
    executions = relationship("TestExecution", back_populates="test_case", cascade="all, delete-orphan")
    defects = relationship("Defect", back_populates="test_case")

class TestExecution(Base):
    __tablename__ = "test_executions"

    id = Column(Integer, primary_key=True, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    tester_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    execution_status = Column(String(20), nullable=False) # pass, fail, blocked
    actual_result = Column(Text, nullable=False)
    evidence_reference = Column(String(255), nullable=True)
    execution_timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    comments = Column(Text, nullable=True)

    test_case = relationship("TestCase", back_populates="executions")
    tester = relationship("User", back_populates="tests_executed")
