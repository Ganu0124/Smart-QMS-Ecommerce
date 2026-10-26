from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.review import Review, ReviewChecklistItem
from app.models.task import DevTask
from app.models.requirement import Requirement
from app.models.user import User
from app.schemas.all_schemas import ReviewCreate, ReviewUpdate, ReviewResponse, ChecklistItemUpdate, ChecklistItemResponse
from app.core.dependencies import get_current_user, require_roles
from app.services.audit import log_audit

router = APIRouter(prefix="/api/reviews", tags=["Design & Code Reviews"])

def utc_now():
    return datetime.now(timezone.utc)

# 1. 10-Point Requirements Review Checklist
DEFAULT_REQUIREMENT_CHECKLIST = [
    ("clarity", "Clarity and Unambiguity", "The requirement is stated clearly without ambiguity or contradictory terminology.", True),
    ("completeness", "Requirement Completeness", "All functional flows, boundary values, and system states are specified completely.", True),
    ("testability", "Measurable Acceptance Criteria", "Acceptance criteria are testable, measurable, and provable through automated testing.", True),
    ("consistency", "Cross-Requirement Consistency", "The requirement is fully consistent with existing system policies, rules, and architecture.", True),
    ("security", "Security and Privacy Implications", "Security implications, PCI-DSS compliance, and privacy constraints are addressed.", True),
    ("error_handling", "Error Handling & Recovery Conditions", "Failure modes, edge cases, timeouts, and recovery procedures are clearly specified.", True),
    ("dependencies", "Documented Dependencies", "External service and internal module dependencies are documented and verified.", True),
    ("feasibility", "Technical Feasibility", "The requirement is achievable within target technology stack, SLAs, and performance envelopes.", True),
    ("identifier", "Unique Identifier Enforcement", "Requirement has a unique code, proper classification, and versioning controls.", True),
    ("traceability", "Traceability to Planned Tests", "Requirement directly maps to planned test scenarios and verification cases.", True),
]

# 2. 10-Point Architecture & Design Review Checklist
DEFAULT_DESIGN_CHECKLIST = [
    ("architecture", "Architecture & Component Responsibilities", "Microservice/module boundaries, single responsibility, and event contracts clearly defined.", True),
    ("database", "Database Relationships & Consistency", "ACID guarantees, foreign key integrity, schema normalization, and optimistic locking on stock/orders.", True),
    ("transaction", "Transaction Integrity", "Atomic multi-step transaction boundaries and rollback mechanisms are defined.", True),
    ("payment_idempotency", "Duplicate Payment Prevention", "Unique transaction idempotency keys, atomic webhook ingestion, and double-charge prevention.", True),
    ("auth", "Authentication & Authorization", "JWT cryptographic validation, permission matrices, and principle of least privilege enforced.", True),
    ("validation", "Input Validation & Error Handling", "Server-side schema validation, sanitization, and standardized error responses without stack leaks.", True),
    ("security", "Security & Privacy", "Zero storage of plaintext payment credentials, tokenized secrets, and encrypted PII data.", True),
    ("performance", "Performance & Scalability", "Database query optimization, connection pooling, indexing, and non-blocking asynchronous IO.", True),
    ("recovery", "Recovery from Failed Transactions", "Payment gateway retry policies, dead letter queues, and graceful degradation.", True),
    ("maintainability", "Testability & Maintainability", "Modular design permitting isolated unit, integration, and contract testing.", True),
]

# 3. 10-Point Code Review Checklist
DEFAULT_CODE_CHECKLIST = [
    ("correctness", "Correctness of Implementation", "Implementation accurately fulfills requirement logic, specifications, and business rules.", True),
    ("consistency", "Consistency with Approved Requirements", "Code strictly adheres to the approved requirement scope without extraneous modifications.", True),
    ("error_handling", "Defensive Error Handling", "Exceptions are caught cleanly, logged contextually, and fail safely without crashing.", True),
    ("security", "Security & Authorization Controls", "Authentication and role checks are validated on backend endpoints; no hardcoded secrets.", True),
    ("transaction", "Transaction & Data Integrity", "Database transactions commit atomically; row locks and constraint checks prevent race conditions.", True),
    ("duplicate_prevention", "Duplicate Operation Prevention", "Idempotency keys and distributed locking prevent duplicate submissions and processing.", True),
    ("readability", "Readability & Maintainability", "Clean code structure, meaningful variable naming, and adherence to clean architecture principles.", True),
    ("test_coverage", "Automated Test Coverage", "Unit and integration tests cover happy paths, boundary conditions, and failure scenarios.", True),
    ("logging", "Logging & Exception Handling", "Audit and diagnostic logs record structured event details without leaking sensitive PII.", True),
    ("regression", "Regression Risk & Backward Compatibility", "No breaking changes to existing database schemas or API contracts.", True),
]

