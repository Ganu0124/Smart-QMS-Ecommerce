# SmartQMS Automated Test Execution Guide

## 1. Prerequisites

- Python 3.10+ (with virtual environment configured)
- Node.js 18+ and npm
- Isolated test database automatically handled by `pytest` (`backend/tests/test_smartqms.db`)

---

## 2. Running Backend Tests

All 44 automated backend tests execute without modifying the active development database:

```powershell
# Navigate to backend directory
cd d:\E-comm\backend

# Run all 44 automated tests
..\venv\Scripts\pytest.exe -v --disable-warnings tests/
```

### Running Targeted Test Modules

```powershell
# Software development metrics (DevP, CRe, DocRe, Zero-division guards, CSV/PDF reports)
..\venv\Scripts\pytest.exe -v tests/test_software_metrics.py

# Smart Release Gate engine, defect transitions, payment idempotency
..\venv\Scripts\pytest.exe -v tests/test_all_features.py

# Authentication, JWT, and foreign key verification
..\venv\Scripts\pytest.exe -v tests/test_phase2_auth_db.py

# Requirements management, 10-point checklists, baselining
..\venv\Scripts\pytest.exe -v tests/test_phase3_qa_req_reviews.py
```

---

## 3. Running Frontend Builds & Type Checking

```powershell
# Navigate to frontend directory
cd d:\E-comm\frontend

# Execute TypeScript validation and production build
npm run build
```

Expected output:
```text
✓ 2537 modules transformed.
dist/index.html                   1.22 kB
dist/assets/index-DgZiIzqA.css   41.00 kB
dist/assets/index-oO-S5O34.js   990.61 kB
✓ built in < 1.5s
```

---

## 4. End-to-End Integration Verification

1. Start Backend: `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`
2. Start Frontend: `npm run dev -- --host 127.0.0.1 --port 5173`
3. Health Check: `GET http://127.0.0.1:8000/api/health` $\to$ `{"status": "healthy"}`
4. Access App: Open `http://127.0.0.1:5173/` in a modern web browser.
