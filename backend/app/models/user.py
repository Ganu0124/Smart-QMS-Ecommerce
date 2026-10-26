from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database.connection import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="Developer")  # Administrator, Quality Manager, Developer, Tester, Reviewer
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Optional / compatibility fields
    username = Column(String(50), unique=True, index=True, nullable=True)
    must_change_password = Column(Boolean, default=False, nullable=False)

    # Backward-compatible property for hashed_password
    @property
    def hashed_password(self) -> str:
        return self.password_hash

    @hashed_password.setter
    def hashed_password(self, value: str):
        self.password_hash = value

    def __init__(self, **kwargs):
        if "hashed_password" in kwargs and "password_hash" not in kwargs:
            kwargs["password_hash"] = kwargs.pop("hashed_password")
        super().__init__(**kwargs)

    # Relationships
    owned_projects = relationship("Project", back_populates="owner", foreign_keys="Project.project_owner_id")
    owned_objectives = relationship("QualityObjective", back_populates="owner", foreign_keys="QualityObjective.owner_id")
    requirements_authored = relationship("Requirement", foreign_keys="Requirement.created_by", back_populates="author")
    requirements_reviewed = relationship("Requirement", foreign_keys="Requirement.assigned_to", back_populates="reviewer")
    reviews_conducted = relationship("Review", foreign_keys="Review.reviewer_id", back_populates="reviewer")
    tasks_assigned = relationship("DevTask", foreign_keys="DevTask.developer_id", back_populates="developer")
    tests_executed = relationship("TestExecution", back_populates="tester")
    defects_assigned = relationship("Defect", foreign_keys="Defect.assigned_developer_id", back_populates="assigned_to")
    capas_owned = relationship("CAPA", foreign_keys="CAPA.owner_id", back_populates="owner")
    audit_logs = relationship("AuditLog", back_populates="user")
