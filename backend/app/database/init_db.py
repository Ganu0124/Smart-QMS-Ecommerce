"""Database initialization and repeatable development seed script for SmartQMS.

Usage:
    python -m app.database.init_db          # Ensure schema and seed core records
    python -m app.database.init_db --reset  # Drop all tables and re-create schema (DEV ONLY)
"""

import sys
import os
import argparse
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.database.connection import engine, SessionLocal, Base
from app.core.security import get_password_hash
from app.models.user import User
from app.models.project import Project
from app.models.quality_plan import QualityObjective, QualityMetric, RiskAssessment
from app.models.requirement import Requirement, RequirementVersion
from app.models.review import Review, ReviewChecklistItem
from app.models.task import DevTask
from app.models.audit import AuditLog
from app.routers.reviews import DEFAULT_DESIGN_CHECKLIST, DEFAULT_CODE_CHECKLIST, DEFAULT_REQUIREMENT_CHECKLIST

def utc_now():
    return datetime.now(timezone.utc)

def seed_users(db: Session):
    """Seed the 5 core development accounts idempotently."""
    default_users = [
        {
            "username": "admin",
            "email": os.getenv("SEED_ADMIN_EMAIL", "admin@smartqms.io"),
            "full_name": "Alex Mercer (System Administrator)",
            "role": "Administrator",
            "password": os.getenv("SEED_ADMIN_PASSWORD", "Admin@12345")
        },
        {
            "username": "qamanager",
            "email": os.getenv("SEED_QM_EMAIL", "qamanager@smartqms.io"),
            "full_name": "Sarah Jenkins (Quality Manager)",
            "role": "Quality Manager",
            "password": os.getenv("SEED_QM_PASSWORD", "Manager@12345")
        },
        {
            "username": "developer",
            "email": os.getenv("SEED_DEV_EMAIL", "developer@smartqms.io"),
            "full_name": "Liam Patel (Lead Backend Developer)",
            "role": "Developer",
            "password": os.getenv("SEED_DEV_PASSWORD", "Dev@12345")
        },
        {
            "username": "tester",
            "email": os.getenv("SEED_TESTER_EMAIL", "tester@smartqms.io"),
            "full_name": "Elena Rostova (Senior QA Engineer)",
            "role": "Tester",
            "password": os.getenv("SEED_TESTER_PASSWORD", "Tester@12345")
        },
        {
            "username": "reviewer",
            "email": os.getenv("SEED_REVIEWER_EMAIL", "reviewer@smartqms.io"),
            "full_name": "Marcus Vance (Principal Technical Reviewer)",
            "role": "Reviewer",
            "password": os.getenv("SEED_REVIEWER_PASSWORD", "Reviewer@12345")
        }
    ]

    created = 0
    for u in default_users:
        existing = db.query(User).filter(
            (User.email == u["email"]) | (User.username == u["username"])
        ).first()
        if not existing:
            new_user = User(
                username=u["username"],
                email=u["email"],
                full_name=u["full_name"],
                password_hash=get_password_hash(u["password"]),
                role=u["role"],
                is_active=True,
                created_at=utc_now(),
                updated_at=utc_now()
            )
            db.add(new_user)
            created += 1
    
    if created > 0:
        db.commit()
        print(f"  [+] Seeded {created} user accounts.")
    else:
        print("  [*] Core user accounts already exist.")

def seed_admin_only(db: Session):
    """Seed only the initial primary administrator account for clean production workspaces."""
    admin_email = os.getenv("INITIAL_ADMIN_EMAIL", "admin@smartqms.io")
    admin_user = os.getenv("INITIAL_ADMIN_USERNAME", "admin")
    admin_pass = os.getenv("INITIAL_ADMIN_PASSWORD", "Admin@12345")
    
    existing = db.query(User).filter(
        (User.email == admin_email) | (User.username == admin_user)
    ).first()
    if not existing:
        new_admin = User(
            username=admin_user,
            email=admin_email,
            full_name=os.getenv("INITIAL_ADMIN_NAME", "System Administrator"),
            password_hash=get_password_hash(admin_pass),
            role="Administrator",
            is_active=True,
            created_at=utc_now(),
            updated_at=utc_now()
        )
        db.add(new_admin)
        db.commit()
        print(f"  [+] Clean Administrator created: {admin_user} ({admin_email})")
    else:
        print(f"  [*] Administrator account already exists: {existing.username}")

