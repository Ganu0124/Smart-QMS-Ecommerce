# Re-export security and auth dependencies from core
from app.core.security import (
    get_password_hash as hash_password,
    verify_password,
    create_access_token as core_create_access_token,
    decode_access_token,
)
from app.core.dependencies import (
    get_current_user,
    get_current_active_user,
    require_roles,
    security,
)

def create_access_token(data: dict, expires_delta=None) -> str:
    sub = data.get("sub", "")
    role = data.get("role", "")
    user_id = data.get("id", data.get("user_id", 0))
    return core_create_access_token(subject=sub, role=role, user_id=user_id, expires_delta=expires_delta)

__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "decode_access_token",
    "get_current_user",
    "get_current_active_user",
    "require_roles",
    "security",
]
