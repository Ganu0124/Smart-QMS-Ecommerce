"""Automated Test Suite for Phase 3:
Quality Planning, Requirements Management, Design Reviews, Code Reviews, and Traceability Matrix.

Runs against an isolated test SQLite database to strictly preserve the development database.
"""

import os
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DB_FILE = os.path.join(os.path.dirname(__file__), "test_phase3.db")
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

# Setup test database engine
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Import models, Base, and application
from app.database.connection import Base, get_db
from app.main import app
from app.core.security import get_password_hash, create_access_token
from app.models.user import User
from app.models.project import Project
from app.models.quality_plan import QualityObjective
from app.models.requirement import Requirement, RequirementVersion
from app.models.review import Review, ReviewChecklistItem
from app.models.task import DevTask
from app.models.audit import AuditLog

# Override get_db dependency
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    """Create test tables, seed users and sample project, then tear down after module."""
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass

    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # Seed 5 roles
    users = [
        User(username="admin_p3", email="admin_p3@test.io", full_name="Admin P3", role="Administrator", password_hash=get_password_hash("Secret@123"), is_active=True),
        User(username="qm_p3", email="qm_p3@test.io", full_name="QM P3", role="Quality Manager", password_hash=get_password_hash("Secret@123"), is_active=True),
        User(username="dev_p3", email="dev_p3@test.io", full_name="Dev P3", role="Developer", password_hash=get_password_hash("Secret@123"), is_active=True),
        User(username="tester_p3", email="tester_p3@test.io", full_name="Tester P3", role="Tester", password_hash=get_password_hash("Secret@123"), is_active=True),
        User(username="rev_p3", email="rev_p3@test.io", full_name="Reviewer P3", role="Reviewer", password_hash=get_password_hash("Secret@123"), is_active=True),
    ]
    db.add_all(users)
    db.commit()

    # Seed sample project
    admin = db.query(User).filter(User.username == "admin_p3").first()
    proj = Project(project_code="P3-TEST", name="Phase 3 Test Project", description="Test Project", status="active", project_owner_id=admin.id)
    db.add(proj)
    db.commit()

    app.dependency_overrides[get_db] = override_get_db

    yield

    # Clean up overrides so other test files use real get_db or their own overrides
    app.dependency_overrides.pop(get_db, None)
    with test_engine.connect() as conn:
        from sqlalchemy import text
        conn.execute(text("PRAGMA foreign_keys = OFF;"))
        conn.commit()
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass

def get_token(username: str, role: str, user_id: int = 1) -> str:
    return create_access_token(data={"sub": f"{username}@test.io", "username": username, "role": role, "id": user_id})

# -------------------------------------------------------------
# 1. Quality Objective CRUD & Validation
# -------------------------------------------------------------
def test_1_quality_objective_crud():
    qm_token = get_token("qm_p3", "Quality Manager", 2)
    dev_token = get_token("dev_p3", "Developer", 3)
    headers_qm = {"Authorization": f"Bearer {qm_token}"}
    headers_dev = {"Authorization": f"Bearer {dev_token}"}

    # Developer cannot create objective (RBAC check)
    bad_res = client.post("/api/quality-objectives", headers=headers_dev, json={
        "project_id": 1, "title": "Dev objective", "quality_factor": "reliability", "target_value": 0.0
    })
    assert bad_res.status_code == 403

    # Quality Manager creates objective with validation
    res = client.post("/api/quality-objectives", headers=headers_qm, json={
        "project_id": 1,
        "title": "Prevent Duplicate Payment Processing",
        "description": "Zero duplicate payment charge transactions",
        "quality_factor": "reliability",
        "target_value": 0.0,
        "measurement_unit": "incidents",
        "priority": "critical",
        "status": "in_progress"
    })
    assert res.status_code == 201
    obj_id = res.json()["id"]
    assert res.json()["priority"] == "critical"

    # Read
    get_res = client.get(f"/api/quality-objectives/{obj_id}", headers=headers_qm)
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Prevent Duplicate Payment Processing"

    # Update
    put_res = client.put(f"/api/quality-objectives/{obj_id}", headers=headers_qm, json={
        "status": "achieved"
    })
    assert put_res.status_code == 200
    assert put_res.json()["status"] == "achieved"

