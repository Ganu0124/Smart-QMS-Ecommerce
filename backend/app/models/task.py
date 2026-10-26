from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

def utc_now():
    return datetime.now(timezone.utc)

class DevTask(Base):
    __tablename__ = "dev_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_code = Column(String(50), unique=True, index=True, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    requirement_id = Column(Integer, ForeignKey("requirements.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    developer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(30), default="todo", nullable=False) # todo, in_progress, code_review, rework, approved, completed
    priority = Column(String(20), default="high", nullable=False) # critical, high, medium, low
    due_date = Column(DateTime(timezone=True), nullable=True)
    code_reference = Column(String(255), nullable=True) # PR URL or Git branch
    review_status = Column(String(30), default="none", nullable=False) # none, needed, in_rework, passed
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="SET NULL", use_alter=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Aliases
    @property
    def pr_url(self):
        return self.code_reference

    @pr_url.setter
    def pr_url(self, val):
        self.code_reference = val

    @property
    def rework_status(self):
        return self.review_status

    @rework_status.setter
    def rework_status(self, val):
        self.review_status = val

    @property
    def branch(self):
        return self.code_reference

    @branch.setter
    def branch(self, val):
        self.code_reference = val

    def __init__(self, **kwargs):
        if "branch" in kwargs and "code_reference" not in kwargs:
            kwargs["code_reference"] = kwargs.pop("branch")
        elif "pr_url" in kwargs and "code_reference" not in kwargs:
            kwargs["code_reference"] = kwargs.pop("pr_url")
        if "rework_status" in kwargs and "review_status" not in kwargs:
            kwargs["review_status"] = kwargs.pop("rework_status")
        super().__init__(**kwargs)


    # Relationships
    project = relationship("Project", back_populates="tasks")
    requirement = relationship("Requirement", back_populates="tasks")
    developer = relationship("User", foreign_keys=[developer_id], back_populates="tasks_assigned")
    review = relationship("Review", foreign_keys=[review_id])
    reviews = relationship("Review", back_populates="task", foreign_keys="Review.task_id")
