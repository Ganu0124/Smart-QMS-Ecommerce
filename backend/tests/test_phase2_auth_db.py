"""Comprehensive Automated Test Suite for Phase 2:
Backend, SQLite Database and Authentication.

Tests cover:
1. Database initialization.
2. User creation.
3. Password hashing and verification (Argon2 + bcrypt fallback).
4. Successful login (both email and username).
5. Invalid login credentials (wrong password & unknown email).
6. Expired or invalid tokens.
7. Authenticated profile retrieval (/api/auth/me).
8. Role-based access control (RBAC permission matrix & unauthorized access).
9. Duplicate email rejection.
10. Project CRUD operations.
11. Quality objective CRUD operations.
12. Foreign-key integrity (SQLite foreign key enforcement).
13. Unauthorized API requests (missing credentials).

Uses a dedicated, separate SQLite database (test_smartqms.db).
NEVER touches or deletes the development database (smart_qms.db).
"""

import os
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import IntegrityError
from fastapi.testclient import TestClient

from app.database.connection import Base, get_db
from app.database.init_db import init_db
from app.models.user import User
from app.models.project import Project
from app.models.quality_plan import QualityObjective
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token
)
from app.main import app

# Dedicated separate test database path
TEST_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_smartqms.db"))
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

# Test engine with foreign key enforcement
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