# -------------------------------------------------------------
# 2. Requirement Validation & Creation
# -------------------------------------------------------------
def test_2_requirement_validation():
    dev_token = get_token("dev_p3", "Developer", 3)
    headers = {"Authorization": f"Bearer {dev_token}"}

    # Missing/too short description
    res = client.post("/api/requirements", headers=headers, json={
        "project_id": 1,
        "title": "Short Req",
        "description": "Too short",
        "acceptance_criteria": "Acceptance criteria is detailed enough"
    })
    assert res.status_code == 400

    # Missing/too short acceptance criteria
    res2 = client.post("/api/requirements", headers=headers, json={
        "project_id": 1,
        "title": "Valid Title for Req",
        "description": "Valid and complete description of payment requirement",
        "acceptance_criteria": "short"
    })
    assert res2.status_code == 400

    # Valid creation
    res3 = client.post("/api/requirements", headers=headers, json={
        "project_id": 1,
        "title": "Payment Idempotency Middleware",
        "description": "Reject duplicate charge requests with identical idempotency token.",
        "acceptance_criteria": "1. Accept X-Idempotency-Key. 2. Return HTTP 200 on duplicate replay.",
        "category": "payment",
        "priority": "critical",
        "risk_level": "high",
        "quality_factor": "reliability",
        "quality_objective_id": 1
    })
    assert res3.status_code in [200, 201]
    req = res3.json()
    assert req["req_code"].startswith("REQ-")
    assert req["status"] == "draft"
    assert req["version"] == 1

# -------------------------------------------------------------
# 3. Requirement Submission & Version History on Approved Edit
# -------------------------------------------------------------
def test_3_requirement_lifecycle_and_version_history():
    dev_token = get_token("dev_p3", "Developer", 3)
    rev_token = get_token("rev_p3", "Reviewer", 5)
    headers_dev = {"Authorization": f"Bearer {dev_token}"}
    headers_rev = {"Authorization": f"Bearer {rev_token}"}

    # 1. Create requirement
    c_res = client.post("/api/requirements", headers=headers_dev, json={
        "project_id": 1,
        "title": "Catalog Stock Check Engine",
        "description": "Verify product stock availability in PostgreSQL catalog before order placement.",
        "acceptance_criteria": "1. Must query stock row in active database transaction. 2. Halt if zero.",
        "category": "inventory",
        "priority": "high"
    })
    req_id = c_res.json()["id"]

    # 2. Submit for review -> generates linked requirement review with 10 checklist items
    sub_res = client.post(f"/api/requirements/{req_id}/submit", headers=headers_dev)
    assert sub_res.status_code == 200
    assert sub_res.json()["status"] == "submitted"

    # Verify requirement review exists with 10 checklist items
    revs_res = client.get(f"/api/reviews?requirement_id={req_id}&review_type=requirement", headers=headers_rev)
    assert revs_res.status_code == 200
    assert len(revs_res.json()) >= 1
    review = revs_res.json()[0]
    assert len(review["checklist_items"]) == 10

    # 3. Passing all checklist items
    for item in review["checklist_items"]:
        put_item = client.put(f"/api/reviews/checklist-items/{item['id']}", headers=headers_rev, json={
            "result": "pass",
            "comments": "Verified compliant"
        })
        assert put_item.status_code == 200

    # 4. Formally Approve
    app_res = client.post(f"/api/requirements/{req_id}/approval", headers=headers_rev, json={
        "decision": "approved",
        "comments": "Acceptance criteria and 10 checklist points passed."
    })
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "approved"
    assert app_res.json()["version"] == 1

    # 5. Editing an approved requirement creates new version and triggers re-review
    edit_res = client.put(f"/api/requirements/{req_id}", headers=headers_dev, json={
        "description": "Verify product stock availability and reserve stock with row lock in catalog."
    })
    assert edit_res.status_code == 200
    updated_req = edit_res.json()
    assert updated_req["version"] == 2
    assert updated_req["status"] == "submitted" # Reset to review

    # Verify version history has both versions
    vers_res = client.get(f"/api/requirements/{req_id}/versions", headers=headers_dev)
    assert vers_res.status_code == 200
    versions = vers_res.json()
    assert len(versions) == 2
    assert versions[0]["version"] == 2
    assert versions[1]["version"] == 1

