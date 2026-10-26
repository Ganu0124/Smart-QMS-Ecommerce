from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database.connection import Base

def utc_now():
    return datetime.now(timezone.utc)

class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True)
    requirement_code = Column(String(50), unique=True, index=True, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    acceptance_criteria = Column(Text, nullable=False)
    category = Column(String(50), default="functional", nullable=False) # payment, checkout, security, inventory, catalog, compliance
    priority = Column(String(20), default="high", nullable=False) # critical, high, medium, low
    risk_level = Column(String(20), default="medium", nullable=False) # high, medium, low
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_status = Column(String(30), default="unreviewed", nullable=False) # unreviewed, in_review, passed, failed
    approval_status = Column(String(30), default="draft", nullable=False) # draft, submitted, in_review, approved, rejected
    current_version = Column(Integer, default=1, nullable=False)
    quality_objective_id = Column(Integer, ForeignKey("quality_objectives.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Compatibility attributes
    quality_factor = Column(String(50), default="reliability", nullable=False)
    is_mandatory = Column(Boolean, default=True, nullable=False)
    review_comments = Column(Text, nullable=True)

    # Aliases
    @property
    def req_code(self) -> str:
        return self.requirement_code

    @req_code.setter
    def req_code(self, value: str):
        self.requirement_code = value

    @property
    def status(self) -> str:
        return self.approval_status

    @status.setter
    def status(self, value: str):
        self.approval_status = value

    @property
    def version(self) -> int:
        return self.current_version

    @version.setter
    def version(self, value: int):
        self.current_version = value

    @property
    def author_id(self):
        return self.created_by

    @author_id.setter
    def author_id(self, val):
        self.created_by = val

    @property
    def reviewer_id(self):
        return self.assigned_to

    @reviewer_id.setter
    def reviewer_id(self, val):
        self.assigned_to = val

    def __init__(self, **kwargs):
        if "req_code" in kwargs and "requirement_code" not in kwargs:
            kwargs["requirement_code"] = kwargs.pop("req_code")
        if "status" in kwargs and "approval_status" not in kwargs:
            kwargs["approval_status"] = kwargs.pop("status")
        if "version" in kwargs and "current_version" not in kwargs:
            kwargs["current_version"] = kwargs.pop("version")
        if "author_id" in kwargs and "created_by" not in kwargs:
            kwargs["created_by"] = kwargs.pop("author_id")
        if "reviewer_id" in kwargs and "assigned_to" not in kwargs:
            kwargs["assigned_to"] = kwargs.pop("reviewer_id")
        super().__init__(**kwargs)

    # Relationships
    project = relationship("Project", back_populates="requirements")
    author = relationship("User", foreign_keys=[created_by], back_populates="requirements_authored")
    reviewer = relationship("User", foreign_keys=[assigned_to], back_populates="requirements_reviewed")
    quality_objective = relationship("QualityObjective", back_populates="requirements")
    versions = relationship("RequirementVersion", back_populates="requirement", cascade="all, delete-orphan")
    tasks = relationship("DevTask", back_populates="requirement")
    test_cases = relationship("TestCase", back_populates="requirement")
    defects = relationship("Defect", back_populates="requirement")
    reviews = relationship("Review", back_populates="requirement")

class RequirementVersion(Base):
    __tablename__ = "requirement_versions"

    id = Column(Integer, primary_key=True, index=True)
    requirement_id = Column(Integer, ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    acceptance_criteria = Column(Text, nullable=False)
    change_description = Column(Text, nullable=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Compatibility properties
    author = relationship("User", foreign_keys=[author_id])

    @property
    def version(self) -> int:
        return self.version_number

    @version.setter
    def version(self, val: int):
        self.version_number = val

    @property
    def changed_by(self) -> str:
        if self.author:
            return self.author.full_name or self.author.username
        return str(self.author_id or "System")

    @changed_by.setter
    def changed_by(self, val: str):
        pass

    @property
    def change_summary(self) -> str:
        return self.change_description or ""

    @change_summary.setter
    def change_summary(self, val: str):
        self.change_description = val

    @property
    def timestamp(self):
        return self.created_at

    @timestamp.setter
    def timestamp(self, val):
        self.created_at = val

    def __init__(self, **kwargs):
        if "version" in kwargs and "version_number" not in kwargs:
            kwargs["version_number"] = kwargs.pop("version")
        if "change_summary" in kwargs and "change_description" not in kwargs:
            kwargs["change_description"] = kwargs.pop("change_summary")
        if "timestamp" in kwargs and "created_at" not in kwargs:
            kwargs["created_at"] = kwargs.pop("timestamp")
        super().__init__(**kwargs)

    requirement = relationship("Requirement", back_populates="versions")


# Backwards compatible alias
RequirementHistory = RequirementVersion