def seed_phase3_ecommerce_data(db: Session):
    """Seed comprehensive e-commerce demonstration data for Phase 3."""
    admin_user = db.query(User).filter(User.username == "admin").first()
    qm_user = db.query(User).filter(User.username == "qamanager").first() or admin_user
    dev_user = db.query(User).filter(User.username == "developer").first() or admin_user
    reviewer_user = db.query(User).filter(User.username == "reviewer").first() or admin_user
    
    owner_id = admin_user.id if admin_user else 1
    qm_id = qm_user.id if qm_user else 1
    dev_id = dev_user.id if dev_user else 1
    reviewer_id = reviewer_user.id if reviewer_user else 1

    # 1. Project
    sample_project = db.query(Project).filter(Project.project_code == "ECOMM-CORE").first()
    if not sample_project:
        sample_project = Project(
            project_code="ECOMM-CORE",
            name="E-Commerce Core Platform",
            description="Mission-critical e-commerce platform handling catalog, shopping cart, checkout, payment webhooks, and inventory management.",
            status="active",
            project_owner_id=owner_id,
            created_at=utc_now(),
            updated_at=utc_now()
        )
        db.add(sample_project)
        db.commit()
        db.refresh(sample_project)
        print(f"  [+] Seeded project: {sample_project.project_code}")
    else:
        print(f"  [*] Project {sample_project.project_code} already exists.")

    # 2. Quality Objectives
    objectives_data = [
        {
            "title": "Prevent Duplicate Payment Processing",
            "description": "Guarantee 100% idempotent webhook ingestion and zero duplicate charge transactions under concurrent customer retries.",
            "quality_factor": "reliability",
            "target_value": 0.0,
            "measurement_unit": "incidents",
            "priority": "critical",
            "status": "achieved",
            "due_date": utc_now() + timedelta(days=60)
        },
        {
            "title": "Ensure Product Prices Match Approved Specifications",
            "description": "Enforce server-side re-computation of product line-item amounts and promotion rules to eliminate client cart tampering.",
            "quality_factor": "correctness",
            "target_value": 100.0,
            "measurement_unit": "%",
            "priority": "high",
            "status": "in_progress",
            "due_date": utc_now() + timedelta(days=45)
        },
        {
            "title": "Protect Cardholder & Customer Transaction Data",
            "description": "Enforce strict PCI-DSS and privacy controls with zero storage of raw credit card numbers or CVVs in system databases.",
            "quality_factor": "security",
            "target_value": 100.0,
            "measurement_unit": "%",
            "priority": "critical",
            "status": "achieved",
            "due_date": utc_now() + timedelta(days=30)
        },
        {
            "title": "Complete Mandatory Peer Code Reviews Before Release",
            "description": "Require two-person peer sign-off with strict segregation of duties; developers may not approve their own PRs.",
            "quality_factor": "maintainability",
            "target_value": 100.0,
            "measurement_unit": "%",
            "priority": "high",
            "status": "achieved",
            "due_date": utc_now() + timedelta(days=30)
        },
        {
            "title": "Detect All Critical Defects Prior to Release",
            "description": "Block deployment of releases containing unresolved critical defects or failing test suites.",
            "quality_factor": "testability",
            "target_value": 0.0,
            "measurement_unit": "defects",
            "priority": "critical",
            "status": "in_progress",
            "due_date": utc_now() + timedelta(days=90)
        },
        {
            "title": "Maintain Accurate Real-Time Inventory Records",
            "description": "Eliminate inventory overselling during high-concurrency flash sales using row-level locking.",
            "quality_factor": "data_integrity",
            "target_value": 99.9,
            "measurement_unit": "%",
            "priority": "high",
            "status": "in_progress",
            "due_date": utc_now() + timedelta(days=75)
        }
    ]

    obj_map = {}
    for obj_data in objectives_data:
        existing_obj = db.query(QualityObjective).filter(
            QualityObjective.project_id == sample_project.id,
            QualityObjective.title == obj_data["title"]
        ).first()
        if not existing_obj:
            existing_obj = QualityObjective(
                project_id=sample_project.id,
                title=obj_data["title"],
                description=obj_data["description"],
                quality_factor=obj_data["quality_factor"],
                target_value=obj_data["target_value"],
                measurement_unit=obj_data["measurement_unit"],
                priority=obj_data["priority"],
                owner_id=qm_id,
                status=obj_data["status"],
                due_date=obj_data["due_date"]
            )
            db.add(existing_obj)
            db.flush()
        obj_map[obj_data["quality_factor"]] = existing_obj
    db.commit()

    # 3. Quality Risks & Mitigations
    risks_data = [
        {
            "risk_item": "Concurrent Payment Webhook Ingestion Race Condition",
            "category": "payment",
            "probability": "high",
            "impact": "high",
            "risk_score": 20,
            "mitigation_strategy": "Implement Redis distributed lock with unique idempotency token and 30-second TTL.",
            "status": "mitigated"
        },
        {
            "risk_item": "Client-Side Cart Price Tampering",
            "category": "data_integrity",
            "probability": "medium",
            "impact": "high",
            "risk_score": 15,
            "mitigation_strategy": "Mandatory server-side pricing engine re-evaluates all discount coupons and catalog prices on checkout.",
            "status": "mitigated"
        },
        {
            "risk_item": "Flash Sale Inventory Overselling",
            "category": "performance",
            "probability": "high",
            "impact": "medium",
            "risk_score": 12,
            "mitigation_strategy": "Use atomic database row locking (SELECT ... FOR UPDATE) inside order reservation transaction.",
            "status": "mitigating"
        }
    ]
    for r in risks_data:
        existing_r = db.query(RiskAssessment).filter(
            RiskAssessment.project_id == sample_project.id,
            RiskAssessment.risk_item == r["risk_item"]
        ).first()
        if not existing_r:
            new_r = RiskAssessment(
                project_id=sample_project.id,
                risk_item=r["risk_item"],
                category=r["category"],
                probability=r["probability"],
                impact=r["impact"],
                risk_score=r["risk_score"],
                mitigation_strategy=r["mitigation_strategy"],
                status=r["status"]
            )
            db.add(new_r)
    db.commit()

    # 4. Requirements
    # A. Approved requirement with version history (REQ-01-001)
    req1 = db.query(Requirement).filter(Requirement.requirement_code == "REQ-01-001").first()
    if not req1:
        req1 = Requirement(
            requirement_code="REQ-01-001",
            project_id=sample_project.id,
            title="Payment Idempotency & Duplicate Webhook Prevention",
            description="The checkout webhook processor must accept unique X-Idempotency-Key headers and reject duplicate payment triggers within a 24-hour transaction window.",
            acceptance_criteria="1. Webhook endpoint must accept unique X-Idempotency-Key.\n2. Concurrent requests with same key must acquire atomic distributed lock.\n3. Duplicate callbacks return HTTP 200 with cached response.\n4. Zero double debit under 50 concurrent threads.",
            category="payment",
            priority="critical",
            risk_level="high",
            quality_factor="reliability",
            quality_objective_id=obj_map.get("reliability", None).id if obj_map.get("reliability") else None,
            is_mandatory=True,
            current_version=2,
            created_by=dev_id,
            assigned_to=reviewer_id,
            approval_status="approved",
            review_status="passed",
            review_comments="Formally verified and approved by Quality Director. Full idempotency contract meets ISO 25010 reliability standards.",
            created_at=utc_now() - timedelta(days=14),
            updated_at=utc_now() - timedelta(days=7)
        )
        db.add(req1)
        db.flush()

        # Seed versions 1 and 2
        v1 = RequirementVersion(
            requirement_id=req1.id,
            version_number=1,
            title=req1.title,
            description="Initial payment webhook idempotency draft.",
            acceptance_criteria="Initial webhook criteria without explicit concurrent thread thresholds.",
            author_id=dev_id,
            change_description="Initial specification baseline",
            created_at=utc_now() - timedelta(days=14)
        )
        v2 = RequirementVersion(
            requirement_id=req1.id,
            version_number=2,
            title=req1.title,
            description=req1.description,
            acceptance_criteria=req1.acceptance_criteria,
            author_id=qm_id,
            change_description="Added mandatory 50-thread concurrent stress testing criteria to acceptance rules.",
            created_at=utc_now() - timedelta(days=7)
        )
        db.add_all([v1, v2])

    # B. Approved requirement (REQ-01-002)
    req2 = db.query(Requirement).filter(Requirement.requirement_code == "REQ-01-002").first()
    if not req2:
        req2 = Requirement(
            requirement_code="REQ-01-002",
            project_id=sample_project.id,
            title="Shopping Cart Server-Side Price & Coupon Validation",
            description="All cart subtotal calculations, shipping rates, and coupon discount percentages must be verified strictly on server-side pricing services prior to creating payment intents.",
            acceptance_criteria="1. Any client-sent price parameters must be discarded.\n2. Coupon codes must validate expiration date and usage limits.\n3. Discrepancy > $0.00 halts checkout immediately.",
            category="checkout",
            priority="high",
            risk_level="medium",
            quality_factor="correctness",
            quality_objective_id=obj_map.get("correctness", None).id if obj_map.get("correctness") else None,
            is_mandatory=True,
            current_version=1,
            created_by=dev_id,
            assigned_to=qm_id,
            approval_status="approved",
            review_status="passed",
            review_comments="Approved: Server-side pricing enforcement verified.",
            created_at=utc_now() - timedelta(days=10),
            updated_at=utc_now() - timedelta(days=8)
        )
        db.add(req2)
        db.flush()
        db.add(RequirementVersion(
            requirement_id=req2.id,
            version_number=1,
            title=req2.title,
            description=req2.description,
            acceptance_criteria=req2.acceptance_criteria,
            author_id=dev_id,
            change_description="Initial baseline specification",
            created_at=utc_now() - timedelta(days=10)
        ))

    # C. Requirement Awaiting Review (REQ-01-003)
    req3 = db.query(Requirement).filter(Requirement.requirement_code == "REQ-01-003").first()
    if not req3:
        req3 = Requirement(
            requirement_code="REQ-01-003",
            project_id=sample_project.id,
            title="Flash Sale Atomic Inventory Decrement & Row-Level Lock",
            description="During high-concurrency product promotions, the stock decrement query must lock the product inventory row using SELECT FOR UPDATE to prevent overselling.",
            acceptance_criteria="1. Inventory decrement must run in atomic transaction.\n2. Stock < ordered quantity raises OutOfStockException.\n3. Max hold timeout of 5 minutes.",
            category="inventory",
            priority="high",
            risk_level="high",
            quality_factor="data_integrity",
            quality_objective_id=obj_map.get("data_integrity", None).id if obj_map.get("data_integrity") else None,
            is_mandatory=True,
            current_version=1,
            created_by=dev_id,
            assigned_to=reviewer_id,
            approval_status="submitted",
            review_status="in_review",
            review_comments="Awaiting formal architecture and database review.",
            created_at=utc_now() - timedelta(days=3),
            updated_at=utc_now() - timedelta(days=1)
        )
        db.add(req3)
        db.flush()
        db.add(RequirementVersion(
            requirement_id=req3.id,
            version_number=1,
            title=req3.title,
            description=req3.description,
            acceptance_criteria=req3.acceptance_criteria,
            author_id=dev_id,
            change_description="Initial draft submitted for review",
            created_at=utc_now() - timedelta(days=3)
        ))

    # D. Rejected Requirement with reviewer comments (REQ-01-004)
    req4 = db.query(Requirement).filter(Requirement.requirement_code == "REQ-01-004").first()
    if not req4:
        req4 = Requirement(
            requirement_code="REQ-01-004",
            project_id=sample_project.id,
            title="Client-Side Credit Card Number & CVV Storage for Express Checkout",
            description="Store customer primary account numbers (PAN) and CVV codes locally in browser LocalStorage to skip card entry on repeat checkout.",
            acceptance_criteria="1. Save encrypted PAN in local storage.\n2. Auto-fill CVV on checkout page.",
            category="security",
            priority="critical",
            risk_level="high",
            quality_factor="security",
            quality_objective_id=obj_map.get("security", None).id if obj_map.get("security") else None,
            is_mandatory=True,
            current_version=1,
            created_by=dev_id,
            assigned_to=reviewer_id,
            approval_status="rejected",
            review_status="failed",
            review_comments="REJECTED by Security Architecture: Storing raw primary account numbers or CVVs on client device directly violates PCI-DSS Requirement 3.2. Must use tokenized vault tokens from payment processor.",
            created_at=utc_now() - timedelta(days=5),
            updated_at=utc_now() - timedelta(days=4)
        )
        db.add(req4)
        db.flush()
        db.add(RequirementVersion(
            requirement_id=req4.id,
            version_number=1,
            title=req4.title,
            description=req4.description,
            acceptance_criteria=req4.acceptance_criteria,
            author_id=dev_id,
            change_description="Draft submitted",
            created_at=utc_now() - timedelta(days=5)
        ))
    db.commit()

    # 5. Design Reviews
    # A. Completed & Approved Design Review (DR-01-001)
    dr1 = db.query(Review).filter(Review.review_code == "DR-01-001").first()
    if not dr1:
        dr1 = Review(
            review_code="DR-01-001",
            project_id=sample_project.id,
            review_type="design",
            title="Architecture Review: Payment Webhook Ingestion & Distributed Lock",
            target_ref=req1.requirement_code if req1 else "REQ-01-001",
            requirement_id=req1.id if req1 else 1,
            reviewer_id=reviewer_id,
            status="passed",
            outcome="approved",
            comments="Architecture baselined. Mutex lock pattern and database schema satisfy reliability standards.",
            is_baselined=True,
            created_at=utc_now() - timedelta(days=12),
            completion_time=utc_now() - timedelta(days=10)
        )
        db.add(dr1)
        db.flush()
        for cat, name, desc, mand in DEFAULT_DESIGN_CHECKLIST:
            db.add(ReviewChecklistItem(
                review_id=dr1.id,
                category=cat,
                checklist_description=f"{name}: {desc}",
                is_mandatory=mand,
                review_result="pass",
                comments="Verified in architectural diagram and sequence flow.",
                reviewer_id=reviewer_id
            ))

    # B. Design Review with Incomplete Checklist (DR-01-002)
    dr2 = db.query(Review).filter(Review.review_code == "DR-01-002").first()
    if not dr2:
        dr2 = Review(
            review_code="DR-01-002",
            project_id=sample_project.id,
            review_type="design",
            title="Architecture Review: Flash Sale Distributed Locking & Cache",
            target_ref=req3.requirement_code if req3 else "REQ-01-003",
            requirement_id=req3.id if req3 else 3,
            reviewer_id=reviewer_id,
            status="in_progress",
            outcome=None,
            comments="Review in progress. Concurrency stress analysis outstanding.",
            is_baselined=False,
            created_at=utc_now() - timedelta(days=2)
        )
        db.add(dr2)
        db.flush()
        for i, (cat, name, desc, mand) in enumerate(DEFAULT_DESIGN_CHECKLIST):
            res = "pass" if i < 4 else ("fail" if i == 5 else "pending")
            comm = "Passed initial inspection" if res == "pass" else ("Missing circuit breaker specification" if res == "fail" else None)
            db.add(ReviewChecklistItem(
                review_id=dr2.id,
                category=cat,
                checklist_description=f"{name}: {desc}",
                is_mandatory=mand,
                review_result=res,
                comments=comm,
                reviewer_id=reviewer_id if res != "pending" else None
            ))
    db.commit()

    # 6. Development Tasks
    # A. Completed task (TASK-01-001)
    task1 = db.query(DevTask).filter(DevTask.task_code == "TASK-01-001").first()
    if not task1:
        task1 = DevTask(
            task_code="TASK-01-001",
            project_id=sample_project.id,
            requirement_id=req1.id if req1 else 1,
            title="Implement Distributed Mutex Lock for Payment Webhook Ingestion",
            description="Develop Redis distributed locking middleware using Redlock algorithm to ensure single-execution semantics for payment webhook payloads.",
            developer_id=dev_id,
            priority="critical",
            due_date=utc_now() - timedelta(days=5),
            code_reference="https://github.com/smartqms/ecomm-core/pull/102",
            status="completed",
            review_status="passed",
            created_at=utc_now() - timedelta(days=10)
        )
        db.add(task1)
        db.flush()

    # B. Task in code review (TASK-01-002)
    task2 = db.query(DevTask).filter(DevTask.task_code == "TASK-01-002").first()
    if not task2:
        task2 = DevTask(
            task_code="TASK-01-002",
            project_id=sample_project.id,
            requirement_id=req2.id if req2 else 2,
            title="Implement Server-Side Price Verification & Coupon Engine",
            description="Build pricing validation interceptor that validates catalog prices directly from PostgreSQL before token charge creation.",
            developer_id=dev_id,
            priority="high",
            due_date=utc_now() + timedelta(days=3),
            code_reference="https://github.com/smartqms/ecomm-core/pull/105",
            status="code_review",
            review_status="needed",
            created_at=utc_now() - timedelta(days=4)
        )
        db.add(task2)
        db.flush()
    db.commit()

    # 7. Code Reviews
    # A. Completed Code Review (CR-01-001)
    cr1 = db.query(Review).filter(Review.review_code == "CR-01-001").first()
    if not cr1:
        cr1 = Review(
            review_code="CR-01-001",
            project_id=sample_project.id,
            review_type="code",
            title="Code Review for PR #102: Redis Mutex Lock on Webhook Ingestion",
            target_ref="PR #102",
            requirement_id=req1.id if req1 else 1,
            task_id=task1.id if task1 else 1,
            reviewer_id=reviewer_id,
            status="passed",
            outcome="approved",
            comments="PR approved. Distributed mutex release in finally block ensures lock recovery even during abnormal crashes.",
            is_baselined=False,
            created_at=utc_now() - timedelta(days=8),
            completion_time=utc_now() - timedelta(days=6)
        )
        db.add(cr1)
        db.flush()
        if task1:
            task1.review_id = cr1.id
        for cat, name, desc, mand in DEFAULT_CODE_CHECKLIST:
            db.add(ReviewChecklistItem(
                review_id=cr1.id,
                category=cat,
                checklist_description=f"{name}: {desc}",
                is_mandatory=mand,
                review_result="pass",
                comments="Verified in PR diff",
                reviewer_id=reviewer_id
            ))

    # B. In-Progress Code Review (CR-01-002)
    cr2 = db.query(Review).filter(Review.review_code == "CR-01-002").first()
    if not cr2:
        cr2 = Review(
            review_code="CR-01-002",
            project_id=sample_project.id,
            review_type="code",
            title="Code Review for PR #105: Cart Coupon Recalculation Engine",
            target_ref="PR #105",
            requirement_id=req2.id if req2 else 2,
            task_id=task2.id if task2 else 2,
            reviewer_id=reviewer_id,
            status="in_progress",
            outcome=None,
            comments="Under active review by Marcus Vance.",
            is_baselined=False,
            created_at=utc_now() - timedelta(days=2)
        )
        db.add(cr2)
        db.flush()
        if task2:
            task2.review_id = cr2.id
        for i, (cat, name, desc, mand) in enumerate(DEFAULT_CODE_CHECKLIST):
            res = "pass" if i < 5 else "pending"
            db.add(ReviewChecklistItem(
                review_id=cr2.id,
                category=cat,
                checklist_description=f"{name}: {desc}",
                is_mandatory=mand,
                review_result=res,
                comments="Validated against test suite" if res == "pass" else None,
                reviewer_id=reviewer_id if res == "pass" else None
            ))
    db.commit()
    print("  [+] Seeded Phase 3 e-commerce demonstration data (objectives, requirements, reviews, tasks, matrix).")