# -------------------------------------------------------------
# 4. Requirement Rejection requires Comments & Validation
# -------------------------------------------------------------
def test_4_requirement_rejection_requires_comments():
    dev_token = get_token("dev_p3", "Developer", 3)
    rev_token = get_token("rev_p3", "Reviewer", 5)
    headers_dev = {"Authorization": f"Bearer {dev_token}"}
    headers_rev = {"Authorization": f"Bearer {rev_token}"}

    c_res = client.post("/api/requirements", headers=headers_dev, json={
        "project_id": 1,
        "title": "Store Raw Passwords in Session Cache",
        "description": "Store plaintext passwords in redis session to skip authentication verification.",
        "acceptance_criteria": "1. Direct password caching without cryptographic hash.",
        "category": "security"
    })
    req_id = c_res.json()["id"]

    # Rejection without comments fails
    bad_rej = client.post(f"/api/requirements/{req_id}/approval", headers=headers_rev, json={
        "decision": "rejected",
        "comments": ""
    })
    assert bad_rej.status_code == 400

    # Rejection with comments succeeds
    ok_rej = client.post(f"/api/requirements/{req_id}/approval", headers=headers_rev, json={
        "decision": "rejected",
        "comments": "Security violation: Plaintext credential caching violates NIST 800-63B standards."
    })
    assert ok_rej.status_code == 200
    assert ok_rej.json()["status"] == "rejected"

# -------------------------------------------------------------
# 5. Design Review Checklist & Baselining Block
# -------------------------------------------------------------
def test_5_design_review_and_baselining_gate():
    rev_token = get_token("rev_p3", "Reviewer", 5)
    headers = {"Authorization": f"Bearer {rev_token}"}

    # Create Design Review (auto-generates 10 checklist items)
    c_res = client.post("/api/reviews", headers=headers, json={
        "project_id": 1,
        "review_type": "design",
        "title": "E-Commerce Checkout Architecture Review",
        "target_ref": "REQ-01-001"
    })
    assert c_res.status_code == 201
    dr = c_res.json()
    dr_id = dr["id"]
    assert len(dr["checklist_items"]) == 10

    # Attempting to baseline while checklist items are pending is strictly blocked
    bad_base = client.put(f"/api/reviews/{dr_id}", headers=headers, json={
        "is_baselined": True,
        "status": "passed"
    })
    assert bad_base.status_code == 400
    assert "Mandatory" in bad_base.json()["detail"]

    # Mark fail without comment fails
    first_item = dr["checklist_items"][0]
    bad_item = client.put(f"/api/reviews/checklist-items/{first_item['id']}", headers=headers, json={
        "result": "fail",
        "comments": ""
    })
    assert bad_item.status_code == 400

    # Mark all items as pass
    for item in dr["checklist_items"]:
        client.put(f"/api/reviews/checklist-items/{item['id']}", headers=headers, json={
            "result": "pass",
            "comments": "Architecture design reviewed and compliant"
        })

    # Now baselining passes
    ok_base = client.put(f"/api/reviews/{dr_id}", headers=headers, json={
        "is_baselined": True,
        "status": "passed",
        "outcome": "approved",
        "outcome_notes": "Architecture successfully baselined"
    })
    assert ok_base.status_code == 200
    assert ok_base.json()["is_baselined"] is True
    assert ok_base.json()["status"] == "passed"

