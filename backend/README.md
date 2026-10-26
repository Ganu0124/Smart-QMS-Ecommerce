# SmartQMS Backend Service (Phase 2)

Software Quality Management System (QMS) backend engine built with **FastAPI**, **SQLite**, **SQLAlchemy 2.0**, and **Argon2 / JWT Authentication**.

---

## 1. System Requirements

- **Python**: 3.10, 3.11, or 3.12
- **Virtual Environment**: `venv` or `conda`
- **Database**: SQLite 3 with WAL journal mode and foreign key enforcement enabled (`PRAGMA foreign_keys = ON;`)

---

## 2. Directory Structure

```text
backend/
├── app/
│   ├── main.py                    # FastAPI application initialization & middleware
│   ├── core/
│   │   ├── config.py              # Environment settings (Pydantic / python-dotenv)
│   │   ├── security.py            # Argon2 password hashing & JWT token issuing
│   │   └── dependencies.py        # RBAC role guards and auth dependencies
│   ├── database/
│   │   ├── __init__.py            # Re-exports engine, SessionLocal, Base, get_db
│   │   ├── connection.py          # SQLite engine with PRAGMA foreign_keys=ON listener
│   │   └── init_db.py             # Schema creation and repeatable seed script (--reset support)
│   ├── models/                    # 17 SQLAlchemy 2.0 ORM domain entities
│   │   ├── user.py                # User & Role entity
│   │   ├── project.py             # Project entity
│   │   ├── quality_plan.py        # QualityObjective, QualityMetric, Risk, Milestone
│   │   ├── requirement.py         # Requirement & RequirementVersion entities
│   │   ├── review.py              # Review & ReviewChecklistItem entities
│   │   ├── task.py                # DevTask entity
│   │   ├── test_case.py           # TestCase & TestExecution entities
│   │   ├── defect.py              # Defect & DefectHistory entities
│   │   ├── release.py             # Release & ReleaseGateResult entities
│   │   ├── capa.py                # Corrective & Preventive Action (CAPA) entity
│   │   └── audit.py               # AuditLog entity
│   ├── schemas/                   # Pydantic v2 validation schemas
│   │   └── all_schemas.py         # Separation of Create, Update, Response models
│   ├── routers/                   # Modular REST API routes prefixed with /api
│   │   ├── auth.py                # Login, Logout, /me, Change-Password
│   │   ├── users.py               # User CRUD with role enforcement
│   │   ├── projects.py            # Project CRUD
│   │   ├── quality_objectives.py  # Quality Objective CRUD
│   │   ├── quality_plans.py       # Quality objectives & risk management
│   │   ├── requirements.py        # Requirement approvals & versioning
│   │   ├── reviews.py             # Peer review checklists
│   │   ├── tasks.py               # Developer tasks
│   │   ├── tests.py               # Test execution engine
│   │   ├── defects.py             # Defect lifecycle machine
│   │   ├── releases.py            # Release gate evaluator
│   │   ├── metrics.py             # Live quality metrics
│   │   └── reports.py             # Audit log, PDF & CSV exports
│   └── services/                  # Business logic engines
│       ├── audit.py               # Tamper-evident audit trail logger
│       ├── gate_engine.py         # 8-point automated release gate rules
│       ├── metrics_calc.py        # Mathematical zero-division-safe calculations
│       └── reporting.py           # ReportLab document generators
├── tests/
│   ├── test_phase2_auth_db.py     # 13 automated tests on isolated test_smartqms.db
│   └── test_all_features.py       # 8 integration tests covering end-to-end quality workflow
├── requirements.txt               # Pinned backend dependencies
├── .env.example                   # Security & environment template
└── README.md                      # Backend technical manual
```

---

## 3. Installation & Virtual Environment Setup

### Windows (PowerShell)
```powershell
cd d:\E-comm\backend

# 1. Create virtual environment (if not already created at project root)
python -m venv ..\venv

# 2. Activate virtual environment
..\venv\Scripts\Activate.ps1

# 3. Install backend dependencies
pip install -r requirements.txt
```

