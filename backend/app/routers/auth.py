from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.user import User
from app.schemas.all_schemas import UserLogin, UserCreate, UserResponse, TokenResponse, PasswordChangeRequest
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.dependencies import get_current_user, require_roles
from app.services.audit import log_audit

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user with email (or username) and password, issuing a JWT access token."""
    ident = (login_data.email or login_data.username or "").strip()
    if not ident:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email or username is required"
        )
    
    user = db.query(User).filter(
        (User.email.ilike(ident)) | (User.username.ilike(ident))
    ).first()

    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    access_token = create_access_token(data={"sub": user.email, "username": user.username, "role": user.role, "id": user.id})
    log_audit(db, user, "LOGIN", "User", str(user.id), f"User {user.email} logged in successfully")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile and active role."""
    return current_user

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Stateless JWT logout endpoint.
    
    Because SmartQMS issues stateless, cryptographically signed JWT access tokens,
    session termination is finalized on the client by deleting the token from local storage.
    This endpoint verifies the token and records the audit log event.
    """
    log_audit(db, current_user, "LOGOUT", "User", str(current_user.id), f"User {current_user.email} logged out")
    return {
        "status": "success",
        "message": "Logged out successfully. Remove access token from client storage.",
        "stateless_jwt": True
    }

@router.post("/change-password")
def change_password(
    req: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allow an authenticated user to change their password after verifying current credentials."""
    if not verify_password(req.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    if len(req.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long"
        )
    if req.new_password == req.old_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as the current password"
        )
    
    current_user.password_hash = get_password_hash(req.new_password)
    current_user.must_change_password = False
    db.commit()
    log_audit(db, current_user, "PASSWORD_CHANGE", "User", str(current_user.id), "Password changed successfully")
    return {"message": "Password changed successfully"}

@router.get("/users", response_model=list[UserResponse])
def list_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List active system users for assignment dropdowns."""
    return db.query(User).filter(User.is_active == True).all()

@router.post("/register", response_model=UserResponse)
def register_user(
    user_data: UserCreate,
    current_user: User = Depends(require_roles(["Administrator", "admin"])),
    db: Session = Depends(get_db)
):
    """Administrator-only registration of new users."""
    existing = db.query(User).filter((User.email == user_data.email)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    if user_data.username:
        existing_username = db.query(User).filter(User.username == user_data.username).first()
        if existing_username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

    new_user = User(
        username=user_data.username or user_data.email.split("@")[0],
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        is_active=user_data.is_active,
        must_change_password=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    log_audit(db, current_user, "CREATE", "User", str(new_user.id), f"Created user {new_user.email} with role {new_user.role}")
    return new_user

