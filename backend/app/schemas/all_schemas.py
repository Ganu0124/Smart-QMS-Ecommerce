from typing import List, Optional
import datetime
from pydantic import BaseModel, EmailStr, Field

# ----------------- User Schemas -----------------
class UserLogin(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str = "Developer"
    username: Optional[str] = None
    is_active: bool = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime] = None
    username: Optional[str] = None
    must_change_password: Optional[bool] = False

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str

# ----------------- Project Schemas -----------------
class ProjectCreate(BaseModel):
    project_code: Optional[str] = None
    code: Optional[str] = None
    name: str
    description: Optional[str] = None
    status: str = "active"
    project_owner_id: Optional[int] = None
    target_release_date: Optional[datetime.datetime] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    project_owner_id: Optional[int] = None
    target_release_date: Optional[datetime.datetime] = None

class ProjectResponse(BaseModel):
    id: int
    project_code: str
    code: Optional[str] = None
    name: str
    description: Optional[str] = None
    status: str
    project_owner_id: Optional[int] = None
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime] = None
    target_release_date: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

# ----------------- Quality Planning Schemas -----------------
class QualityObjectiveCreate(BaseModel):
    project_id: int
    title: str
    description: Optional[str] = None
    quality_factor: str
    target_value: Optional[float] = None
    measurement_unit: Optional[str] = "%"
    unit: Optional[str] = None
    owner_id: Optional[int] = None
    due_date: Optional[datetime.datetime] = None
    priority: Optional[str] = "high"
    status: str = "in_progress"
    # Compatibility
    measurable_target: Optional[str] = None
    metric_key: Optional[str] = None
    responsible_owner: Optional[str] = None
    deadline: Optional[datetime.datetime] = None

class QualityObjectiveUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    quality_factor: Optional[str] = None
    target_value: Optional[float] = None
    measurement_unit: Optional[str] = None
    unit: Optional[str] = None
    owner_id: Optional[int] = None
    due_date: Optional[datetime.datetime] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    # Compatibility
    measurable_target: Optional[str] = None
    metric_key: Optional[str] = None
    responsible_owner: Optional[str] = None
    deadline: Optional[datetime.datetime] = None

class QualityObjectiveResponse(BaseModel):
    id: int
    project_id: int
    title: str
    description: Optional[str] = None
    quality_factor: str
    target_value: Optional[float] = None
    measurement_unit: Optional[str] = "%"
    unit: Optional[str] = None
    owner_id: Optional[int] = None
    due_date: Optional[datetime.datetime] = None
    priority: Optional[str] = "high"
    status: str
    # Compatibility
    measurable_target: Optional[str] = None
    metric_key: Optional[str] = None
    responsible_owner: Optional[str] = None
    deadline: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class RiskAssessmentCreate(BaseModel):
    project_id: int
    risk_item: str
    category: str
    probability: str
    impact: str
    risk_score: int
    mitigation_strategy: str
    status: str = "mitigated"

class RiskAssessmentResponse(BaseModel):
    id: int
    project_id: int
    risk_item: str
    category: str
    probability: str
    impact: str
    risk_score: int
    mitigation_strategy: str
    status: str

    class Config:
        from_attributes = True

class QAPlanCreate(BaseModel):
    project_id: int
    version: str = "1.0"
    title: str
    scope: str
    quality_standards: str
    review_cadence: str
    release_criteria_summary: str

class QAPlanResponse(BaseModel):
    id: int
    project_id: int
    version: str
    title: str
    scope: str
    quality_standards: str
    review_cadence: str
    release_criteria_summary: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class MilestoneCreate(BaseModel):
    project_id: int
    name: str
    target_date: Optional[datetime.datetime] = None
    status: str = "pending"
    criteria: Optional[str] = None

class MilestoneResponse(BaseModel):
    id: int
    project_id: int
    name: str
    target_date: Optional[datetime.datetime]
    status: str
    criteria: Optional[str]

    class Config:
        from_attributes = True

# ----------------- Requirement Schemas -----------------
class RequirementCreate(BaseModel):
    project_id: int
    title: str
    description: str
    acceptance_criteria: str
    category: Optional[str] = "functional"
    priority: str = "high"
    risk_level: str = "medium"
    quality_factor: str = "reliability"
    quality_objective_id: Optional[int] = None
    is_mandatory: bool = True

class RequirementUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    risk_level: Optional[str] = None
    quality_factor: Optional[str] = None
    quality_objective_id: Optional[int] = None
    is_mandatory: Optional[bool] = None
    review_status: Optional[str] = None

class RequirementApproval(BaseModel):
    decision: str # "approved" or "rejected"
    comments: Optional[str] = None

class RequirementHistoryResponse(BaseModel):
    id: int
    version: int
    title: str
    description: str
    acceptance_criteria: str
    changed_by: str
    change_summary: Optional[str]
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

class RequirementResponse(BaseModel):
    id: int
    req_code: str
    project_id: int
    title: str
    description: str
    acceptance_criteria: str
    category: Optional[str] = "functional"
    priority: str
    risk_level: str
    quality_factor: str
    quality_objective_id: Optional[int] = None
    version: int
    is_mandatory: bool
    author_id: int
    reviewer_id: Optional[int]
    review_status: Optional[str] = "unreviewed"
    status: str
    review_comments: Optional[str]
    created_at: datetime.datetime
    updated_at: datetime.datetime
    versions: List[RequirementHistoryResponse] = []

    class Config:
        from_attributes = True

# ----------------- Review Schemas -----------------
class ChecklistItemCreate(BaseModel):
    category: str
    item_name: str
    description: Optional[str] = None
    is_mandatory: bool = True
    result: str = "pending"
    comments: Optional[str] = None

class ChecklistItemUpdate(BaseModel):
    result: str # pass, fail, not_applicable, pending
    comments: Optional[str] = None

class ChecklistItemResponse(BaseModel):
    id: int
    review_id: int
    category: str
    item_name: str
    description: Optional[str]
    is_mandatory: bool
    result: str
    comments: Optional[str]

    class Config:
        from_attributes = True

class ReviewCreate(BaseModel):
    project_id: int
    review_type: str # design, code, requirement
    title: str
    target_ref: str
    requirement_id: Optional[int] = None
    task_id: Optional[int] = None
    checklist_items: Optional[List[ChecklistItemCreate]] = None

class ReviewUpdate(BaseModel):
    status: Optional[str] = None # in_progress, passed, failed, rework_required
    outcome: Optional[str] = None
    outcome_notes: Optional[str] = None
    comments: Optional[str] = None
    is_baselined: Optional[bool] = None

class ReviewResponse(BaseModel):
    id: int
    review_code: str
    project_id: int
    review_type: str
    title: str
    target_ref: str
    requirement_id: Optional[int] = None
    task_id: Optional[int] = None
    reviewer_id: Optional[int] = None
    review_date: Optional[datetime.datetime] = None
    status: str
    outcome: Optional[str] = None
    outcome_notes: Optional[str] = None
    comments: Optional[str] = None
    is_baselined: bool = False
    created_at: datetime.datetime
    checklist_items: List[ChecklistItemResponse] = []

    class Config:
        from_attributes = True

# ----------------- Task Schemas -----------------
class TaskCreate(BaseModel):
    project_id: int
    requirement_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    developer_id: Optional[int] = None
    priority: Optional[str] = "high"
    due_date: Optional[datetime.datetime] = None
    pr_url: Optional[str] = None
    branch: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    developer_id: Optional[int] = None
    priority: Optional[str] = None
    due_date: Optional[datetime.datetime] = None
    pr_url: Optional[str] = None
    branch: Optional[str] = None
    status: Optional[str] = None
    rework_status: Optional[str] = None
    review_id: Optional[int] = None

class TaskResponse(BaseModel):
    id: int
    task_code: str
    project_id: int
    requirement_id: Optional[int]
    title: str
    description: Optional[str]
    developer_id: Optional[int]
    priority: Optional[str] = "high"
    due_date: Optional[datetime.datetime] = None
    pr_url: Optional[str]
    branch: Optional[str]
    status: str
    rework_status: str
    review_id: Optional[int]
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# ----------------- Traceability Schemas -----------------
class TraceabilityItem(BaseModel):
    quality_objective: Optional[dict] = None
    requirement: dict
    design_review: Optional[dict] = None
    dev_task: Optional[dict] = None
    code_review: Optional[dict] = None
    test_cases: List[dict] = []
    defects: List[dict] = []
    coverage_status: str
    gaps: List[str] = []