@event.listens_for(test_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.close()

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create clean tables on the dedicated test database before tests and cleanup afterwards."""
    # Ensure any previous test db is removed
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

    # Build schema and seed initial data
    Base.metadata.create_all(bind=test_engine)
    session = TestSessionLocal()
    init_db(drop_all=False, session=session)
    session.close()

    yield

    # Teardown: close engine connections and remove test db
    test_engine.dispose()
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

@pytest.fixture
def db_session():
    """Provide a transactional database session for tests."""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def client(db_session):
    """Provide a TestClient with get_db overridden to use the test database."""
    def override_get_db():
        session = TestSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# =========================================================================
# 1. Database Initialization Test
# =========================================================================
def test_1_database_initialization(db_session: Session):
    """Verify database schema is initialized and 5 core development accounts exist."""
    users = db_session.query(User).all()
    roles = {u.role for u in users}
    
    assert len(users) >= 5, f"Expected at least 5 seeded users, got {len(users)}"
    assert "Administrator" in roles or "admin" in roles
    assert "Quality Manager" in roles or "quality_manager" in roles
    assert "Developer" in roles or "developer" in roles
    assert "Tester" in roles or "tester" in roles
    assert "Reviewer" in roles or "reviewer" in roles

    # Verify sample project exists
    project = db_session.query(Project).filter(Project.project_code == "ECOMM-CORE").first()
    assert project is not None
    assert project.name == "E-Commerce Core Platform"

    # Verify quality objectives exist
    objectives = db_session.query(QualityObjective).filter(QualityObjective.project_id == project.id).all()
    assert len(objectives) >= 4


# =========================================================================
# 2. User Creation Test
# =========================================================================
def test_2_user_creation(db_session: Session):
    """Verify user creation with fields, roles, and timezone-aware timestamps."""
    email = f"testuser_{datetime.now(timezone.utc).timestamp()}@smartqms.io"
    user = User(
        full_name="Integration Tester",
        email=email,
        username="integration_user",
        password_hash=get_password_hash("SecurePass!123"),
        role="Developer",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert user.id is not None
    assert user.email == email
    assert user.role == "Developer"
    assert user.is_active is True
    assert user.created_at is not None



# =========================================================================
# 3. Password Hashing & Verification Test (Argon2 + bcrypt fallback)
# =========================================================================
def test_3_password_hashing_and_verification():
    """Verify password hashing with Argon2id and fallback verification."""
    plain_password = "SecretPassword@2026"
    argon2_hash = get_password_hash(plain_password)

    # Must start with $argon2id$
    assert argon2_hash.startswith("$argon2id$")
    assert verify_password(plain_password, argon2_hash) is True
    assert verify_password("WrongPassword!", argon2_hash) is False

    # Backwards compatibility check with legacy bcrypt hash
    # Example bcrypt hash for 'bcrypt_secret'
    import bcrypt
    bcrypt_hash = bcrypt.hashpw(b"bcrypt_secret", bcrypt.gensalt()).decode("utf-8")
    assert verify_password("bcrypt_secret", bcrypt_hash) is True
    assert verify_password("wrong_bcrypt", bcrypt_hash) is False


# =========================================================================
# 4. Successful Login Test (Email and Username)
# =========================================================================
def test_4_successful_login(client: TestClient):
    """Verify login using both email and username formats, returning JWT access token."""
    # Login via Email
    res_email = client.post("/api/auth/login", json={
        "email": "admin@smartqms.io",
        "password": "Admin@12345"
    })
    assert res_email.status_code == 200
    data = res_email.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@smartqms.io"

    # Login via Username (backward compatibility)
    res_user = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "Admin@12345"
    })
    assert res_user.status_code == 200
    assert "access_token" in res_user.json()


# =========================================================================
# 5. Invalid Login Credentials Test
# =========================================================================
def test_5_invalid_login_credentials(client: TestClient):
    """Verify rejection of incorrect password or unknown email with 401."""
    # Wrong password
    res1 = client.post("/api/auth/login", json={
        "email": "admin@smartqms.io",
        "password": "TotallyWrongPassword"
    })
    assert res1.status_code == 401
    assert "Incorrect" in res1.json()["detail"]

    # Unknown user
    res2 = client.post("/api/auth/login", json={
        "email": "ghost.user@smartqms.io",
        "password": "Admin@12345"
    })
    assert res2.status_code == 401


# =========================================================================
# 6. Expired or Invalid Tokens Test
# =========================================================================
def test_6_expired_or_invalid_tokens(client: TestClient):
    """Verify rejection of malformed and expired tokens with 401."""
    # Malformed token
    res_malformed = client.get("/api/auth/me", headers={"Authorization": "Bearer not.a.valid.jwt"})
    assert res_malformed.status_code == 401

    # Expired token (created with negative expiration)
    expired_token = create_access_token(
        data={"sub": "admin@smartqms.io", "role": "Administrator"},
        expires_delta=timedelta(minutes=-30)
    )
    res_expired = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res_expired.status_code == 401


# =========================================================================
# 7. Authenticated Profile Retrieval Test
# =========================================================================
def test_7_authenticated_profile_retrieval(client: TestClient):
    """Verify /api/auth/me returns current user's profile and role."""
    login_res = client.post("/api/auth/login", json={
        "email": "admin@smartqms.io",
        "password": "Admin@12345"
    })
    token = login_res.json()["access_token"]

    profile_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert profile_res.status_code == 200
    profile = profile_res.json()
    assert profile["email"] == "admin@smartqms.io"
    assert profile["role"] in ["Administrator", "admin"]
    assert "password_hash" not in profile  # Never expose password hash


# =========================================================================
# 8. Role-Based Permissions Test (Permission Matrix)
# =========================================================================
def test_8_role_based_permissions(client: TestClient):
    """Verify server-side RBAC enforcement across roles."""
    # Obtain tokens for Administrator, Developer, and Tester
    admin_token = client.post("/api/auth/login", json={"email": "admin@smartqms.io", "password": "Admin@12345"}).json()["access_token"]
    dev_token = client.post("/api/auth/login", json={"email": "developer@smartqms.io", "password": "Dev@12345"}).json()["access_token"]
    tester_token = client.post("/api/auth/login", json={"email": "tester@smartqms.io", "password": "Tester@12345"}).json()["access_token"]

    # 1. Administrator can create users
    user_payload = {
        "full_name": "New Junior Dev",
        "email": f"junior_{datetime.now(timezone.utc).timestamp()}@smartqms.io",
        "password": "Password@1234",
        "role": "Developer"
    }
    admin_create_res = client.post("/api/users", json=user_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_create_res.status_code == 201

    # 2. Developer CANNOT create users (Forbidden 403)
    dev_create_res = client.post("/api/users", json=user_payload, headers={"Authorization": f"Bearer {dev_token}"})
    assert dev_create_res.status_code == 403

    # 3. Tester CANNOT create projects (Forbidden 403)
    proj_payload = {
        "project_code": "TEST-PROJ-99",
        "name": "Unauthorized Project",
        "status": "active"
    }
    tester_create_proj = client.post("/api/projects", json=proj_payload, headers={"Authorization": f"Bearer {tester_token}"})
    assert tester_create_proj.status_code == 403

    # 4. Administrator CAN create projects
    admin_create_proj = client.post("/api/projects", json=proj_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_create_proj.status_code == 201


# =========================================================================
# 9. Duplicate Email Rejection Test
# =========================================================================
def test_9_duplicate_email_rejection(client: TestClient):
    """Verify that registering an already registered email is rejected with 400."""
    admin_token = client.post("/api/auth/login", json={"email": "admin@smartqms.io", "password": "Admin@12345"}).json()["access_token"]
    
    dup_payload = {
        "full_name": "Duplicate User",
        "email": "admin@smartqms.io",  # Already exists!
        "password": "Password@1234",
        "role": "Developer"
    }
    res = client.post("/api/users", json=dup_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 400
    assert "already registered" in res.json()["detail"].lower() or "exists" in res.json()["detail"].lower()


# =========================================================================
# 10. Project CRUD Operations Test
# =========================================================================
def test_10_project_crud(client: TestClient):
    """Verify full Project CRUD lifecycle: Create, Read, Update, List, Delete."""
    admin_token = client.post("/api/auth/login", json={"email": "admin@smartqms.io", "password": "Admin@12345"}).json()["access_token"]
    auth_header = {"Authorization": f"Bearer {admin_token}"}

    # CREATE
    proj_code = f"PRJ-{int(datetime.now(timezone.utc).timestamp())}"
    create_res = client.post("/api/projects", json={
        "project_code": proj_code,
        "name": "Payments Migration Project",
        "description": "Migration of Stripe payment gateway to v2 webhooks",
        "status": "active"
    }, headers=auth_header)
    assert create_res.status_code == 201
    proj_id = create_res.json()["id"]

    # READ
    get_res = client.get(f"/api/projects/{proj_id}", headers=auth_header)
    assert get_res.status_code == 200
    assert get_res.json()["project_code"] == proj_code

    # UPDATE
    update_res = client.put(f"/api/projects/{proj_id}", json={
        "name": "Updated Payments Migration Project",
        "status": "planning"
    }, headers=auth_header)
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Updated Payments Migration Project"
    assert update_res.json()["status"] == "planning"

    # LIST with pagination
    list_res = client.get("/api/projects?limit=10&skip=0", headers=auth_header)
    assert list_res.status_code == 200
    assert any(p["id"] == proj_id for p in list_res.json())

    # DELETE
    del_res = client.delete(f"/api/projects/{proj_id}", headers=auth_header)
    assert del_res.status_code == 200

    # VERIFY DELETION
    verify_get = client.get(f"/api/projects/{proj_id}", headers=auth_header)
    assert verify_get.status_code == 404


# =========================================================================
# 11. Quality Objective CRUD Operations Test
# =========================================================================
def test_11_quality_objective_crud(client: TestClient):
    """Verify full Quality Objective CRUD lifecycle."""
    qm_token = client.post("/api/auth/login", json={"email": "qamanager@smartqms.io", "password": "Manager@12345"}).json()["access_token"]
    auth_header = {"Authorization": f"Bearer {qm_token}"}

    # First get sample project id
    proj_res = client.get("/api/projects", headers=auth_header)
    sample_proj_id = proj_res.json()[0]["id"]

    # CREATE
    create_res = client.post("/api/quality-objectives", json={
        "project_id": sample_proj_id,
        "title": "Sub-50ms DB Query Latency",
        "description": "Ensure catalog query response time is under 50ms at 95th percentile",
        "quality_factor": "efficiency",
        "target_value": 50.0,
        "measurement_unit": "ms",
        "status": "in_progress"
    }, headers=auth_header)
    assert create_res.status_code == 201
    obj_id = create_res.json()["id"]

    # READ
    get_res = client.get(f"/api/quality-objectives/{obj_id}", headers=auth_header)
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Sub-50ms DB Query Latency"

    # UPDATE
    update_res = client.put(f"/api/quality-objectives/{obj_id}", json={
        "target_value": 45.0,
        "status": "achieved"
    }, headers=auth_header)
    assert update_res.status_code == 200
    assert update_res.json()["target_value"] == 45.0
    assert update_res.json()["status"] == "achieved"

    # DELETE
    del_res = client.delete(f"/api/quality-objectives/{obj_id}", headers=auth_header)
    assert del_res.status_code == 200

    # VERIFY DELETED
    verify_get = client.get(f"/api/quality-objectives/{obj_id}", headers=auth_header)
    assert verify_get.status_code == 404


# =========================================================================
# 12. Foreign-Key Integrity Test
# =========================================================================
def test_12_foreign_key_integrity(db_session: Session):
    """Verify SQLite foreign key enforcement blocks inserting orphan records."""
    non_existent_project_id = 999999

    orphan_objective = QualityObjective(
        project_id=non_existent_project_id,
        title="Orphan Objective",
        quality_factor="reliability",
        status="in_progress"
    )
    db_session.add(orphan_objective)
    
    with pytest.raises(IntegrityError):
        db_session.commit()
    
    db_session.rollback()


# =========================================================================
# 13. Unauthorized API Requests Test
# =========================================================================
def test_13_unauthorized_api_requests(client: TestClient):
    """Verify protected endpoints return 401 when accessed without authorization."""
    unauthorized_endpoints = [
        ("GET", "/api/auth/me"),
        ("GET", "/api/projects"),
        ("POST", "/api/projects"),
        ("GET", "/api/users"),
        ("POST", "/api/users"),
        ("GET", "/api/quality-objectives"),
    ]

    for method, path in unauthorized_endpoints:
        if method == "GET":
            res = client.get(path)
        else:
            res = client.post(path, json={})
        assert res.status_code == 401, f"Expected 401 for unauthenticated {method} {path}, got {res.status_code}"
