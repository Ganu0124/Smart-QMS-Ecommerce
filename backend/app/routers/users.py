"""User Management CRUD router for SmartQMS with RBAC."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.user import User
from app.schemas.all_schemas import UserCreate, UserUpdate, UserResponse
from app.core.security import get_password_hash
from app.core.dependencies import get_current_user, require_roles
from app.services.audit import log_audit

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
def get_users(
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    role: Optional[str] = Query(None, description="Filter by role"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve users with pagination and filtering."""
    query = db.query(User)
    if role:
        query = query.filter(User.role.ilike(f"%{role}%"))
    if search:
        search_fmt = f"%{search}%"
        query = query.filter((User.full_name.ilike(search_fmt)) | (User.email.ilike(search_fmt)))
    
    return query.offset(skip).limit(limit).all()

@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve a single user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")
    return user

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    current_user: User = Depends(require_roles(["Administrator", "admin"])),
    db: Session = Depends(get_db)
):
    """Create a new user account (Administrator only)."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered")
    
    if data.username:
        existing_username = db.query(User).filter(User.username == data.username).first()
        if existing_username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")

    new_user = User(
        username=data.username or data.email.split("@")[0],
        email=data.email,
        full_name=data.full_name,
        password_hash=get_password_hash(data.password),
        role=data.role,
        is_active=data.is_active,
        must_change_password=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    log_audit(db, current_user, "CREATE", "User", str(new_user.id), f"Created user {new_user.email} with role {new_user.role}")
    return new_user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    current_user: User = Depends(require_roles(["Administrator", "admin"])),
    db: Session = Depends(get_db)
):
    """Update a user's details, role, or active status (Administrator only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")

    if data.email and data.email != user.email:
        conflict = db.query(User).filter(User.email == data.email, User.id != user_id).first()
        if conflict:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already used by another account")
        user.email = data.email

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.password:
        user.password_hash = get_password_hash(data.password)

    db.commit()
    db.refresh(user)
    log_audit(db, current_user, "UPDATE", "User", str(user.id), f"Updated user {user.email}")
    return user

@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(
    user_id: int,
    current_user: User = Depends(require_roles(["Administrator", "admin"])),
    db: Session = Depends(get_db)
):
    """Deactivate or remove a user account (Administrator only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Administrator cannot delete their own account")

    # Soft-deactivate by setting is_active=False to preserve audit trail
    user.is_active = False
    db.commit()
    log_audit(db, current_user, "DELETE", "User", str(user.id), f"Deactivated user {user.email}")
    return {"message": f"User {user.email} deactivated successfully", "id": user_id}