class TraceabilityMatrixItem(BaseModel):
    requirement_id: int
    req_code: str
    title: str
    status: str
    quality_objective: Optional[dict] = None
    design_reviews: List[dict] = []
    dev_tasks: List[dict] = []
    code_reviews: List[dict] = []
    test_cases: List[dict] = []
    defects: List[dict] = []
    coverage_gaps: List[str] = []

class TraceabilitySummary(BaseModel):
    fully_traceable_count: int
    gap_count: int
    coverage_percentage: float

class TraceabilityMatrixResponse(BaseModel):
    project_id: int
    total_requirements: int
    fully_traceable_count: int
    coverage_percentage: float
    items: List[TraceabilityItem] = []
    matrix: List[TraceabilityMatrixItem] = []
    summary: Optional[TraceabilitySummary] = None

# ----------------- Test Case Schemas -----------------
class TestCaseCreate(BaseModel):
    project_id: int
    requirement_id: Optional[int] = None
    scenario_title: str
    scenario_category: str = "e-commerce"
    preconditions: Optional[str] = None
    test_steps: str
    expected_result: str
    is_mandatory: bool = True

class TestCaseExecute(BaseModel):
    actual_result: str
    status: str # pass, fail, blocked
    evidence_notes: Optional[str] = None
    evidence_url: Optional[str] = None

class TestCaseResponse(BaseModel):
    id: int
    tc_code: str
    project_id: int
    requirement_id: Optional[int]
    scenario_title: str
    scenario_category: str
    preconditions: Optional[str]
    test_steps: str
    expected_result: str
    actual_result: Optional[str]
    status: str
    is_mandatory: bool
    tester_id: Optional[int]
    execution_date: Optional[datetime.datetime]
    evidence_notes: Optional[str]
    evidence_url: Optional[str]
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class PaymentSimulateRequest(BaseModel):
    order_id: str
    amount: float
    currency: str = "USD"
    idempotency_key: str
    status: str = "success" # success, failed, duplicate_callback

# ----------------- Defect Schemas -----------------
class DefectCreate(BaseModel):
    project_id: int
    requirement_id: Optional[int] = None
    test_case_id: Optional[int] = None
    title: str
    description: str
    category: str
    severity: str # critical, high, medium, low
    priority: str # critical, high, medium, low
    affected_module: str
    steps_to_reproduce: str
    expected_result: str
    actual_result: str
    assigned_to_id: Optional[int] = None
    is_production_leakage: int = 0

class DefectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    priority: Optional[str] = None
    affected_module: Optional[str] = None
    steps_to_reproduce: Optional[str] = None
    expected_result: Optional[str] = None
    actual_result: Optional[str] = None
    assigned_to_id: Optional[int] = None
    root_cause: Optional[str] = None
    corrective_action: Optional[str] = None
    preventive_action: Optional[str] = None
    resolution_notes: Optional[str] = None

class DefectStatusUpdate(BaseModel):
    new_status: str # open, assigned, in_progress, fixed, retest, closed
    comments: Optional[str] = None
    retest_result: Optional[str] = None # passed, failed, pending
    root_cause: Optional[str] = None
    corrective_action: Optional[str] = None
    preventive_action: Optional[str] = None
    resolution_notes: Optional[str] = None

class DefectHistoryResponse(BaseModel):
    id: int
    defect_id: int
    changed_by: str
    old_status: str
    new_status: str
    comments: Optional[str]
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

class DefectResponse(BaseModel):
    id: int
    defect_code: str
    project_id: int
    requirement_id: Optional[int]
    test_case_id: Optional[int]
    title: str
    description: str
    category: str
    severity: str
    priority: str
    affected_module: str
    steps_to_reproduce: str
    expected_result: str
    actual_result: str
    assigned_to_id: Optional[int]
    root_cause: Optional[str]
    corrective_action: Optional[str]
    preventive_action: Optional[str]
    resolution_notes: Optional[str]
    retest_result: str
    status: str
    is_production_leakage: int
    created_at: datetime.datetime
    closed_at: Optional[datetime.datetime]
    history: List[DefectHistoryResponse] = []

    class Config:
        from_attributes = True

# ----------------- Release Schemas -----------------
class ReleaseCreate(BaseModel):
    project_id: int
    version_name: str
    target_environment: str = "production"