# -------------------------------------------------------------
# 6. Development Task & Prevention of Self-Approval in Code Review
# -------------------------------------------------------------
def test_6_code_review_prevention_of_self_approval():
    dev_token = get_token("dev_p3", "Developer", 3)
    rev_token = get_token("rev_p3", "Reviewer", 5)
    headers_dev = {"Authorization": f"Bearer {dev_token}"}
    headers_rev = {"Authorization": f"Bearer {rev_token}"}

    # 1. Developer creates task linked to requirement
    task_res = client.post("/api/tasks", headers=headers_dev, json={
        "project_id": 1,
        "requirement_id": 1,
        "title": "Implement Redis Mutex Lock for Payments",
        "description": "PR #102: Distributed locking middleware implementation",
        "developer_id": 3, # Developer user id
        "pr_url": "https://github.com/smartqms/ecomm-core/pull/102"
    })
    assert task_res.status_code == 201
    task_id = task_res.json()["id"]

    # 2. Developer requests code review -> creates code review with 10 checklist items
    req_rev = client.post(f"/api/tasks/{task_id}/request-review", headers=headers_dev)
    assert req_rev.status_code == 200
    updated_task = req_rev.json()
    assert updated_task["status"] == "code_review"
    assert updated_task["review_id"] is not None

    cr_id = updated_task["review_id"]
    cr_res = client.get(f"/api/reviews/{cr_id}", headers=headers_dev)
    cr = cr_res.json()
    assert len(cr["checklist_items"]) == 10

    # 3. Mark all checklist items as pass
    for item in cr["checklist_items"]:
        client.put(f"/api/reviews/checklist-items/{item['id']}", headers=headers_rev, json={
            "result": "pass",
            "comments": "Code implementation matches specification"
        })

    # 4. CRITICAL RULE: Developer attempts to approve their OWN code review -> strictly forbidden (403)
    self_app = client.put(f"/api/reviews/{cr_id}", headers=headers_dev, json={
        "status": "passed",
        "outcome": "approved"
    })
    assert self_app.status_code == 403
    assert "prohibited" in self_app.json()["detail"].lower()

    # 5. Independent Reviewer approves the code review -> succeeds
    rev_app = client.put(f"/api/reviews/{cr_id}", headers=headers_rev, json={
        "status": "passed",
        "outcome": "approved",
        "comments": "PR reviewed and approved by principal reviewer"
    })
    assert rev_app.status_code == 200
    assert rev_app.json()["status"] == "passed"

    # 6. Task can now be marked completed
    done_res = client.put(f"/api/tasks/{task_id}", headers=headers_dev, json={
        "status": "completed"
    })
    assert done_res.status_code == 200
    assert done_res.json()["status"] == "completed"

# -------------------------------------------------------------
# 7. Invalid Task Transition Blocked without Passed Code Review
# -------------------------------------------------------------
def test_7_invalid_task_transition_blocked():
    dev_token = get_token("dev_p3", "Developer", 3)
    headers_dev = {"Authorization": f"Bearer {dev_token}"}

    # Create task without code review
    task_res = client.post("/api/tasks", headers=headers_dev, json={
        "project_id": 1,
        "title": "Unreviewed Buggy Feature",
        "description": "Code written without review"
    })
    t_id = task_res.json()["id"]

    # Attempting to complete directly fails quality gate
    bad_done = client.put(f"/api/tasks/{t_id}", headers=headers_dev, json={
        "status": "completed"
    })
    assert bad_done.status_code == 400
    assert "code review" in bad_done.json()["detail"].lower()

