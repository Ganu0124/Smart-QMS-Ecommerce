import datetime
from typing import Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.test_case import TestCase
from app.models.user import User
from app.schemas.all_schemas import TestCaseCreate, TestCaseExecute, TestCaseResponse, PaymentSimulateRequest
from app.services.auth import get_current_user, require_roles
from app.services.audit import log_audit

router = APIRouter(prefix="/api/tests", tags=["Test Management"])

# In-memory transaction registry for simulated payment gateway idempotency testing
PROCESSED_IDEMPOTENCY_KEYS: Dict[str, dict] = {}

def generate_tc_code(db: Session, project_id: int) -> str:
    count = db.query(TestCase).filter(TestCase.project_id == project_id).count() + 1
    return f"TC-{project_id:02d}-{count:03d}"

@router.get("", response_model=list[TestCaseResponse])
def get_test_cases(
    project_id: int = None,
    status_filter: str = None,
    scenario_category: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(TestCase)
    if project_id:
        query = query.filter(TestCase.project_id == project_id)
    if status_filter:
        query = query.filter(TestCase.status == status_filter)
    if scenario_category:
        query = query.filter(TestCase.scenario_category == scenario_category)
    return query.all()

@router.get("/{test_id}", response_model=TestCaseResponse)
def get_test_case(test_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tc = db.query(TestCase).filter(TestCase.id == test_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    return tc

@router.post("", response_model=TestCaseResponse)
def create_test_case(
    data: TestCaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    code = generate_tc_code(db, data.project_id)
    tc = TestCase(
        tc_code=code,
        project_id=data.project_id,
        requirement_id=data.requirement_id,
        scenario_title=data.scenario_title,
        scenario_category=data.scenario_category,
        preconditions=data.preconditions,
        test_steps=data.test_steps,
        expected_result=data.expected_result,
        is_mandatory=data.is_mandatory,
        status="not_run"
    )
    db.add(tc)
    db.commit()
    db.refresh(tc)
    log_audit(db, current_user, "CREATE", "TestCase", tc.tc_code, f"Created test case: {tc.scenario_title}")
    return tc

@router.post("/{test_id}/execute", response_model=TestCaseResponse)
def execute_test_case(
    test_id: int,
    exec_data: TestCaseExecute,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "quality_manager", "tester"]))
):
    tc = db.query(TestCase).filter(TestCase.id == test_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")

    tc.actual_result = exec_data.actual_result
    tc.status = exec_data.status
    tc.evidence_notes = exec_data.evidence_notes
    tc.evidence_url = exec_data.evidence_url
    tc.tester_id = current_user.id
    tc.execution_date = datetime.datetime.utcnow()

    db.commit()
    db.refresh(tc)
    log_audit(db, current_user, "TEST_EXECUTE", "TestCase", tc.tc_code, f"Executed with outcome: {tc.status}")
    return tc

@router.post("/simulate-payment-gateway")
def simulate_payment_gateway(
    req: PaymentSimulateRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Simulated e-commerce payment gateway endpoint for testing idempotency and duplicate callback handling.
    No real money or actual card credentials are used or stored.
    """
    key = req.idempotency_key
    if key in PROCESSED_IDEMPOTENCY_KEYS:
        original = PROCESSED_IDEMPOTENCY_KEYS[key]
        return {
            "status": "DUPLICATE_CALLBACK_PREVENTED",
            "message": f"Idempotency violation caught! Duplicate callback for order '{req.order_id}' discarded.",
            "is_duplicate": True,
            "original_processed_at": original["timestamp"],
            "prevented_double_charge": True
        }

    # Record first occurrence
    record = {
        "order_id": req.order_id,
        "amount": req.amount,
        "currency": req.currency,
        "status": "CHARGED_SUCCESSFULLY",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    PROCESSED_IDEMPOTENCY_KEYS[key] = record

    return {
        "status": "PROCESSED_SUCCESSFULLY",
        "message": f"Simulated payment of {req.currency} {req.amount:.2f} for order '{req.order_id}' completed.",
        "is_duplicate": False,
        "idempotency_token_stored": key,
        "prevented_double_charge": False
    }
