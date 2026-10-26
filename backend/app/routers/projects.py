from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.project import Project
from app.models.user import User
from app.schemas.all_schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from app.core.dependencies import get_current_user, require_roles
from app.services.audit import log_audit

router = APIRouter(prefix="/api/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectResponse])
def get_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all projects with pagination and optional search."""
    query = db.query(Project)
    if status_filter:
        query = query.filter(Project.status == status_filter)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter((Project.name.ilike(search_fmt)) | (Project.project_code.ilike(search_fmt)))
    
    return query.offset(skip).limit(limit).all()

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retrieve a single project by ID."""
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project with ID {project_id} not found")
    return proj

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Administrator", "Quality Manager", "admin", "quality_manager"]))
):
    """Create a new project (Administrator or Quality Manager only)."""
    p_code = (data.project_code or data.code or "").strip().upper()
    if not p_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project code is required")
        
    existing = db.query(Project).filter(Project.project_code == p_code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Project code '{p_code}' already exists")
    
    owner_id = data.project_owner_id or current_user.id
    project = Project(
        project_code=p_code,
        name=data.name,
        description=data.description,
        status=data.status,
        project_owner_id=owner_id,
        target_release_date=data.target_release_date
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    log_audit(db, current_user, "CREATE", "Project", project.project_code, f"Created project {project.name}")
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Administrator", "Quality Manager", "admin", "quality_manager"]))
):
    """Update project details (Administrator or Quality Manager only)."""
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project with ID {project_id} not found")
    
    for field, val in data.model_dump(exclude_unset=True).items():
        if hasattr(proj, field):
            setattr(proj, field, val)
        
    db.commit()
    db.refresh(proj)
    log_audit(db, current_user, "UPDATE", "Project", proj.project_code, f"Updated project {proj.name}")
    return proj

@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Administrator", "Quality Manager", "admin", "quality_manager"]))
):
    """Delete a project and cascade associated entities (Admin/Quality Manager only)."""
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project with ID {project_id} not found")

    p_code = proj.project_code
    db.delete(proj)
    db.commit()
    log_audit(db, current_user, "DELETE", "Project", p_code, f"Deleted project {p_code}")
    return {"message": f"Project {p_code} deleted successfully", "id": project_id}