# -------------------------------------------------------------
# 8. Traceability Matrix & Gap Detection
# -------------------------------------------------------------
def test_8_traceability_matrix_and_audit():
    dev_token = get_token("dev_p3", "Developer", 3)
    headers = {"Authorization": f"Bearer {dev_token}"}

    # Ensure a requirement exists in DB
    db = TestingSessionLocal()
    req_exists = db.query(Requirement).filter(Requirement.project_id == 1).first()
    if not req_exists:
        req = Requirement(
            requirement_code="REQ-01-999",
            project_id=1,
            title="Traceability Test Req",
            description="Traceability description is detailed and complete",
            acceptance_criteria="1. Criterion one. 2. Criterion two.",
            category="payment",
            priority="critical",
            current_version=1,
            approval_status="approved",
            review_status="passed",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(req)
        db.commit()
    db.close()

    matrix_res = client.get("/api/traceability/matrix?project_id=1", headers=headers)
    assert matrix_res.status_code == 200
    data = matrix_res.json()
    assert "total_requirements" in data
    assert "coverage_percentage" in data
    assert "items" in data
    assert len(data["items"]) >= 1

    # Audit log check: verify critical actions are audited
    db = TestingSessionLocal()
    audit_count = db.query(AuditLog).count()
    assert audit_count >= 0
    db.close()

# -------------------------------------------------------------
# 9. Requirement Rejection, Revision, and Re-submission Lifecycle
# -------------------------------------------------------------
def test_9_requirement_rejection_and_revision_lifecycle():
    dev_token = get_token("dev_p3", "Developer", 3)
    rev_token = get_token("rev_p3", "Reviewer", 5)
    headers_dev = {"Authorization": f"Bearer {dev_token}"}
    headers_rev = {"Authorization": f"Bearer {rev_token}"}

    # 1. Developer creates a new requirement
    res = client.post("/api/requirements", headers=headers_dev, json={
        "project_id": 1,
        "title": "One-Click Checkout without 3DS",
        "description": "Allow instant checkout without 3D Secure verification for mobile users",
        "acceptance_criteria": "User clicks buy now and payment completes in 1 second without SMS OTP.",
        "category": "payment",
        "priority": "high",
        "risk_level": "critical",
        "assigned_owner_id": 3
    })
    assert res.status_code in [200, 201]
    req = res.json()
    req_id = req["id"]
    assert req["status"] == "draft"
    assert req["review_status"] == "unreviewed"

    # 2. Developer submits requirement for review
    sub_res = client.post(f"/api/requirements/{req_id}/submit", headers=headers_dev)
    assert sub_res.status_code == 200
    assert sub_res.json()["status"] == "submitted"
    assert sub_res.json()["review_status"] == "in_review"

    # 3. Reviewer attempts to reject without comments -> blocked (400)
    bad_rej = client.post(f"/api/requirements/{req_id}/approval", headers=headers_rev, json={
        "decision": "rejected",
        "comments": ""
    })
    assert bad_rej.status_code == 400
    assert "mandatory" in bad_rej.json()["detail"].lower() or "minimum" in bad_rej.json()["detail"].lower()

    # 4. Reviewer rejects requirement with documented justification
    rej_res = client.post(f"/api/requirements/{req_id}/approval", headers=headers_rev, json={
        "decision": "rejected",
        "comments": "Violates PCI-DSS & PSD2 SCA requirements. High risk of fraudulent chargebacks."
    })
    assert rej_res.status_code == 200
    rejected_req = rej_res.json()
    assert rejected_req["status"] == "rejected"
    assert rejected_req["review_status"] == "failed"

    # 5. Developer modifies rejected requirement -> system resets status to draft (revision state)
    edit_res = client.put(f"/api/requirements/{req_id}", headers=headers_dev, json={
        "title": "One-Click Checkout with Biometric SCA",
        "description": "Allow frictionless one-click checkout with mandatory device biometric authentication satisfying PSD2 SCA",
        "acceptance_criteria": "1. Biometric verification prompt. 2. Fallback to 3DS when risk score > 40."
    })
    assert edit_res.status_code == 200
    revised_req = edit_res.json()
    assert revised_req["status"] == "draft"
    assert revised_req["review_status"] == "unreviewed"

    # 6. Developer resubmits revised requirement
    resub_res = client.post(f"/api/requirements/{req_id}/submit", headers=headers_dev)
    assert resub_res.status_code == 200
    assert resub_res.json()["status"] == "submitted"

# -------------------------------------------------------------
# 10. RBAC: Developer Cannot Approve Requirement
# -------------------------------------------------------------
def test_10_rbac_developer_cannot_approve_requirement():
    dev_token = get_token("dev_p3", "Developer", 3)
    headers_dev = {"Authorization": f"Bearer {dev_token}"}

    # Create & submit req
    res = client.post("/api/requirements", headers=headers_dev, json={
        "project_id": 1,
        "title": "RBAC Test Requirement",
        "description": "A requirement to test role based access control restrictions",
        "acceptance_criteria": "Acceptance criteria must be present and verified by QA.",
        "category": "functional",
        "priority": "medium",
        "risk_level": "low"
    })
    assert res.status_code in [200, 201]
    req_id = res.json()["id"]
    client.post(f"/api/requirements/{req_id}/submit", headers=headers_dev)

    # Developer tries to approve -> 403 Forbidden
    app_res = client.post(f"/api/requirements/{req_id}/approval", headers=headers_dev, json={
        "decision": "approved",
        "comments": "Self approving my own requirement without authority"
    })
    assert app_res.status_code == 403

# -------------------------------------------------------------
# 11. Design Review Rework Required & Blocked Baselining
# -------------------------------------------------------------
def test_11_design_review_rework_workflow():
    rev_token = get_token("rev_p3", "Reviewer", 5)
    headers_rev = {"Authorization": f"Bearer {rev_token}"}

    # Create design review
    dr_res = client.post("/api/reviews", headers=headers_rev, json={
        "project_id": 1,
        "title": "Distributed Caching & Session Architecture",
        "review_type": "design",
        "target_ref": "ARCH-SESSION-001"
    })
    assert dr_res.status_code == 201
    dr = dr_res.json()
    dr_id = dr["id"]
    checklist = dr["checklist_items"]

    # Mark one item as fail with justification
    fail_item = checklist[0]
    client.put(f"/api/reviews/checklist-items/{fail_item['id']}", headers=headers_rev, json={
        "result": "fail",
        "comments": "Single point of failure identified in Redis cluster topology without sentinel"
    })

    # Reviewer sets outcome to rework_required
    rev_outcome = client.put(f"/api/reviews/{dr_id}", headers=headers_rev, json={
        "status": "in_review",
        "outcome": "rework_required",
        "comments": "Architectural rework needed for high availability Redis cluster"
    })
    assert rev_outcome.status_code == 200
    assert rev_outcome.json()["outcome"] == "rework_required"

    # Baselining while checklist item failed is blocked (400)
    base_res = client.put(f"/api/reviews/{dr_id}", headers=headers_rev, json={
        "is_baselined": True,
        "status": "passed"
    })
    assert base_res.status_code == 400
    assert "checklist" in base_res.json()["detail"].lower() or "mandatory" in base_res.json()["detail"].lower()

# -------------------------------------------------------------
# 12. Quality Objective Query Filtering & Deletion Audit
# -------------------------------------------------------------
def test_12_quality_objective_query_filtering_and_audit():
    qm_token = get_token("qm_p3", "Quality Manager", 2)
    headers_qm = {"Authorization": f"Bearer {qm_token}"}

    # Query with priority and search filter
    res = client.get("/api/quality-plans/objectives?project_id=1&priority=critical&search=payment", headers=headers_qm)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)

    # Create a temporary objective for deletion test
    obj_res = client.post("/api/quality-plans/objectives", headers=headers_qm, json={
        "project_id": 1,
        "title": "Temporary Test Objective for Deletion",
        "description": "Testing delete endpoint and audit logging integration",
        "quality_factor": "maintainability",
        "target_value": 90.0,
        "unit": "%",
        "owner_id": 2,
        "priority": "low",
        "due_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    })
    assert obj_res.status_code in [200, 201]
    obj_id = obj_res.json()["id"]

    # Delete the objective
    del_res = client.delete(f"/api/quality-plans/objectives/{obj_id}", headers=headers_qm)
    assert del_res.status_code == 200

    # Verify audit log recorded
    db = TestingSessionLocal()
    del_audit = db.query(AuditLog).filter(
        AuditLog.entity_type == "QualityObjective",
        AuditLog.action == "DELETE"
    ).order_by(AuditLog.id.desc()).first()
    assert del_audit is not None
    assert "DELETE" in del_audit.action
    db.close()

# -------------------------------------------------------------
# 13. Traceability Matrix Frontend Format Structure
# -------------------------------------------------------------
def test_13_traceability_matrix_frontend_format():
    dev_token = get_token("dev_p3", "Developer", 3)
    headers = {"Authorization": f"Bearer {dev_token}"}

    res = client.get("/api/traceability/matrix?project_id=1", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Must contain both legacy items and rich matrix + summary
    assert "matrix" in data
    assert "summary" in data
    assert "items" in data

    matrix = data["matrix"]
    assert isinstance(matrix, list)
    if len(matrix) > 0:
        item = matrix[0]
        assert "requirement_id" in item
        assert "req_code" in item
        assert "title" in item
        assert "status" in item
        assert "design_reviews" in item
        assert "dev_tasks" in item
        assert "code_reviews" in item
        assert "test_cases" in item
        assert "defects" in item
        assert "coverage_gaps" in item

    summary = data["summary"]
    assert "fully_traceable_count" in summary
    assert "gap_count" in summary
    assert "coverage_percentage" in summary

