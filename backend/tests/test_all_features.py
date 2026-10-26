import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.release import Release
from app.models.defect import Defect
from app.models.test_case import TestCase

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def seed_before_module():
    from app.seed import seed_database
    db = SessionLocal()
    seed_database(db)
    db.close()

@pytest.fixture(scope="module")
def admin_token():
    res = client.post("/api/auth/login", json={"username": "admin", "password": "Admin@12345"})
    assert res.status_code == 200
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def qamanager_token():
    res = client.post("/api/auth/login", json={"username": "qamanager", "password": "Manager@12345"})
    assert res.status_code == 200
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def dev_token():
    res = client.post("/api/auth/login", json={"username": "developer", "password": "Dev@12345"})
    assert res.status_code == 200
    return res.json()["access_token"]


# 1. Test Auth & Role Permissions
def test_auth_login_and_roles(admin_token, dev_token):
    # Admin can list users
    res = client.get("/api/auth/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert len(res.json()) >= 5

    # Developer cannot register new users (admin only)
    res = client.post(
        "/api/auth/register",
        json={"username": "newdev", "email": "newdev@ecom.io", "full_name": "New Dev", "password": "Password123", "role": "developer"},
        headers={"Authorization": f"Bearer {dev_token}"}
    )
    assert res.status_code == 403

# 2. Test Requirement Approval Validation
def test_requirement_validation(qamanager_token, dev_token):
    # Create requirement with brief description -> should fail
    res = client.post(
        "/api/requirements",
        json={
            "project_id": 1,
            "title": "Short Req",
            "description": "Too short",
            "acceptance_criteria": "Too short",
            "priority": "low",
            "risk_level": "low",
            "quality_factor": "reliability"
        },
        headers={"Authorization": f"Bearer {dev_token}"}
    )
    assert res.status_code == 400

    # Create valid requirement
    res = client.post(
        "/api/requirements",
        json={
            "project_id": 1,
            "title": "Tax Exemption Certificate Upload",
            "description": "Allows B2B clients to upload verified VAT tax exemption certificates during order finalization.",
            "acceptance_criteria": "Uploaded PDF validated against federal tax registration registry before tax deduction is applied.",
            "priority": "medium",
            "risk_level": "medium",
            "quality_factor": "correctness"
        },
        headers={"Authorization": f"Bearer {dev_token}"}
    )
    assert res.status_code == 200
    req_id = res.json()["id"]

    # Developer cannot approve requirements (only QA manager, reviewer, admin)
    res = client.post(
        f"/api/requirements/{req_id}/approval",
        json={"decision": "approved", "comments": "Dev self approval"},
        headers={"Authorization": f"Bearer {dev_token}"}
    )
    assert res.status_code == 403

    # QA Manager can approve
    res = client.post(
        f"/api/requirements/{req_id}/approval",
        json={"decision": "approved", "comments": "Formally reviewed and approved for tax compliance."},
        headers={"Authorization": f"Bearer {qamanager_token}"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "approved"

# 3. Test Defect Lifecycle & Failed Retest Reopening
def test_defect_lifecycle_and_retest_reopening(dev_token, qamanager_token):
    # Create defect
    res = client.post(
        "/api/defects",
        json={
            "project_id": 1,
            "title": "Tax calculation glitch on zero-rate supplies",
            "description": "Zero-rate items still applied standard 5% tax bracket in checkout cart.",
            "category": "functional",
            "severity": "medium",
            "priority": "medium",
            "affected_module": "Tax Engine",
            "steps_to_reproduce": "Add zero-rate SKU to cart",
            "expected_result": "0.00 tax",
            "actual_result": "5.00 tax"
        },
        headers={"Authorization": f"Bearer {dev_token}"}
    )
    assert res.status_code == 200
    defect_id = res.json()["id"]

    # Transition to in_progress
    res = client.put(
        f"/api/defects/{defect_id}/status",
        json={"new_status": "in_progress", "comments": "Fixing tax bracket lookup"},
        headers={"Authorization": f"Bearer {dev_token}"}
    )
    assert res.json()["status"] == "in_progress"

    # Transition to fixed
    res = client.put(
        f"/api/defects/{defect_id}/status",
        json={"new_status": "fixed", "resolution_notes": "Added exemption check in calculate_tax()"},
        headers={"Authorization": f"Bearer {dev_token}"}
    )
    assert res.json()["status"] == "fixed"

    # Tester tests fix and it FAILS -> Defect must automatically reopen!
    res = client.put(
        f"/api/defects/{defect_id}/status",
        json={"new_status": "retest", "retest_result": "failed", "comments": "Tax still charged when shipping to Oregon."},
        headers={"Authorization": f"Bearer {qamanager_token}"}
    )
    assert res.status_code == 200
    # Status should be reverted to open!
    assert res.json()["status"] == "open"
    assert res.json()["retest_result"] == "failed"

# 4. Test Smart Release Gate: Critical Defect Blocks Release & Gate Bypass Protection
def test_release_gate_blocking_and_bypass_protection(qamanager_token):
    # Query Release 1 (REL-01-001)
    res = client.get("/api/releases/1", headers={"Authorization": f"Bearer {qamanager_token}"})
    assert res.status_code == 200
    rel = res.json()
    assert rel["release_decision"] == "BLOCKED"

    # Verify that attempting to approve a BLOCKED release is strictly rejected!
    res = client.post(
        "/api/releases/1/approve",
        json={"notes": "Attempting unauthorized gate bypass"},
        headers={"Authorization": f"Bearer {qamanager_token}"}
    )
    assert res.status_code == 400
    assert "Release approval prohibited by Smart Release Gate" in res.json()["detail"]

# 5. Test Metrics Calculation & Dashboard Summary
def test_metrics_calculation(qamanager_token):
    res = client.get("/api/metrics/dashboard?project_id=1", headers={"Authorization": f"Bearer {qamanager_token}"})
    assert res.status_code == 200
    summary = res.json()
    assert summary["open_defects_by_severity"]["critical"] >= 0
    assert "critical" in summary["open_defects_by_severity"]


    res = client.get("/api/metrics/quality?project_id=1", headers={"Authorization": f"Bearer {qamanager_token}"})
    assert res.status_code == 200
    qm = res.json()
    assert qm["requirements_approval_rate"] > 0
    assert "severity_breakdown" in qm

# 6. Test Reports Download (PDF & CSV)
def test_reports_export(qamanager_token):
    res = client.get("/api/reports/export/csv/defects?project_id=1", headers={"Authorization": f"Bearer {qamanager_token}"})
    assert res.status_code == 200
    assert "Defect Code" in res.text
    assert "DEF-01-001" in res.text

    res = client.get("/api/reports/export/pdf/quality?project_id=1", headers={"Authorization": f"Bearer {qamanager_token}"})
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 1000

# 7. Test End-to-End Release Unblocking & Resolution Demo
def test_release_unblocking_workflow(dev_token, qamanager_token):
    # Step 1: Developer fixes DEF-01-001 (Duplicate Payment Defect)
    res = client.put(
        "/api/defects/1/status",
        json={
            "new_status": "fixed",
            "root_cause": "Missing Redis distributed mutex during concurrent webhook ingestion.",
            "corrective_action": "Applied Redis lock with 30s TTL on order payment hash.",
            "preventive_action": "Added automated concurrency regression tests.",
            "resolution_notes": "Implemented idempotency guard. Tested with 50 concurrent callbacks."
        },
        headers={"Authorization": f"Bearer {dev_token}"}
    )
    assert res.json()["status"] == "fixed"

    # Step 2: Tester re-tests TC-01-004 (Duplicate payment test case) -> Mark as pass
    res = client.post(
        "/api/tests/4/execute",
        json={
            "status": "pass",
            "actual_result": "Simulated 50 concurrent duplicate webhook callbacks: 1 processed, 49 duplicates safely discarded. Zero double charge.",
            "evidence_notes": "Automated concurrency test run passed with trace #PASS-DUP-991",
            "evidence_url": "https://ci.smartqms.local/reports/pass-991"
        },
        headers={"Authorization": f"Bearer {qamanager_token}"}
    )
    assert res.json()["status"] == "pass"

    # Step 3: Retest defect DEF-01-001 and close it
    res = client.put(
        "/api/defects/1/status",
        json={
            "new_status": "closed",
            "retest_result": "passed",
            "comments": "Retested with 50 concurrent requests. Passed verification."
        },
        headers={"Authorization": f"Bearer {qamanager_token}"}
    )
    assert res.json()["status"] == "closed"

    # Step 4: Re-evaluate Release Gate!
    res = client.post("/api/releases/1/evaluate", headers={"Authorization": f"Bearer {qamanager_token}"})
    assert res.status_code == 200
    evaluated_rel = res.json()
    assert evaluated_rel["release_decision"] == "READY_FOR_APPROVAL"

    # Step 5: Formally approve release as Quality Manager
    res = client.post(
        "/api/releases/1/approve",
        json={"notes": "All 8 mandatory quality gates verified and passed. Approved for production deployment."},
        headers={"Authorization": f"Bearer {qamanager_token}"}
    )
    assert res.status_code == 200
    assert res.json()["release_decision"] == "APPROVED"
    assert res.json()["approved_by_id"] is not None

# 8. Test Audit Logs
def test_audit_logs(admin_token):
    res = client.get("/api/audit/logs", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) >= 5
    actions = [l["action"] for l in logs]
    assert "RELEASE_APPROVAL" in actions or "GATE_EVALUATION" in actions
