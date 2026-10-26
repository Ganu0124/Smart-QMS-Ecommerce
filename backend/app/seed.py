import datetime
import json
from sqlalchemy.orm import Session
from app.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.quality_plan import QualityObjective, QualityMetric, RiskAssessment, QualityAssurancePlan, ProjectMilestone
from app.models.requirement import Requirement, RequirementHistory
from app.models.review import Review, ReviewChecklistItem
from app.models.task import DevTask
from app.models.test_case import TestCase
from app.models.defect import Defect, DefectHistory
from app.models.release import Release, ReleaseGateResult
from app.models.capa import CAPA
from app.models.audit import AuditLog
from app.services.auth import hash_password
from app.services.gate_engine import evaluate_release_gate
from app.services.audit import log_audit

def seed_database(db: Session):
    print("Dropping existing tables and rebuilding schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # 1. Users
    print("Creating users...")
    admin = User(
        username="admin",
        email="admin@smartqms.io",
        full_name="Alex Mercer (System Admin)",
        hashed_password=hash_password("Admin@12345"),
        role="admin",
        must_change_password=False
    )
    qamanager = User(
        username="qamanager",
        email="qa.lead@smartqms.io",
        full_name="Sarah Jenkins (QA Director)",
        hashed_password=hash_password("Manager@12345"),
        role="quality_manager",
        must_change_password=False
    )
    dev = User(
        username="developer",
        email="dev.ecom@smartqms.io",
        full_name="Liam Patel (Senior Backend Dev)",
        hashed_password=hash_password("Dev@12345"),
        role="developer",
        must_change_password=False
    )
    tester = User(
        username="tester",
        email="tester.qa@smartqms.io",
        full_name="Elena Rostova (Lead SDET)",
        hashed_password=hash_password("Tester@12345"),
        role="tester",
        must_change_password=False
    )
    reviewer = User(
        username="reviewer",
        email="arch.reviewer@smartqms.io",
        full_name="Marcus Vance (Principal Architect)",
        hashed_password=hash_password("Reviewer@12345"),
        role="reviewer",
        must_change_password=False
    )
    db.add_all([admin, qamanager, dev, tester, reviewer])
    db.commit()

    # 2. Project
    print("Creating e-commerce project...")
    project = Project(
        code="ECOMM-CORE",
        name="E-Commerce Core Platform (Checkout & Payments)",
        description="Enterprise online commerce platform processing high-volume transactions with strict zero-double-charge and ACID compliance requirements.",
        status="active",
        target_release_date=datetime.datetime.utcnow() + datetime.timedelta(days=14)
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # 3. Quality Objectives & Planning
    print("Creating quality objectives and risk assessments...")
    now = datetime.datetime.now(datetime.timezone.utc)
    obj1 = QualityObjective(
        project_id=project.id,
        title="Prevent Duplicate Payment Processing",
        description="Prevent duplicate customer payment deductions caused by gateway retries, double clicks, or asynchronous webhook re-delivery [Demonstration Data].",
        measurable_target="0.00% duplicate charge tolerance across 100k simulated transactions",
        metric_key="duplicate_payment_rate",
        target_value=0.0,
        measurement_unit="incidents",
        quality_factor="reliability",
        responsible_owner="Liam Patel",
        owner_id=dev.id,
        due_date=now + datetime.timedelta(days=7),
        status="at_risk" # Currently at risk due to DEF-01-001!
    )
    obj2 = QualityObjective(
        project_id=project.id,
        title="Automated Test Suite Pass Rate",
        description="Maintain comprehensive regression pass rate across all checkout and catalog journeys [Demonstration Data].",
        measurable_target=">= 90% pass rate on mandatory test scenarios",
        metric_key="test_pass_rate",
        target_value=90.0,
        measurement_unit="%",
        quality_factor="testability",
        responsible_owner="Elena Rostova",
        owner_id=tester.id,
        due_date=now + datetime.timedelta(days=10),
        status="in_progress"
    )
    obj3 = QualityObjective(
        project_id=project.id,
        title="Complete Mandatory Code Reviews Before Release",
        description="Enforce two-person rule with static security analysis and documented review approval on all PRs [Demonstration Data].",
        measurable_target="100% completed peer code reviews prior to staging deployment",
        metric_key="code_review_completion_rate",
        target_value=100.0,
        measurement_unit="%",
        quality_factor="maintainability",
        responsible_owner="Marcus Vance",
        owner_id=reviewer.id,
        due_date=now + datetime.timedelta(days=12),
        status="achieved"
    )
    obj4 = QualityObjective(
        project_id=project.id,
        title="Ensure Product Prices Match Approved Requirements",
        description="Verify 100% price accuracy between product catalog master and client cart checkout totals [Demonstration Data].",
        measurable_target="100% pricing accuracy matching catalog DB specifications",
        metric_key="price_accuracy_rate",
        target_value=100.0,
        measurement_unit="%",
        quality_factor="correctness",
        responsible_owner="Sarah Jenkins",
        owner_id=qamanager.id,
        due_date=now + datetime.timedelta(days=14),
        status="achieved"
    )
    obj5 = QualityObjective(
        project_id=project.id,
        title="Protect Customer and Transaction Data",
        description="Enforce zero plaintext payment card storage, tokenized transactions, and bcrypt password hashing [Demonstration Data].",
        measurable_target="100% PCI-DSS tokenization compliance and zero unhashed credentials",
        metric_key="security_compliance_score",
        target_value=100.0,
        measurement_unit="%",
        quality_factor="security",
        responsible_owner="Sarah Jenkins",
        owner_id=qamanager.id,
        due_date=now + datetime.timedelta(days=14),
        status="achieved"
    )
    obj6 = QualityObjective(
        project_id=project.id,
        title="Maintain Accurate Order and Inventory Records",
        description="Ensure atomic stock reservation locks prevent inventory discrepancies and overselling during flash sales [Demonstration Data].",
        measurable_target="0 inventory discrepancies under concurrent checkout conditions",
        metric_key="inventory_accuracy_rate",
        target_value=100.0,
        measurement_unit="%",
        quality_factor="data_integrity",
        responsible_owner="Liam Patel",
        owner_id=dev.id,
        due_date=now + datetime.timedelta(days=8),
        status="in_progress"
    )
    obj7 = QualityObjective(
        project_id=project.id,
        title="Detect Critical Defects Before Production Deployment",
        description="Identify and isolate all severity-critical functional defects in automated CI and staging environments [Demonstration Data].",
        measurable_target="100% detection of severity-critical defects before release sign-off",
        metric_key="critical_defect_detection_rate",
        target_value=100.0,
        measurement_unit="%",
        quality_factor="testability",
        responsible_owner="Elena Rostova",
        owner_id=tester.id,
        due_date=now + datetime.timedelta(days=5),
        status="in_progress"
    )
    db.add_all([obj1, obj2, obj3, obj4, obj5, obj6, obj7])
    db.commit()

    # Risk Assessments
    risk1 = RiskAssessment(
        project_id=project.id,
        risk_item="Duplicate payment webhook race conditions during network degradation",
        category="payment",
        probability="high",
        impact="high",
        risk_score=20,
        mitigation_strategy="Implement distributed Redis mutex locking on transaction idempotency keys combined with database unique constraints.",
        status="mitigating"
    )
    risk2 = RiskAssessment(
        project_id=project.id,
        risk_item="Cart price tampering via manipulated client-side payload",
        category="security",
        probability="medium",
        impact="high",
        risk_score=15,
        mitigation_strategy="Enforce server-side price validation querying primary catalog DB at checkout finalization.",
        status="mitigated"
    )
    risk3 = RiskAssessment(
        project_id=project.id,
        risk_item="Inventory overselling on flash sale concurrent purchases",
        category="data_integrity",
        probability="high",
        impact="high",
        risk_score=18,
        mitigation_strategy="Database row-level locking (SELECT FOR UPDATE) on stock reservation tables.",
        status="mitigated"
    )
    db.add_all([risk1, risk2, risk3])
    db.commit()

    # 3. Three Software Quality Metrics (DevP, CRe, DocRe)
    print("Creating three software quality metrics...")
    metric_devp = QualityMetric(
        project_id=project.id,
        metric_key="DevP",
        metric_name="Development Effort per KLOC",
        formula="Development Hours / KLOC",
        raw_inputs=json.dumps({"development_hours": 4800, "software_size_kloc": 120}),
        value=40.0,
        unit="hours/KLOC",
        interpretation="Lower effort per KLOC is generally desirable when comparing similar projects with comparable scope and quality. Do not use this measure alone to judge developer productivity.",
        calculation_details="Development Hours (4,800.0 hrs) / Software Size (120.0 KLOC) = 40.0 hours/KLOC",
        recorded_by_id=dev.id,
        measurement_date=now - datetime.timedelta(days=2)
    )
    metric_cre = QualityMetric(
        project_id=project.id,
        metric_key="CRe",
        metric_name="Code Reuse Ratio",
        formula="Reused KLOC / Total KLOC × 100",
        raw_inputs=json.dumps({"reused_kloc": 30, "total_kloc": 120}),
        value=25.0,
        unit="%",
        interpretation="A higher reuse ratio indicates greater reuse of existing code. Also track the suitability and quality of reused components.",
        calculation_details="(30.0 Reused KLOC / 120.0 Total KLOC) × 100 = 25.0%",
        recorded_by_id=dev.id,
        measurement_date=now - datetime.timedelta(days=2)
    )
    metric_docre = QualityMetric(
        project_id=project.id,
        metric_key="DocRe",
        metric_name="Documentation Reuse Ratio",
        formula="Reused Documents / Total Documents × 100",
        raw_inputs=json.dumps({"reused_documents": 15, "total_documents": 50}),
        value=30.0,
        unit="%",
        interpretation="A higher ratio indicates greater documentation reuse. Verify each reused document against current requirements.",
        calculation_details="(15 Reused Documents / 50 Total Documents) × 100 = 30.0%",
        recorded_by_id=qamanager.id,
        measurement_date=now - datetime.timedelta(days=1)
    )
    db.add_all([metric_devp, metric_cre, metric_docre])
    db.commit()

    # QA Plan & Milestones
    qa_plan = QualityAssurancePlan(
        project_id=project.id,
        version="2.0",
        title="E-Commerce Core Quality Assurance & Verification Charter",
        scope="Covers Checkout microservices, Payment Webhook Ingestion, Cart Calculation, and Catalog Reservation [Demonstration Data].",
        quality_standards="ISO/IEC 25010 Software Product Quality, PCI-DSS Level 1 payment compliance guidelines.",
        review_cadence="Weekly architectural baselining and mandatory PR sign-off before merge.",
        release_criteria_summary="Zero open Critical/High defects; 100% mandatory test pass rate; formal baselined architecture."
    )
    db.add(qa_plan)

    ms1 = ProjectMilestone(project_id=project.id, name="Sprint 1: Architecture & Design Review", status="completed", criteria="All 8 design checklist categories verified and baselined.")
    ms2 = ProjectMilestone(project_id=project.id, name="Sprint 2: Test Suite Execution & Defect Fixing", status="in_progress", criteria="Execute 10 mandatory e-commerce scenarios and remediate Critical defects.")
    ms3 = ProjectMilestone(project_id=project.id, name="Sprint 3: Smart Release Gate Approval", status="pending", criteria="Pass automated 8-gate release verification for Production.")
    db.add_all([ms1, ms2, ms3])
    db.commit()

    # 4. Requirements
    print("Creating requirements...")
    req1 = Requirement(
        req_code="REQ-01-001",
        project_id=project.id,
        title="Idempotent Payment Processing & Duplicate Prevention",
        description="The system must prevent duplicate payments when a customer submits checkout multiple times or when payment gateways send concurrent asynchronous webhook callbacks [Demonstration Data].",
        acceptance_criteria="1. Every checkout generates a cryptographically unique Idempotency-Key.\n2. Subsequent calls with the same key within 24 hours must return the cached transaction receipt without double deduction.\n3. Gateway webhook callbacks with identical transaction IDs must be processed exactly once.",
        priority="critical",
        risk_level="high",
        quality_factor="reliability",
        quality_objective_id=obj1.id,
        version=1,
        is_mandatory=True,
        author_id=dev.id,
        reviewer_id=qamanager.id,
        status="approved",
        review_comments="Formally approved with emphasis on Redis distributed lock."
    )
    req2 = Requirement(
        req_code="REQ-01-002",
        project_id=project.id,
        title="Atomic Shopping Cart Pricing & Discount Calculation",
        description="All cart subtotals, promotional discounts, taxes, and shipping fees must be computed atomically on the backend, ignoring any client-modified price fields [Demonstration Data].",
        acceptance_criteria="1. Line item prices are fetched directly from master SKU database.\n2. Coupon validity is validated against expiration timestamp and usage limits.\n3. Order grand total equals subtotal + tax + shipping - discounts exactly to 2 decimal places.",
        priority="high",
        risk_level="medium",
        quality_factor="correctness",
        quality_objective_id=obj4.id,
        version=1,
        is_mandatory=True,
        author_id=dev.id,
        reviewer_id=qamanager.id,
        status="approved",
        review_comments="Approved. Currency precision rounding must use Banker's rounding."
    )
    req3 = Requirement(
        req_code="REQ-01-003",
        project_id=project.id,
        title="Customer Authentication & Session Protection",
        description="Secure customer login using bcrypt password hashing, short-lived JWT bearer tokens, and brute-force protection [Demonstration Data].",
        acceptance_criteria="1. Passwords hashed using bcrypt with salt rounds >= 12.\n2. Invalid login attempts throttled after 5 consecutive failures.\n3. Session tokens invalidate upon explicit logout.",
        priority="high",
        risk_level="high",
        quality_factor="security",
        quality_objective_id=obj5.id,
        version=1,
        is_mandatory=True,
        author_id=dev.id,
        reviewer_id=qamanager.id,
        status="approved",
        review_comments="Security audit verified."
    )
    req4 = Requirement(
        req_code="REQ-01-004",
        project_id=project.id,
        title="Real-Time Inventory Reservation & Stock Concurrency",
        description="Lock available item stock when checkout initiates to prevent overselling on scarce inventory [Demonstration Data].",
        acceptance_criteria="1. Stock decremented in database transaction with row-level locks.\n2. If stock is 0, checkout is rejected with OUT_OF_STOCK error.\n3. Unfinished checkouts release reserved stock after 15 minutes.",
        priority="high",
        risk_level="medium",
        quality_factor="data_integrity",
        quality_objective_id=obj6.id,
        version=1,
        is_mandatory=True,
        author_id=dev.id,
        reviewer_id=qamanager.id,
        status="approved",
        review_comments="Approved."
    )
    req5 = Requirement(
        req_code="REQ-01-005",
        project_id=project.id,
        title="Customer Returns & Refund Workflow",
        description="Automated customer return request submission with partial and full refund processing [Demonstration Data].",
        acceptance_criteria="1. Customer can select items to return within 30 days of delivery.\n2. Refund initiates back to original payment method upon warehouse inspection.",
        priority="medium",
        risk_level="low",
        quality_factor="usability",
        version=1,
        is_mandatory=False, # Optional for core release
        author_id=dev.id,
        status="submitted",
        review_status="in_review",
        review_comments="Submitted for architectural review. Pending warehouse logistics integration."
    )
    req6 = Requirement(
        req_code="REQ-01-006",
        project_id=project.id,
        title="Store Raw Passwords in Session Cache for Rapid Checkout [Demonstration Data]",
        description="Cache plaintext user passwords in Redis session to bypass authentication queries during high-concurrency checkout bursts [Demonstration Data].",
        acceptance_criteria="1. Store plaintext user password in session store.\n2. Skip bcrypt cryptographic verification on active checkout requests.",
        category="security",
        priority="critical",
        risk_level="high",
        quality_factor="security",
        quality_objective_id=obj5.id,
        version=1,
        is_mandatory=False,
        author_id=dev.id,
        reviewer_id=reviewer.id,
        status="rejected",
        review_status="failed",
        review_comments="Rejected by Marcus Vance (Principal Architect): Critical security non-compliance. Storing unhashed user credentials violates PCI-DSS Section 3.4 and NIST SP 800-63B standards. Plaintext caching introduces severe credential leakage vulnerability."
    )
    db.add_all([req1, req2, req3, req4, req5, req6])
    db.flush()

    # Create immutable version records for seed requirements
    for r in [req1, req2, req3, req4, req5, req6]:
        v = RequirementHistory(
            requirement_id=r.id,
            version_number=1,
            title=r.title,
            description=r.description,
            acceptance_criteria=r.acceptance_criteria,
            author_id=r.author_id or dev.id,
            change_description=f"Initial specification baselined as v1 for {r.req_code}",
            created_at=now
        )
        db.add(v)
    db.commit()

    # 5. Reviews
    print("Creating design and code reviews...")
    # DR-01-001: Passed and baselined design review
    dr1 = Review(
        review_code="DR-01-001",
        project_id=project.id,
        review_type="design",
        title="Checkout & Payment Architecture Specification Review",
        target_ref="REQ-01-001",
        requirement_id=req1.id,
        reviewer_id=reviewer.id,
        status="passed",
        outcome="approved",
        is_baselined=True,
        outcome_notes="Architecture design approved. All 10 mandatory checklist items verified compliant."
    )
    # DR-01-002: Design review with incomplete checklist to demonstrate blocked baselining
    dr2 = Review(
        review_code="DR-01-002",
        project_id=project.id,
        review_type="design",
        title="Customer Returns & Reverse Logistics Architecture Review [Demonstration Data]",
        target_ref="REQ-01-005",
        requirement_id=req5.id,
        reviewer_id=reviewer.id,
        status="in_progress",
        outcome="rework_required",
        is_baselined=False,
        outcome_notes="Architecture review in progress. Mandatory database locking and recovery items remain unresolved; baselining blocked."
    )
    # RR-01-001: Requirement review for REQ-01-005
    rr1 = Review(
        review_code="RR-01-001",
        project_id=project.id,
        review_type="requirement",
        title=f"Requirements Quality Review: {req5.req_code} - {req5.title}",
        target_ref=req5.req_code,
        requirement_id=req5.id,
        reviewer_id=reviewer.id,
        status="in_progress",
        is_baselined=False
    )
    # RR-01-002: Requirement review for REQ-01-006 (Rejected)
    rr2 = Review(
        review_code="RR-01-002",
        project_id=project.id,
        review_type="requirement",
        title=f"Requirements Quality Review: {req6.req_code} - {req6.title}",
        target_ref=req6.req_code,
        requirement_id=req6.id,
        reviewer_id=reviewer.id,
        status="failed",
        outcome="rejected",
        is_baselined=False,
        outcome_notes="Rejected due to NIST 800-63B and PCI-DSS compliance failure on security checklist item."
    )

    db.add_all([dr1, dr2, rr1, rr2])
    db.flush()

    # Checklist items for DR-01-001 (10 passed items)
    design_checklist_1 = [
        ("architecture", "Architecture & Component Boundaries", "Microservice/module boundaries and event contracts clearly defined.", True, "pass", "Module separation confirmed."),
        ("database", "Database Transaction Consistency", "ACID guarantees and foreign key integrity verified.", True, "pass", "PostgreSQL/SQLite transaction isolation verified."),
        ("transaction", "Transaction Integrity", "Atomic multi-step transaction boundaries and rollback mechanisms are defined.", True, "pass", "Transaction boundaries verified."),
        ("payment_idempotency", "Payment Idempotency & Duplicate Prevention", "Unique transaction idempotency keys and atomic webhook ingestion.", True, "pass", "Architecture design includes idempotency token pattern."),
        ("auth", "Authentication & Authorization Controls", "JWT expiration and RBAC enforced at endpoint layer.", True, "pass", "Role checks implemented."),
        ("validation", "Input Validation & Defensive Error Handling", "Server-side schema validation and standard RFC7807 error formats.", True, "pass", "Standard HTTP error formats adopted."),
        ("security", "Data Security & Privacy (PCI-DSS / GDPR)", "Zero storage of plaintext payment card details.", True, "pass", "Tokenization via gateway used."),
        ("performance", "Performance & Scalability Under Load", "Database indexing on checkout queries and connection pooling.", True, "pass", "Indexes configured on foreign keys."),
        ("recovery", "Fault Recovery & Circuit Breakers", "Payment gateway retry policies and dead letter queues.", True, "pass", "Exponential backoff enabled."),
        ("maintainability", "Testability & Maintainability", "Modular design permitting isolated unit, integration, and contract testing.", True, "pass", "Test harness structure verified.")
    ]
    for cat, name, desc, mand, res, comm in design_checklist_1:
        ci = ReviewChecklistItem(
            review_id=dr1.id,
            category=cat,
            checklist_description=f"{name}: {desc}",
            is_mandatory=mand,
            review_result=res,
            comments=comm,
            reviewer_id=reviewer.id
        )
        db.add(ci)

    # Checklist items for DR-01-002 (Incomplete checklist: some pass, pending, and fail)
    design_checklist_2 = [
        ("architecture", "Architecture & Component Boundaries", "Microservice/module boundaries defined.", True, "pass", "Architecture diagrams provided."),
        ("database", "Database Relationships & Consistency", "Stock reservation row lock table relations.", True, "fail", "Potential deadlock between catalog and cart locks under heavy load."),
        ("transaction", "Transaction Integrity", "Two-phase stock reservation rollback.", True, "pending", None),
        ("payment_idempotency", "Duplicate Operation Prevention", "Cart lock deduplication tokens.", True, "pass", "Verified deduplication."),
        ("auth", "Authentication & Authorization", "Restricted checkout worker permissions.", True, "pass", "Verified least privilege."),
        ("validation", "Input Validation & Error Handling", "Quantity and SKU validation.", True, "pass", "Bound checks enforced."),
        ("security", "Security & Privacy", "PII isolation in order logging.", True, "pass", "PII masked in log streams."),
        ("performance", "Performance & Scalability", "Index on reservation expiration timestamp.", True, "pending", None),
        ("recovery", "Recovery from Failed Transactions", "Automatic reservation timeout cleanup cron.", True, "fail", "Timeout reconciliation service missing circuit breaker."),
        ("maintainability", "Testability & Maintainability", "Simulated stock race test cases defined.", True, "pending", None)
    ]
    for cat, name, desc, mand, res, comm in design_checklist_2:
        ci = ReviewChecklistItem(
            review_id=dr2.id,
            category=cat,
            checklist_description=f"{name}: {desc}",
            is_mandatory=mand,
            review_result=res,
            comments=comm,
            reviewer_id=reviewer.id
        )
        db.add(ci)

    # Code Reviews
    cr1 = Review(
        review_code="CR-01-001",
        project_id=project.id,
        review_type="code",
        title="PR #102: Idempotent Payment Webhook Ingestion Implementation",
        target_ref="PR #102 (github.com/ecom/checkout/pull/102)",
        requirement_id=req1.id,
        reviewer_id=reviewer.id,
        status="passed",
        outcome="approved",
        is_baselined=False,
        outcome_notes="Code reviewed and unit tests passed by principal reviewer Marcus Vance."
    )
    cr2 = Review(
        review_code="CR-01-002",
        project_id=project.id,
        review_type="code",
        title="PR #105: Shopping Cart Dynamic Discount Calculation Service",
        target_ref="PR #105 (github.com/ecom/checkout/pull/105)",
        requirement_id=req2.id,
        reviewer_id=reviewer.id,
        status="passed",
        outcome="approved",
        is_baselined=False,
        outcome_notes="Reviewed and approved by Marcus Vance."
    )
    db.add_all([cr1, cr2])
    db.flush()

    # Checklist items for CR-01-001 (10 passed items)
    code_checklist_1 = [
        ("correctness", "Correctness of Implementation", "Implementation fulfills payment idempotency logic.", True, "pass", "Verified logic."),
        ("consistency", "Consistency with Approved Requirements", "Follows REQ-01-001 specification.", True, "pass", "Criteria met."),
        ("error_handling", "Defensive Error Handling", "Handles timeout and gateway network faults.", True, "pass", "Clean exception handling."),
        ("security", "Security & Authorization Controls", "Authorization verified on callback endpoint.", True, "pass", "HMAC webhook signature checked."),
        ("transaction", "Transaction & Data Integrity", "Atomic commit on payment ledger record.", True, "pass", "ACID guarantees met."),
        ("duplicate_prevention", "Duplicate Operation Prevention", "Idempotency token stored and checked.", True, "pass", "Redis distributed lock integrated."),
        ("readability", "Readability & Maintainability", "Clean modular structure with docstrings.", True, "pass", "Clean code standard met."),
        ("test_coverage", "Automated Test Coverage", "Unit tests cover duplicate replay scenarios.", True, "pass", "95% test coverage."),
        ("logging", "Logging & Exception Handling", "Audit logs generated without PII exposure.", True, "pass", "PII masked."),
        ("regression", "Regression Risk & Backward Compatibility", "No breaking changes to checkout APIs.", True, "pass", "Compatible with v1 clients.")
    ]
    for cat, name, desc, mand, res, comm in code_checklist_1:
        ci = ReviewChecklistItem(
            review_id=cr1.id,
            category=cat,
            checklist_description=f"{name}: {desc}",
            is_mandatory=mand,
            review_result=res,
            comments=comm,
            reviewer_id=reviewer.id
        )
        db.add(ci)

    db.commit()

    # 6. Development Tasks
    print("Creating development tasks...")
    task1 = DevTask(
        task_code="TASK-01-001",
        project_id=project.id,
        requirement_id=req1.id,
        title="Implement Idempotency Middleware and Unique Token Validation",
        description="PR #102: Distributed locking middleware implementation and webhook idempotency [Demonstration Data]",
        developer_id=dev.id,
        pr_url="https://github.com/ecom/core/pull/102",
        branch="feature/payment-idempotency",
        priority="critical",
        due_date=now + datetime.timedelta(days=7),
        status="completed",
        rework_status="none",
        review_id=cr1.id
    )
    task2 = DevTask(
        task_code="TASK-01-002",
        project_id=project.id,
        requirement_id=req2.id,
        title="Implement Server-Side Cart Pricing and Discount Verification",
        description="PR #105: Dynamic pricing calculation and promotional discount verification [Demonstration Data]",
        developer_id=dev.id,
        pr_url="https://github.com/ecom/core/pull/105",
        branch="feature/cart-pricing",
        priority="high",
        due_date=now + datetime.timedelta(days=10),
        status="completed",
        rework_status="none",
        review_id=cr2.id
    )
    task3 = DevTask(
        task_code="TASK-01-003",
        project_id=project.id,
        requirement_id=req4.id,
        title="Implement Row Lock Stock Reservation Service",
        description="PR #110: SELECT FOR UPDATE inventory decrement with automated 15-minute expiration worker [Demonstration Data]",
        developer_id=dev.id,
        pr_url="https://github.com/ecom/core/pull/110",
        branch="feature/stock-locking",
        priority="high",
        due_date=now + datetime.timedelta(days=12),
        status="in_progress",
        rework_status="none"
    )
    db.add_all([task1, task2, task3])
    db.commit()

    # 7. 10 E-Commerce Test Cases
    print("Creating 10 e-commerce test cases...")
    test_cases_data = [
        ("TC-01-001", req1.id, "Successful product purchase and checkout flow", "e-commerce", "User has valid account and items in cart", "1. Proceed to checkout.\n2. Submit payment with token.\n3. Verify order confirmation generated.", "Order created, payment authorized, stock decremented.", "Order ORD-9921 generated successfully. Confirmation email triggered.", "pass", True, tester.id, "Execution log ID #98223"),
        ("TC-01-002", req2.id, "Incorrect product price tampering detection", "pricing", "Item price in database is $99.00", "1. Intercept HTTP request.\n2. Modify unit_price to $1.00.\n3. Submit checkout request.", "Server detects mismatch with database catalog price and rejects order with HTTP 400.", "Request rejected with ERR_PRICE_MANIPULATION. Server recalculates true total.", "pass", True, tester.id, "Security audit log verified"),
        ("TC-01-003", req4.id, "Out-of-stock product purchase prevention", "inventory", "Product SKU-A has quantity = 0", "1. Attempt to add SKU-A to cart.\n2. Proceed to checkout.", "System displays 'Item Out of Stock' and prevents order submission.", "Checkout blocked. Error banner shown: 'Inventory depleted'.", "pass", True, tester.id, "Screenshot attached"),
        ("TC-01-004", req1.id, "Duplicate payment callback idempotency verification", "payment", "Customer order #8821 in PROCESSING state", "1. Send simulated payment webhook callback for Order #8821.\n2. Concurrently re-send exact same webhook with same idempotency token.\n3. Inspect customer transaction ledger.", "Second callback is identified as duplicate, discarded, and customer is charged exactly ONCE.", "FAILED: Race condition detected! Webhook handler executed concurrently before lock acquisition, charging customer card TWICE ($49.99 x 2).", "fail", True, tester.id, "Trace ID #ERR-PAY-DUP-994"),
        ("TC-01-005", req1.id, "Failed payment and order recovery rollback", "payment", "Customer enters expired credit card credentials", "1. Submit checkout.\n2. Gateway returns DECLINED.\n3. Verify stock reservation is returned.", "Order marked as FAILED, reserved inventory unlocked back to catalog.", "Stock returned to available inventory pool within 120ms.", "pass", True, tester.id, "Log dump trace #8821"),
        ("TC-01-006", req2.id, "Cart quantity updates and concurrency limits", "cart", "Cart contains 2 items", "1. Rapidly click increment button (+1) 5 times in under 1 second.\n2. Verify final quantity.", "Final cart quantity is 7, subtotal correctly updated.", "Debounced update succeeded, subtotal verified.", "pass", True, tester.id, "Automated test script pass"),
        ("TC-01-007", req3.id, "Unauthorized account order history access prevention", "security", "User A logged in, User B order #7712 exists", "1. User A attempts GET /api/orders/7712 without ownership or admin role.", "HTTP 403 Forbidden returned.", "HTTP 403 Forbidden correctly returned. Security event logged.", "pass", True, tester.id, "OWASP test suite pass"),
        ("TC-01-008", req2.id, "Invalid or expired coupon application rejection", "pricing", "Promo coupon 'SUMMER2024' expired on 2024-09-01", "1. Apply coupon code 'SUMMER2024' to cart subtotal.", "Coupon rejected with message 'Coupon has expired'. Subtotal remains unchanged.", "Coupon rejected. Discount not applied.", "pass", True, tester.id, "Regression log #1092"),
        ("TC-01-009", req1.id, "Order status mismatch reconciliation check", "payment", "Payment marked as CAPTURED in Stripe, order PENDING in DB", "1. Trigger background reconciliation cron.\n2. Check order status.", "Reconciliation cron updates order status to PAID and notifies fulfillment.", "Status auto-healed to 'PAID' after 30-second poll.", "pass", True, tester.id, "Cron run log #4492"),
        ("TC-01-010", req1.id, "Checkout end-to-end performance under SLA", "performance", "100 concurrent checkout requests", "1. Execute k6 load test simulating 100 checkout submissions.\n2. Measure p95 latency.", "p95 checkout latency under 800ms; error rate 0.0%.", "p95 latency measured at 480ms. Zero drops.", "pass", True, tester.id, "k6 performance report attached"),
        ("TC-01-011", req4.id, "Inventory consistency during concurrent flash sale reservation", "inventory", "10 units remaining in stock, 25 concurrent checkout requests", "1. Fire 25 simultaneous checkout requests.\n2. Observe database row lock on stock table.\n3. Check remaining stock count.", "Exactly 10 checkouts succeed, 15 receive OUT_OF_STOCK error, remaining stock is 0.", "Row lock verified. 10 succeeded, 15 rejected with OUT_OF_STOCK. Zero negative stock.", "pass", True, tester.id, "Concurrency trace #LOC-992"),
        ("TC-01-012", req3.id, "Invalid user input and SQL/XSS payload sanitization", "security", "Checkout shipping address input form", "1. Inject SQL syntax \"' OR 1=1 --\" into address field.\n2. Inject XSS script \"<script>alert(1)</script>\".\n3. Submit form.", "Input validated and sanitized; malicious script escaped; DB parameterized query prevents SQL injection.", "Payload sanitized. Pydantic validation rejected malformed characters with HTTP 422.", "pass", True, tester.id, "OWASP ZAP scan report verified")
    ]

    for tc_code, rid, title, cat, pre, steps, exp, act, stat, mand, tid, ev in test_cases_data:
        tc = TestCase(
            tc_code=tc_code,
            project_id=project.id,
            requirement_id=rid,
            scenario_title=title,
            scenario_category=cat,
            preconditions=pre,
            test_steps=steps,
            expected_result=exp,
            actual_result=act,
            status=stat,
            is_mandatory=mand,
            tester_id=tid,
            execution_date=datetime.datetime.utcnow(),
            evidence_notes=ev,
            evidence_url="https://artifacts.smartqms.local/evidence/" + tc_code
        )
        db.add(tc)
    db.commit()

    # 8. Defects (Including the central duplicate payment defect!)
    print("Creating defects...")
    def1 = Defect(
        defect_code="DEF-01-001",
        project_id=project.id,
        requirement_id=req1.id,
        test_case_id=4, # Linked to TC-01-004!
        title="Critical: Duplicate Payment Deduction Occurs on Concurrent Webhook Retries",
        description="When payment gateway sends concurrent duplicate webhook notifications for a single checkout, both callback threads proceed past the validation check simultaneously, executing double deduction on customer credit card and generating two invoice records.",
        category="payment_transaction",
        severity="critical",
        priority="critical",
        affected_module="Payment Gateway / Webhook Handler",
        steps_to_reproduce="1. Submit order checkout with simulated Stripe/Razorpay gateway.\n2. Simulate network delay and trigger 2 rapid webhook callbacks with identical payload and transaction ID.\n3. Check payment ledger.",
        expected_result="Only the first callback should process; second callback must recognize duplicate idempotency key and return HTTP 200 without charging.",
        actual_result="Both callbacks execute SQL INSERT concurrently. Customer card is billed twice for the same order.",
        assigned_to_id=dev.id,
        status="open", # Open initially! This is the central blocker for Release 1.0!
        retest_result="pending",
        is_production_leakage=0,
        root_cause="The webhook receiver checked database for existing transaction_id using standard SELECT without an advisory lock or unique constraint index, creating a race window between query and insert.",
        corrective_action="Add unique database constraint on (payment_provider, transaction_id) and implement Redis distributed mutex lock (Redlock) during webhook processing.",
        preventive_action="Mandate automated multi-threaded concurrency tests for all payment and financial ledger endpoints before staging deployment."
    )

    def2 = Defect(
        defect_code="DEF-01-002",
        project_id=project.id,
        requirement_id=req2.id,
        test_case_id=2,
        title="Rounding Inconsistency in Cart Subtotal Display with Fractional Coupons",
        description="Applying a 15% discount to items with odd cent values caused a 1-cent mismatch between itemized summary and grand total.",
        category="data_integrity",
        severity="medium",
        priority="medium",
        affected_module="Shopping Cart Service",
        steps_to_reproduce="1. Add $19.95 item.\n2. Apply 15% coupon ($2.9925).\n3. Observe displayed tax and total.",
        expected_result="Consistent Banker's rounding applied across summary.",
        actual_result="Floating point round caused $0.01 display discrepancy.",
        assigned_to_id=dev.id,
        status="closed",
        retest_result="passed",
        root_cause="Python float arithmetic used instead of Decimal.",
        corrective_action="Switched cart currency calculation engine to Python Decimal with ROUND_HALF_EVEN.",
        preventive_action="Added unit test matrix with 100 random fractional currency amounts.",
        resolution_notes="Fixed in PR #108. Verified with 100 test cases.",
        closed_at=datetime.datetime.utcnow() - datetime.timedelta(days=2)
    )

    def3 = Defect(
        defect_code="DEF-01-003",
        project_id=project.id,
        requirement_id=req3.id,
        test_case_id=7,
        title="Admin User Management Missing Rate Limiting on Login Route",
        description="Brute force login attempts on /api/auth/login did not trigger temporary IP lockout.",
        category="security",
        severity="high",
        priority="high",
        affected_module="Authentication Service",
        steps_to_reproduce="1. Send 20 failed login attempts within 5 seconds.",
        expected_result="HTTP 429 Too Many Requests after 5 attempts.",
        actual_result="All 20 attempts processed with HTTP 401.",
        assigned_to_id=dev.id,
        status="closed",
        retest_result="passed",
        root_cause="Rate limiting middleware was only active on customer routes.",
        corrective_action="Extended IP and username based rate limiter to all /api/auth routes.",
        preventive_action="Security automated suite updated to test brute-force on all entry points.",
        resolution_notes="Rate limiter verified with 50 test probes.",
        closed_at=datetime.datetime.utcnow() - datetime.timedelta(days=3)
    )

    db.add_all([def1, def2, def3])
    db.commit()

    # 9. Corrective and Preventive Actions (CAPA)
    print("Creating CAPA records...")
    capa1 = CAPA(
        capa_code="CAPA-2026-01-001",
        project_id=project.id,
        defect_id=def1.id,
        title="Elimination of Double Payment Webhook Race Conditions",
        root_cause_analysis="Absence of distributed locking mechanism on asynchronous payment webhooks allowed concurrent threads to pass existence checks simultaneously.",
        immediate_correction="Added DB unique constraint on payment transaction reference and implemented in-memory / Redis idempotency token registry.",
        corrective_action="1. Deploy distributed mutex lock on transaction ID.\n2. Enforce unique index at database storage engine level.",
        preventive_action="1. Establish automated concurrency regression test suite in CI.\n2. Add idempotency checklist item to mandatory Architecture Design Review.",
        owner_id=dev.id,
        due_date=datetime.datetime.utcnow() + datetime.timedelta(days=5),
        status="in_progress",
        verification_evidence="Simulation test script TC-01-004 prepared for verification.",
        effectiveness_review="Pending retesting and release evaluation."
    )
    db.add(capa1)
    db.commit()

    # 10. Releases
    print("Evaluating initial Release Candidate (Demonstrating BLOCKED state)...")
    rel1 = Release(
        release_code="REL-01-001",
        project_id=project.id,
        version_name="Release Candidate 1.0.0-RC1 (Staging)",
        target_environment="staging",
        release_decision="BLOCKED",
        approval_history=f"[{datetime.datetime.utcnow().isoformat()}] Release Candidate 1.0.0-RC1 created by {qamanager.username}"
    )
    db.add(rel1)
    db.commit()
    db.refresh(rel1)

    # Evaluate Release 1 - will be BLOCKED due to DEF-01-001 and TC-01-004!
    evaluate_release_gate(db, rel1, qamanager)

    # Initial audit logs
    log_audit(db, admin, "SEED_DATABASE", "System", "ALL", "Populated initial e-commerce quality baseline seed data")
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    db = SessionLocal()
    seed_database(db)
    db.close()
