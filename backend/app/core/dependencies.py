from typing import List, Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.core.config import settings
from app.core.security import decode_access_token

security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Validates JWT Bearer access token and retrieves active authenticated user.
    """
    # Lazy import to avoid circular dependency
    from app.models.user import User

    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        identifier: str = payload.get("sub")
        if not identifier:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload is invalid (missing subject).",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.InvalidTokenError, Exception):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token signature.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Search user by email or username or id
    user = db.query(User).filter(
        (User.email == identifier) | (User.username == identifier)
    ).first()

    if not user:
        # Fallback check by id
        try:
            user_id = int(payload.get("user_id", -1))
            user = db.query(User).filter(User.id == user_id).first()
        except Exception:
            user = None

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with this token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact an Administrator.",
        )

    return user

def get_current_active_user(current_user = Depends(get_current_user)):
    return current_user

# Standardized role normalization mapping
ROLE_NORMALIZATION = {
    "admin": "Administrator",
    "administrator": "Administrator",
    "quality_manager": "Quality Manager",
    "quality manager": "Quality Manager",
    "developer": "Developer",
    "tester": "Tester",
    "reviewer": "Reviewer"
}

def normalize_role(role_name: str) -> str:
    if not role_name:
        return ""
    cleaned = role_name.strip().lower()
    return ROLE_NORMALIZATION.get(cleaned, role_name.strip())

def require_roles(allowed_roles: List[str]):
    """
    Enforces role-based access control (RBAC).
    Accepts both internal and display names (e.g., 'quality_manager' or 'Quality Manager').
    """
    normalized_allowed = {normalize_role(r) for r in allowed_roles}

    def role_verifier(current_user = Depends(get_current_user)):
        user_role_norm = normalize_role(current_user.role)
        if user_role_norm not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Requires one of [{', '.join(allowed_roles)}]. Your role is '{current_user.role}'."
            )
        return current_user

    return role_verifier
