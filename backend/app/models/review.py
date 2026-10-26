from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database.connection import Base

def utc_now():
    return datetime.now(timezone.utc)

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    review_code = Column(String(50), unique=True, index=True, nullable=False)
    review_type = Column(String(30), nullable=False) # design, code
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    requirement_id = Column(Integer, ForeignKey("requirements.id", ondelete="SET NULL"), nullable=True, index=True)
    task_id = Column(Integer, ForeignKey("dev_tasks.id", ondelete="SET NULL", use_alter=True), nullable=True, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    outcome = Column(String(50), nullable=True) # passed, failed, rework_required
    comments = Column(Text, nullable=True)
    completion_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(30), default="in_progress", nullable=False) # draft, in_progress, passed, failed, rework_required
    
    # Additional review attributes
    title = Column(String(255), nullable=True)
    target_ref = Column(String(255), nullable=True)
    is_baselined = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Aliases
    @property
    def review_date(self):
        return self.completion_time or self.created_at

    @property
    def outcome_notes(self):
        return self.comments

    @outcome_notes.setter
    def outcome_notes(self, val):
        self.comments = val

    # Relationships
    project = relationship("Project", back_populates="reviews")
    requirement = relationship("Requirement", back_populates="reviews", foreign_keys=[requirement_id])
    task = relationship("DevTask", back_populates="reviews", foreign_keys=[task_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviews_conducted")
    checklist_items = relationship("ReviewChecklistItem", back_populates="review", cascade="all, delete-orphan")

class ReviewChecklistItem(Base):
    __tablename__ = "review_checklist_items"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(50), nullable=False)
    checklist_description = Column(Text, nullable=False)
    is_mandatory = Column(Boolean, default=True, nullable=False)
    review_result = Column(String(20), default="pending", nullable=False) # pass, fail, not_applicable, pending
    comments = Column(Text, nullable=True)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Aliases
    @property
    def item_name(self) -> str:
        if self.checklist_description and ": " in self.checklist_description:
            return self.checklist_description.split(": ", 1)[0]
        return self.checklist_description or ""

    @item_name.setter
    def item_name(self, value: str):
        if not self.checklist_description:
            self.checklist_description = value
        elif ": " in self.checklist_description:
            desc = self.checklist_description.split(": ", 1)[1]
            self.checklist_description = f"{value}: {desc}"
        else:
            self.checklist_description = value

    @property
    def description(self) -> str:
        if self.checklist_description and ": " in self.checklist_description:
            return self.checklist_description.split(": ", 1)[1]
        return self.checklist_description or ""

    @description.setter
    def description(self, value: str):
        if not self.checklist_description:
            self.checklist_description = value
        elif ": " in self.checklist_description:
            name = self.checklist_description.split(": ", 1)[0]
            self.checklist_description = f"{name}: {value}"
        else:
            self.checklist_description = value

    @property
    def result(self) -> str:
        return self.review_result

    @result.setter
    def result(self, value: str):
        self.review_result = value

    def __init__(self, **kwargs):
        if "description" in kwargs and "checklist_description" not in kwargs:
            kwargs["checklist_description"] = kwargs.pop("description")
        elif "item_name" in kwargs and "checklist_description" not in kwargs:
            kwargs["checklist_description"] = kwargs.pop("item_name")
        if "result" in kwargs and "review_result" not in kwargs:
            kwargs["review_result"] = kwargs.pop("result")
        super().__init__(**kwargs)

    review = relationship("Review", back_populates="checklist_items")
    reviewer = relationship("User", foreign_keys=[reviewer_id])