class ReleaseGateResultResponse(BaseModel):
    id: int
    check_code: str
    check_name: str
    is_mandatory: bool
    status: str # PASS, FAIL
    explanation: str
    related_record: Optional[str]
    required_corrective_action: Optional[str]

    class Config:
        from_attributes = True

class ReleaseResponse(BaseModel):
    id: int
    release_code: str
    project_id: int
    version_name: str
    target_environment: str
    release_decision: str # BLOCKED, READY_FOR_APPROVAL, APPROVED
    evaluator_id: Optional[int]
    evaluated_at: Optional[datetime.datetime]
    approved_by_id: Optional[int]
    approved_at: Optional[datetime.datetime]
    approval_notes: Optional[str]
    approval_history: Optional[str]
    created_at: datetime.datetime
    gate_results: List[ReleaseGateResultResponse] = []

    class Config:
        from_attributes = True

class ReleaseApproveRequest(BaseModel):
    notes: Optional[str] = None

# ----------------- CAPA Schemas -----------------
class CAPACreate(BaseModel):
    project_id: int
    defect_id: Optional[int] = None
    title: str
    root_cause_analysis: str
    immediate_correction: str
    corrective_action: str
    preventive_action: str
    owner_id: int
    due_date: datetime.datetime

class CAPAUpdate(BaseModel):
    title: Optional[str] = None
    root_cause_analysis: Optional[str] = None
    immediate_correction: Optional[str] = None
    corrective_action: Optional[str] = None
    preventive_action: Optional[str] = None
    owner_id: Optional[int] = None
    due_date: Optional[datetime.datetime] = None
    status: Optional[str] = None # open, in_progress, pending_verification, closed
    verification_evidence: Optional[str] = None
    effectiveness_review: Optional[str] = None
    is_effective: Optional[bool] = None

class CAPAResponse(BaseModel):
    id: int
    capa_code: str
    project_id: int
    defect_id: Optional[int]
    title: str
    root_cause_analysis: str
    immediate_correction: str
    corrective_action: str
    preventive_action: str
    owner_id: int
    due_date: datetime.datetime
    status: str
    verification_evidence: Optional[str]
    effectiveness_review: Optional[str]
    is_effective: Optional[bool]
    created_at: datetime.datetime
    closed_at: Optional[datetime.datetime]
    is_overdue: bool = False

    class Config:
        from_attributes = True

# ----------------- Metrics & Dashboard Schemas -----------------
class DashboardSummary(BaseModel):
    total_projects: int
    total_requirements: int
    requirements_awaiting_approval: int
    code_review_completion_percentage: float
    test_pass_percentage: float
    open_defects_by_severity: dict
    failed_quality_gates: int
    release_readiness_status: str # BLOCKED, READY_FOR_APPROVAL, APPROVED, NO_RELEASE
    corrective_actions_awaiting_closure: int

class QualityMetricsDetails(BaseModel):
    project_id: Optional[int]
    requirements_approval_rate: float
    code_review_completion_rate: float
    test_pass_rate: float
    defect_density: float # defects / requirements
    defect_leakage: float # production defects / total defects * 100
    mean_time_to_resolve_hours: float
    capa_closure_rate: float
    open_critical_high_defects: int
    release_gate_pass_rate: float
    severity_breakdown: dict
    category_breakdown: dict
    test_status_breakdown: dict

# ----------------- Software Quality Metrics (DevP, CRe, DocRe) -----------------
class DevPCalculateRequest(BaseModel):
    project_id: int
    development_hours: float
    software_size_kloc: float

class CReCalculateRequest(BaseModel):
    project_id: int
    reused_kloc: float
    total_kloc: float

class DocReCalculateRequest(BaseModel):
    project_id: int
    reused_documents: int
    total_documents: int

class SoftwareQualityMetricResponse(BaseModel):
    id: int
    project_id: int
    metric_key: Optional[str] = None
    metric_name: str
    formula: Optional[str] = None
    raw_inputs: Optional[str] = None
    value: float
    unit: str
    interpretation: Optional[str] = None
    calculation_details: Optional[str] = None
    measurement_date: datetime.datetime
    recorded_by_id: Optional[int] = None

    class Config:
        from_attributes = True

# ----------------- Audit Log Schemas -----------------
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    username: str
    action: str
    entity_type: str
    entity_id: str
    change_details: Optional[str]
    timestamp: datetime.datetime

    class Config:
        from_attributes = True