### Linux / macOS (Bash)
```bash
cd backend
python3 -m venv ../venv
source ../venv/bin/activate
pip install -r requirements.txt
```

---

## 4. Environment Configuration

Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```

Ensure variables are set:
```ini
PROJECT_NAME="SmartQMS - E-Commerce Software Quality Management System"
SECRET_KEY="your-cryptographically-secure-jwt-key"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL="sqlite:///./smart_qms.db"
CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
```

---

## 5. Database Initialization & Seeding

The SQLite database file is persisted at:
`d:\E-comm\backend\smart_qms.db`

### Standard Idempotent Initialization
Creates missing tables and ensures default development accounts, sample e-commerce project, and quality objectives exist:
```powershell
..\venv\Scripts\python -m app.database.init_db
```

### Development Database Reset
Drops all tables and re-creates a clean development schema:
```powershell
..\venv\Scripts\python -m app.database.init_db --reset
```

---

## 6. Development Accounts & Credentials

| Role | Username | Email | Default Password | Initial Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin@smartqms.io` | `Admin@12345` | User CRUD, project setup, system configuration, audit logs |
| **Quality Manager** | `qamanager` | `qamanager@smartqms.io` | `Manager@12345` | Quality objectives, requirements approval, release gates |
| **Developer** | `developer` | `developer@smartqms.io` | `Dev@12345` | Task updates, defect remediation, code references |
| **Tester** | `tester` | `tester@smartqms.io` | `Tester@12345` | Test cases, execution runs, defect logging & retesting |
| **Reviewer** | `reviewer` | `reviewer@smartqms.io` | `Reviewer@12345` | Peer review checklists, design baselines, architecture approval |

> **Security Note**: Before deploying beyond local development, change initial passwords via `POST /api/auth/change-password` or set `SEED_*_PASSWORD` in your production environment variables.

---

## 7. Starting the Backend Server

```powershell
cd d:\E-comm\backend
..\venv\Scripts\python -m uvicorn --host 127.0.0.1 --port 8000 app.main:app
```

- **API Base URL**: `http://127.0.0.1:8000/api`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **ReDoc Documentation**: `http://127.0.0.1:8000/redoc`
- **Health Check Endpoint**: `http://127.0.0.1:8000/api/health`

---

## 8. Automated Test Suite

Automated tests run on an isolated test database (`tests/test_smartqms.db`) without touching the development database:

```powershell
cd d:\E-comm\backend

# Run Phase 2 Auth & Database Test Suite (13 tests)
..\venv\Scripts\pytest -v tests/test_phase2_auth_db.py

# Run Complete Test Suite (21 tests total)
..\venv\Scripts\pytest -v tests/
```

### Test Coverage Checklist
1. `test_1_database_initialization`: SQLite connection and foreign key enforcement (`PRAGMA foreign_keys = 1`)
2. `test_2_user_creation`: User record insertion with unique email and active status
3. `test_3_password_hashing`: Argon2 hashing verification and legacy hash verification
4. `test_4_successful_login`: `POST /api/auth/login` token issuance and user profile response
5. `test_5_invalid_login_credentials`: Rejection of incorrect credentials with 401 Unauthorized
6. `test_6_expired_or_invalid_tokens`: Rejection of corrupted JWT with 401 Unauthorized
7. `test_7_authenticated_profile_retrieval`: `GET /api/auth/me` returns current user profile
8. `test_8_role_based_permissions`: Admin, Quality Manager, and Developer authorization checks
9. `test_9_duplicate_email_rejection`: Uniqueness constraint validation on user emails
10. `test_10_project_crud`: Create, read, update, and delete operations for projects
11. `test_11_quality_objective_crud`: Create, read, update, and delete for quality objectives
12. `test_12_foreign_key_integrity`: Foreign key violations rejected by SQLite
13. `test_13_unauthorized_api_requests`: Endpoints return 401 when no token is supplied
