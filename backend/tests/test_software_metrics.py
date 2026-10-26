import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.seed import seed_database
from app.models.defect import Defect
from app.models.release import Release

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
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

@pytest.fixture(scope="module")
def tester_token():
    res = client.post("/api/auth/login", json={"username": "tester", "password": "Tester@12345"})
    assert res.status_code == 200
    return res.json()["access_token"]


# =====================================================================
# 1. THREE SOFTWARE QUALITY METRICS (DevP, CRe, DocRe)
# =====================================================================

def test_devp_metric_calculation_and_storage(qamanager_token):
    """
    Metric A: Development Effort per KLOC (DevP)
    Formula: DevP = Development Hours / KLOC
    Sample inputs: 4,800 hours / 120 KLOC = 40.0 hours/KLOC
    """
    res = client.post(
        "/api/metrics/calculate/devp",
        json={"project_id": 1, "development_hours": 4800.0, "software_size_kloc": 120.0},
        headers={"Authorization": f"Bearer {qamanager_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["metric_key"] == "DevP"
    assert data["value"] == 40.0
    assert data["unit"] == "hours/KLOC"
    assert "40.0 hours/KLOC" in data["calculation_details"]
    assert "Lower effort per KLOC is generally desirable" in data["interpretation"]

def test_devp_invalid_inputs_rejection(qamanager_token):
    # Reject zero software size (division by zero)
    res = client.post(
        "/api/metrics/calculate/devp",
        json={"project_id": 1, "development_hours": 4800.0, "software_size_kloc": 0.0},
        headers={"Authorization": f"Bearer {qamanager_token}"}
    )
    assert res.status_code == 400
    assert "greater than 0" in res.json()["detail"]

    # Reject negative hours
    res = client.post(
        "/api/metrics/calculate/devp",
        json={"project_id": 1, "development_hours": -50.0, "software_size_kloc": 120.0},
        headers={"Authorization": f"Bearer {qamanager_token}"}
    )
    assert res.status_code == 400

    # Reject negative software size
    res = client.post(
        "/api/metrics/calculate/devp",
        json={"project_id": 1, "development_hours": 4800.0, "software_size_kloc": -10.0},
        headers={"Authorization": f"Bearer {qamanager_token}"}
    )
    assert res.status_code == 400

def test_cre_metric_calculation_and_storage(qamanager_token):
    """
    Metric B: Code Reuse Ratio (CRe)
    Formula: CRe = (Reused KLOC / Total KLOC) * 100
    Sample inputs: 30 KLOC / 120 KLOC = 25.0%
    """
    res = client.post(
        "/api/metrics/calculate/cre",
        json={"project_id": 1, "reused_kloc": 30.0, "total_kloc": 120.0},
        headers={"Authorization": f"Bearer {qamanager_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["metric_key"] == "CRe"
    assert data["value"] == 25.0
    assert data["unit"] == "%"
    assert "25.0%" in data["calculation_details"]
    assert "greater reuse of existing code" in data["interpretation"]

def test_cre_invalid_inputs_rejection(qamanager_token):
    # Zero total code
    res = client.post(
        "/api/metrics/calculate/cre",
        json={"project_id": 1, "reused_kloc": 30.0, "total_kloc": 0.0},
        headers={"Authorization": f"Bearer {qamanager_token}"}
    )
    assert res.status_code == 400

    # Reused greater than total
    res = client.post(
        "/api/metrics/calculate/cre",
        json={"project_id": 1, "reused_kloc": 150.0, "total_kloc": 120.0},
        headers={"Authorization": f"Bearer {qamanager_token}"}
    )
    assert res.status_code == 400
    assert "cannot exceed total" in res.json()["detail"].lower()

    # Negative inputs
    res = client.post(
        "/api/metrics/calculate/cre",
        json={"project_id": 1, "reused_kloc": -5.0, "total_kloc": 120.0},
        headers={"Authorization": f"Bearer {qamanager_token}"}
    )
    assert res.status_code == 400

def test_docre_metric_calculation_and_storage(qamanager_token):
    """
    Metric C: Documentation Reuse Ratio (DocRe)
    Formula: DocRe = (Reused Documents / Total Documents) * 100
    Sample inputs: 15 / 50 = 30.0%
    """
    res = client.post(
        "/api/metrics/calculate/docre",
        json={"project_id": 1, "reused_documents": 15, "total_documents": 50},
        headers={"Authorization": f"Bearer {qamanager_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["metric_key"] == "DocRe"
    assert data["value"] == 30.0
    assert data["unit"] == "%"
    assert "30.0%" in data["calculation_details"]
    assert "greater documentation reuse" in data["interpretation"]

def test_docre_invalid_inputs_rejection(qamanager_token):
    # Zero total documents
    res = client.post(
        "/api/metrics/calculate/docre",
        json={"project_id": 1, "reused_documents": 15, "total_documents": 0},
        headers={"Authorization": f"Bearer {qamanager_token}"}
    )
    assert res.status_code == 400

    # Reused greater than total
    res = client.post(
        "/api/metrics/calculate/docre",
        json={"project_id": 1, "reused_documents": 60, "total_documents": 50},
        headers={"Authorization": f"Bearer {qamanager_token}"}
    )
    assert res.status_code == 400

def test_get_software_development_metrics(qamanager_token):
    res = client.get("/api/metrics/software-development?project_id=1", headers={"Authorization": f"Bearer {qamanager_token}"})
    assert res.status_code == 200
    metrics_list = res.json()
    assert len(metrics_list) >= 3
    keys = {m["metric_key"] for m in metrics_list}
    assert "DevP" in keys
    assert "CRe" in keys
    assert "DocRe" in keys


# =====================================================================
# 2. PROJECTS CRUD OPERATIONS
# =====================================================================

def test_projects_crud_workflow(admin_token, dev_token):
    # 1. Create Project
    res = client.post(
        "/api/projects",
        json={
            "project_code": "B2B-WHOLESALE",
            "name": "B2B Wholesale Portal",
            "description": "High-volume bulk ordering and invoicing engine",
            "status": "active",
            "target_release_date": "2026-12-15"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code in [200, 201]
    new_proj = res.json()
    proj_id = new_proj["id"]
    assert new_proj["name"] == "B2B Wholesale Portal"

    # 2. Retrieve Projects
    res = client.get("/api/projects", headers={"Authorization": f"Bearer {dev_token}"})
    assert res.status_code == 200
    assert any(p["id"] == proj_id for p in res.json())

    # 3. Update Project
    res = client.put(
        f"/api/projects/{proj_id}",
        json={"name": "B2B Wholesale Portal Enterprise", "description": "Updated description"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    assert res.json()["name"] == "B2B Wholesale Portal Enterprise"

    # 4. Developer cannot delete project (Admin only)
    res = client.delete(f"/api/projects/{proj_id}", headers={"Authorization": f"Bearer {dev_token}"})
    assert res.status_code == 403

    # 5. Admin deletes project
    res = client.delete(f"/api/projects/{proj_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200


# =====================================================================
# 3. USER MANAGEMENT & ROLE PERMISSIONS
# =====================================================================

def test_user_management_workflow(admin_token, dev_token):
    # 1. Admin gets all users
    res = client.get("/api/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    users = res.json()
    assert len(users) >= 5

    # 2. Developer forbidden from creating new users (Admin only)
    res = client.post(
        "/api/users",
        json={
            "username": "hacker_dev",
            "email": "hacker@ecom.io",
            "full_name": "Hacker",
            "role": "admin",
            "password": "Password123",
            "is_active": True
        },
        headers={"Authorization": f"Bearer {dev_token}"}
    )
    assert res.status_code == 403

    # 3. Admin creates new user
    res = client.post(
        "/api/users",
        json={
            "username": "qa_auditor",
            "email": "auditor@ecom.io",
            "full_name": "Quality Auditor",
            "role": "reviewer",
            "password": "Auditor@12345",
            "is_active": True
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code in [200, 201]
    user_id = res.json()["id"]

    # 4. Admin updates user status
    res = client.put(
        f"/api/users/{user_id}",
        json={"is_active": False, "full_name": "Auditor (Deactivated)"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    assert res.json()["is_active"] is False


# =====================================================================
# 4. PDF AND CSV REPORT GENERATION
# =====================================================================

def test_report_generation_csv_and_pdf(qamanager_token):
    report_types = ["quality-summary", "requirements", "defects", "test-executions", "release-gates"]

    for r_type in report_types:
        # CSV Export
        csv_res = client.get(
            f"/api/reports/export/csv/{r_type}?project_id=1",
            headers={"Authorization": f"Bearer {qamanager_token}"}
        )
        assert csv_res.status_code == 200
        assert "text/csv" in csv_res.headers.get("content-type", "")
        assert len(csv_res.content) > 0

        # PDF Export
        pdf_res = client.get(
            f"/api/reports/export/pdf/{r_type}?project_id=1",
            headers={"Authorization": f"Bearer {qamanager_token}"}
        )
        assert pdf_res.status_code == 200
        assert "application/pdf" in pdf_res.headers.get("content-type", "")
        assert pdf_res.content.startswith(b"%PDF")
