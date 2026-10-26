from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.task import DevTask
from app.models.review import Review, ReviewChecklistItem
from app.models.requirement import Requirement
from app.models.user import User
from app.schemas.all_schemas import TaskCreate, TaskUpdate, TaskResponse
from app.core.dependencies import get_current_user, require_roles
from app.services.audit import log_audit
from app.routers.reviews import DEFAULT_CODE_CHECKLIST, generate_review_code

router = APIRouter(prefix="/api/tasks", tags=["Development Tasks"])

def utc_now():
    return datetime.now(timezone.utc)

def generate_task_code(db: Session, project_id: int) -> str:
    count = db.query(DevTask).filter(DevTask.project_id == project_id).count() + 1
    return f"TASK-{project_id:02d}-{count:03d}"

@router.get("", response_model=List[TaskResponse])
def get_tasks(
    project_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    developer_id: Optional[int] = Query(None),
    requirement_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(DevTask)
    if project_id:
        query = query.filter(DevTask.project_id == project_id)
    if status_filter:
        query = query.filter(DevTask.status == status_filter)
    if priority_filter:
        query = query.filter(DevTask.priority == priority_filter)
    if developer_id:
        query = query.filter(DevTask.developer_id == developer_id)
    if requirement_id:
        query = query.filter(DevTask.requirement_id == requirement_id)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (DevTask.title.ilike(s)) |
            (DevTask.task_code.ilike(s)) |
            (DevTask.description.ilike(s))
        )
    return query.order_by(DevTask.id.desc()).all()

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(DevTask).filter(DevTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found")
    return task

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # If linked to a requirement, ensure requirement exists
    if data.requirement_id:
        req = db.query(Requirement).filter(Requirement.id == data.requirement_id).first()
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Linked requirement {data.requirement_id} not found")

    code = generate_task_code(db, data.project_id)
    task = DevTask(
        task_code=code,
        project_id=data.project_id,
        requirement_id=data.requirement_id,
        title=data.title.strip(),
        description=data.description,
        developer_id=data.developer_id or current_user.id,
        priority=data.priority or "high",
        due_date=data.due_date,
        code_reference=data.pr_url or data.branch,
        status="todo",
        review_status="none",
        created_at=utc_now()
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    log_audit(db, current_user, "CREATE", "DevTask", task.task_code, f"Created task: '{task.title}'")
    return task

@router.post("/{task_id}/request-review", response_model=TaskResponse)
def request_code_review(
    task_id: int,
    pr_url: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    reviewer_id: Optional[int] = Query(None),
    notes: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(DevTask).filter(DevTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found")

    if pr_url or branch:
        task.code_reference = pr_url or branch

    # Create a new Code Review record with 10 standard checklist items if not already linked
    rev = None
    if task.review_id:
        rev = db.query(Review).filter(Review.id == task.review_id).first()
    
    if not rev:
        code = generate_review_code(db, task.project_id, "code")
        rev = Review(
            review_code=code,
            project_id=task.project_id,
            review_type="code",
            title=f"Code Review: {task.task_code} - {task.title}",
            target_ref=task.code_reference or f"PR on {task.task_code}",
            requirement_id=task.requirement_id,
            task_id=task.id,
            reviewer_id=reviewer_id,
            comments=notes,
            status="in_progress",
            is_baselined=False,
            created_at=utc_now()
        )
        db.add(rev)
        db.flush()

        for cat, name, desc, mand in DEFAULT_CODE_CHECKLIST:
            ci = ReviewChecklistItem(
                review_id=rev.id,
                category=cat,
                checklist_description=f"{name}: {desc}",
                is_mandatory=mand,
                review_result="pending"
            )
            db.add(ci)
    else:
        if reviewer_id:
            rev.reviewer_id = reviewer_id
        if notes:
            rev.comments = notes

    task.review_id = rev.id
    task.status = "code_review"
    task.review_status = "needed"

    db.commit()
    db.refresh(task)
    log_audit(db, current_user, "REQUEST_REVIEW", "DevTask", task.task_code, f"Requested code review {rev.review_code}")
    return task

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(DevTask).filter(DevTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found")

    # Business rule: Require documented approved code review before task can transition to completed!
    if data.status == "completed":
        if not task.review_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task cannot be completed without a linked code review record."
            )
        review = db.query(Review).filter(Review.id == task.review_id).first()
        if not review or review.status != "passed":
            code = review.review_code if review else "N/A"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Task completion blocked: Linked code review '{code}' has not been approved."
            )

    for k, v in data.model_dump(exclude_unset=True).items():
        if hasattr(task, k) and v is not None:
            setattr(task, k, v)
        elif k == "pr_url" and v is not None:
            task.code_reference = v
        elif k == "branch" and v is not None:
            task.code_reference = v
        
    db.commit()
    db.refresh(task)
    log_audit(db, current_user, "UPDATE", "DevTask", task.task_code, f"Updated task status to '{task.status}'")
    return task