def init_db(drop_all: bool = False, session: Session = None, clean_mode: bool = False):
    """Initializes the database schema and seeds initial data."""
    if drop_all:
        print("[!] Resetting database schema (dropping all tables)...")
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("PRAGMA foreign_keys = OFF;"))
            conn.commit()
            for table_name in [
                "release_gate_results", "releases", "capa",
                "defect_history", "defects", "test_executions", "test_cases",
                "review_checklist_items", "dev_tasks", "reviews",
                "requirement_versions", "requirements",
                "risk_assessments", "quality_metrics", "quality_objectives",
                "quality_assurance_plans", "project_milestones",
                "audit_logs", "projects", "users"
            ]:
                conn.execute(text(f"DROP TABLE IF EXISTS {table_name};"))
            conn.commit()
            conn.execute(text("PRAGMA foreign_keys = ON;"))
            conn.commit()

    print("[*] Creating database tables if not existing...")
    Base.metadata.create_all(bind=engine)

    db = session or SessionLocal()
    try:
        is_clean = clean_mode or os.getenv("WORKSPACE_MODE", "").lower() == "clean"
        if is_clean:
            print("[*] Clean workspace initialization: creating administrator account only...")
            seed_admin_only(db)
        else:
            print("[*] Standard workspace initialization: checking baseline governance records...")
            seed_users(db)
            seed_phase3_ecommerce_data(db)
        print("[+] Database initialization complete.")
    finally:
        if not session:
            db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SmartQMS Database Initializer and Seeder")
    parser.add_argument("--reset", action="store_true", help="Drop all tables and recreate schema (DEV ONLY)")
    parser.add_argument("--clean", action="store_true", help="Initialize empty production database with administrator only")
    args = parser.parse_args()

    init_db(drop_all=args.reset, clean_mode=args.clean)
