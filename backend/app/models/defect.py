from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship, synonym
from app.database.connection import Base

def utc_now():
    return datetime.now(timezone.utc)

class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, index=True)
    defect_identifier = Column(String(50), unique=True, index=True, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    requirement_id = Column(Integer, ForeignKey("requirements.id", ondelete="SET NULL"), nullable=True, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    # categories: functional, payment_transaction, security, performance, data_integrity, usability, requirements, design, testing, documentation
    severity = Column(String(20), nullable=False) # critical, high, medium, low
    priority = Column(String(20), nullable=False) # critical, high, medium, low
    affected_module = Column(String(100), nullable=False) # e.g. Payment Gateway, Checkout, Cart, Catalog, Auth
    assigned_developer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    root_cause = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    lifecycle_status = Column(String(30), default="open", nullable=False) # open, assigned, in_progress, fixed, retest, closed
    
    # Additional engineering attributes
    corrective_action = Column(Text, nullable=True)
    preventive_action = Column(Text, nullable=True)
    steps_to_reproduce = Column(Text, nullable=True)
    expected_result = Column(Text, nullable=True)
    actual_result = Column(Text, nullable=True)
    retest_result = Column(String(20), default="pending", nullable=False) # passed, failed, pending
    is_production_leakage = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    # Aliases with SQLAlchemy synonym for SQL expression and ORM compatibility
    defect_code = synonym("defect_identifier")
    status = synonym("lifecycle_status")
    assigned_to_id = synonym("assigned_developer_id")


    def __init__(self, **kwargs):
        if "defect_code" in kwargs and "defect_identifier" not in kwargs:
            kwargs["defect_identifier"] = kwargs.pop("defect_code")
        if "status" in kwargs and "lifecycle_status" not in kwargs:
            kwargs["lifecycle_status"] = kwargs.pop("status")
        if "assigned_to_id" in kwargs and "assigned_developer_id" not in kwargs:
            kwargs["assigned_developer_id"] = kwargs.pop("assigned_to_id")
        super().__init__(**kwargs)

    # Relationships
    project = relationship("Project", back_populates="defects")
    requirement = relationship("Requirement", back_populates="defects")
    test_case = relationship("TestCase", back_populates="defects")
    assigned_to = relationship("User", foreign_keys=[assigned_developer_id], back_populates="defects_assigned")
    history = relationship("DefectHistory", back_populates="defect", cascade="all, delete-orphan")
    capas = relationship("CAPA", back_populates="defect")

class DefectHistory(Base):
    __tablename__ = "defect_history"

    id = Column(Integer, primary_key=True, index=True)
    defect_id = Column(Integer, ForeignKey("defects.id", ondelete="CASCADE"), nullable=False, index=True)
    status_change_from = Column(String(30), nullable=False)
    status_change_to = Column(String(30), nullable=False)
    comments = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    changed_by = Column(String(100), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Aliases
    @property
    def old_status(self) -> str:
        return self.status_change_from

    @old_status.setter
    def old_status(self, val: str):
        self.status_change_from = val

    @property
    def new_status(self) -> str:
        return self.status_change_to

    @new_status.setter
    def new_status(self, val: str):
        self.status_change_to = val

    def __init__(self, **kwargs):
        if "old_status" in kwargs and "status_change_from" not in kwargs:
            kwargs["status_change_from"] = kwargs.pop("old_status")
        if "new_status" in kwargs and "status_change_to" not in kwargs:
            kwargs["status_change_to"] = kwargs.pop("new_status")
        super().__init__(**kwargs)

    defect = relationship("Defect", back_populates="history")
    user = relationship("User", foreign_keys=[user_id])

