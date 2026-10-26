from datetime import datetime, timedelta, timezone
from typing import Any, Union
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
import bcrypt
from app.core.config import settings

# Initialize Argon2 PasswordHasher with secure defaults
ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16
)

def get_password_hash(password: str) -> str:
    """Hashes a plaintext password using Argon2id."""
    return ph.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plaintext password against an Argon2 or bcrypt hash.
    Provides backwards compatibility for existing bcrypt-hashed records.
    """
    if not hashed_password:
        return False
    # Check if Argon2 hash
    if hashed_password.startswith("$argon2"):
        try:
            return ph.verify(hashed_password, plain_password)
        except (VerifyMismatchError, InvalidHashError):
            return False
        except Exception:
            return False
    # Check if bcrypt hash
    elif hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$") or hashed_password.startswith("$2y$"):
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except Exception:
            return False
    return False

def create_access_token(
    subject: Union[str, Any] = None,
    role: str = None,
    user_id: int = None,
    data: dict = None,
    expires_delta: timedelta = None
) -> str:
    """Generates a signed JWT access token with expiration time and user claims.
    Supports either a data dictionary or explicit subject/role/user_id arguments.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    payload = {
        "iat": now,
        "exp": expire,
    }

    if data:
        payload.update(data)
        if "sub" not in payload and subject:
            payload["sub"] = str(subject)
        elif "sub" in payload:
            payload["sub"] = str(payload["sub"])
        if "role" not in payload and role:
            payload["role"] = str(role)
        if "user_id" not in payload and "id" in payload:
            payload["user_id"] = payload["id"]
        elif "user_id" not in payload and user_id:
            payload["user_id"] = user_id
    else:
        payload["sub"] = str(subject or "")
        payload["role"] = str(role or "")
        payload["user_id"] = int(user_id or 0)

    encoded_jwt = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """
    Decodes and validates a JWT access token.
    Raises jwt.ExpiredSignatureError or jwt.InvalidTokenError upon failure.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