def generate_review_code(db: Session, project_id: int, review_type: str) -> str:
    if review_type == "design":
        prefix = "DR"
    elif review_type == "requirement":
        prefix = "RR"
    else:
        prefix = "CR"
    count = db.query(Review).filter(Review.project_id == project_id, Review.review_type == review_type).count() + 1
    return f"{prefix}-{project_id:02d}-{count:03d}"

@router.get("", response_model=List[ReviewResponse])
def get_reviews(
    project_id: Optional[int] = Query(None),
    review_type: Optional[str] = Query(None),
    requirement_id: Optional[int] = Query(None),
    task_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Review)
    if project_id:
        query = query.filter(Review.project_id == project_id)
    if review_type:
        query = query.filter(Review.review_type == review_type)
    if requirement_id:
        query = query.filter(Review.requirement_id == requirement_id)
    if task_id:
        query = query.filter(Review.task_id == task_id)
    return query.order_by(Review.id.desc()).all()

@router.get("/{review_id}", response_model=ReviewResponse)
def get_review(review_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rev = db.query(Review).filter(Review.id == review_id).first()
    if not rev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return rev

@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Administrator", "Quality Manager", "Reviewer", "Developer", "admin", "quality_manager", "reviewer", "developer"]))
):
    code = generate_review_code(db, data.project_id, data.review_type)
    rev = Review(
        review_code=code,
        project_id=data.project_id,
        review_type=data.review_type,
        title=data.title,
        target_ref=data.target_ref,
        requirement_id=data.requirement_id,
        task_id=data.task_id,
        reviewer_id=current_user.id,
        status="in_progress",
        is_baselined=False,
        created_at=utc_now()
    )
    db.add(rev)
    db.flush()

    # Populate checklists
    if data.checklist_items:
        for item in data.checklist_items:
            ci = ReviewChecklistItem(
                review_id=rev.id,
                category=item.category,
                checklist_description=item.description or item.item_name,
                is_mandatory=item.is_mandatory,
                review_result=item.result,
                comments=item.comments
            )
            db.add(ci)
    elif data.review_type == "design":
        for cat, name, desc, mand in DEFAULT_DESIGN_CHECKLIST:
            ci = ReviewChecklistItem(
                review_id=rev.id,
                category=cat,
                checklist_description=f"{name}: {desc}",
                is_mandatory=mand,
                review_result="pending"
            )
            db.add(ci)
    elif data.review_type == "requirement":
        for cat, name, desc, mand in DEFAULT_REQUIREMENT_CHECKLIST:
            ci = ReviewChecklistItem(
                review_id=rev.id,
                category=cat,
                checklist_description=f"{name}: {desc}",
                is_mandatory=mand,
                review_result="pending"
            )
            db.add(ci)
    elif data.review_type == "code":
        for cat, name, desc, mand in DEFAULT_CODE_CHECKLIST:
            ci = ReviewChecklistItem(
                review_id=rev.id,
                category=cat,
                checklist_description=f"{name}: {desc}",
                is_mandatory=mand,
                review_result="pending"
            )
            db.add(ci)

    # Link to task if applicable
    if data.task_id:
        task = db.query(DevTask).filter(DevTask.id == data.task_id).first()
        if task:
            task.review_id = rev.id
            task.status = "code_review"
            task.review_status = "needed"
            
    db.commit()
    db.refresh(rev)
    log_audit(db, current_user, "CREATE", "Review", rev.review_code, f"Created {rev.review_type} review: {rev.title}")
    return rev

@router.put("/checklist-items/{item_id}", response_model=ChecklistItemResponse)
def update_checklist_item(
    item_id: int,
    data: ChecklistItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Administrator", "Quality Manager", "Reviewer", "admin", "quality_manager", "reviewer"]))
):
    item = db.query(ReviewChecklistItem).filter(ReviewChecklistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checklist item not found")
        
    # Validation: Require an explanation when an item fails or is marked Not Applicable
    normalized_result = data.result.lower()
    if normalized_result in ["fail", "not_applicable", "not applicable", "n/a"]:
        if not data.comments or len(data.comments.strip()) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An explanatory comment (minimum 3 characters) is required when marking a checklist item as {data.result}."
            )

    item.review_result = normalized_result
    if data.comments is not None:
        item.comments = data.comments.strip()
    item.reviewer_id = current_user.id
        
    db.commit()
    db.refresh(item)
    log_audit(db, current_user, "UPDATE_CHECKLIST", "ReviewChecklistItem", str(item.id), f"Item set to {item.review_result}")
    return item

@router.put("/{review_id}", response_model=ReviewResponse)
def update_review_status(
    review_id: int,
    data: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Administrator", "Quality Manager", "Reviewer", "Developer", "admin", "quality_manager", "reviewer", "developer"]))
):
    rev = db.query(Review).filter(Review.id == review_id).first()
    if not rev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    target_status = (data.status or "").lower()
    target_outcome = (data.outcome or "").lower()
    is_approving = target_status in ["passed", "approved"] or target_outcome in ["passed", "approved"] or data.is_baselined is True

    # 1. Prevention of Self-Approval Rule: Developers must NOT approve their own code changes
    if rev.review_type == "code" and is_approving:
        linked_task = rev.task
        if not linked_task and rev.task_id:
            linked_task = db.query(DevTask).filter(DevTask.id == rev.task_id).first()
        
        if linked_task and linked_task.developer_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Segregation of Duties Violation: Developers are strictly prohibited from approving their own code reviews."
            )
        if current_user.role in ["Developer", "developer"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only authorized reviewers may approve code reviews. Developers are strictly prohibited from self-approval."
            )

    # 2. Mandatory Checklist Enforcement Rule:
    # Block approval or baselining while any mandatory checklist item fails or remains incomplete
    if is_approving:
        unresolved_mandatory = [
            i for i in rev.checklist_items 
            if i.is_mandatory and (i.review_result not in ["pass", "not_applicable", "not applicable"])
        ]
        if len(unresolved_mandatory) > 0:
            names = ", ".join([i.checklist_description.split(':')[0] for i in unresolved_mandatory[:3]])
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve or baseline review: Mandatory checklist items remain unresolved or failed ({names})."
            )

    if data.status:
        rev.status = target_status
    if data.outcome:
        rev.outcome = target_outcome
    elif is_approving:
        rev.outcome = "approved"
        rev.status = "passed"
    elif target_status in ["rework_required", "rework"]:
        rev.outcome = "rework_required"
        rev.status = "rework_required"
    elif target_status in ["failed", "rejected"]:
        rev.outcome = "rejected"
        rev.status = "failed"

    if data.outcome_notes is not None:
        rev.comments = data.outcome_notes
    if data.comments is not None:
        rev.comments = data.comments
    if data.is_baselined is not None:
        rev.is_baselined = data.is_baselined
        
    rev.reviewer_id = current_user.id
    rev.completion_time = utc_now()

    # Cascade to linked entity
    if rev.review_type == "code" and rev.task:
        if is_approving:
            rev.task.status = "approved"
            rev.task.review_status = "passed"
        elif target_status in ["rework_required", "rework"]:
            rev.task.status = "rework"
            rev.task.review_status = "in_rework"
        elif target_status in ["failed", "rejected"]:
            rev.task.status = "rework"
            rev.task.review_status = "failed"

    if rev.review_type == "requirement" and rev.requirement:
        if is_approving:
            rev.requirement.approval_status = "approved"
            rev.requirement.review_status = "passed"
        elif target_status in ["rework_required", "failed", "rejected"]:
            rev.requirement.approval_status = "rejected"
            rev.requirement.review_status = "failed"

    db.commit()
    db.refresh(rev)
    if data.is_baselined is True:
        log_audit(db, current_user, "BASELINED", "Review", rev.review_code, f"Design review baselined: '{rev.title}'")
    else:
        log_audit(db, current_user, "REVIEW_DECISION", "Review", rev.review_code, f"Review decision '{rev.status}' (baselined={rev.is_baselined})")
    return rev
