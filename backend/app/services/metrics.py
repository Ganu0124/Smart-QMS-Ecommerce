import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.project import Project
from app.models.requirement import Requirement
from app.models.review import Review
from app.models.test_case import TestCase
from app.models.defect import Defect
from app.models.release import Release
from app.models.capa import CAPA
from app.schemas.all_schemas import DashboardSummary, QualityMetricsDetails

def calculate_dashboard_summary(db: Session, project_id: int = None) -> DashboardSummary:
    proj_query = db.query(Project)
    req_query = db.query(Requirement)
    rev_query = db.query(Review)
    test_query = db.query(TestCase)
    def_query = db.query(Defect)
    rel_query = db.query(Release)
    capa_query = db.query(CAPA)

    if project_id:
        req_query = req_query.filter(Requirement.project_id == project_id)
        rev_query = rev_query.filter(Review.project_id == project_id)
        test_query = test_query.filter(TestCase.project_id == project_id)
        def_query = def_query.filter(Defect.project_id == project_id)
        rel_query = rel_query.filter(Release.project_id == project_id)
        capa_query = capa_query.filter(CAPA.project_id == project_id)

    total_projects = proj_query.count()
    all_reqs = req_query.all()
    total_requirements = len(all_reqs)
    awaiting_approval = len([r for r in all_reqs if r.status in ["draft", "submitted"]])

    code_reviews = rev_query.filter(Review.review_type == "code").all()
    completed_reviews = len([r for r in code_reviews if r.status == "passed"])
    code_review_pct = (completed_reviews / len(code_reviews) * 100.0) if len(code_reviews) > 0 else 0.0

    executed_tests = [t for t in test_query.all() if t.status in ["pass", "fail", "blocked"]]
    passed_tests = len([t for t in executed_tests if t.status == "pass"])
    test_pass_pct = (passed_tests / len(executed_tests) * 100.0) if len(executed_tests) > 0 else 0.0

    open_defects = def_query.filter(Defect.status != "closed").all()
    open_by_severity = {
        "critical": len([d for d in open_defects if d.severity == "critical"]),
        "high": len([d for d in open_defects if d.severity == "high"]),
        "medium": len([d for d in open_defects if d.severity == "medium"]),
        "low": len([d for d in open_defects if d.severity == "low"]),
    }

    releases = rel_query.all()
    blocked_releases = len([r for r in releases if r.release_decision == "BLOCKED"])
    
    # Latest release status
    latest_release = rel_query.order_by(Release.created_at.desc()).first()
    release_status = latest_release.release_decision if latest_release else "NO_RELEASE"

    open_capas = capa_query.filter(CAPA.status != "closed").count()

    return DashboardSummary(
        total_projects=total_projects,
        total_requirements=total_requirements,
        requirements_awaiting_approval=awaiting_approval,
        code_review_completion_percentage=round(code_review_pct, 1),
        test_pass_percentage=round(test_pass_pct, 1),
        open_defects_by_severity=open_by_severity,
        failed_quality_gates=blocked_releases,
        release_readiness_status=release_status,
        corrective_actions_awaiting_closure=open_capas
    )

def calculate_quality_metrics(db: Session, project_id: int = None) -> QualityMetricsDetails:
    req_query = db.query(Requirement)
    rev_query = db.query(Review)
    test_query = db.query(TestCase)
    def_query = db.query(Defect)
    rel_query = db.query(Release)
    capa_query = db.query(CAPA)

    if project_id:
        req_query = req_query.filter(Requirement.project_id == project_id)
        rev_query = rev_query.filter(Review.project_id == project_id)
        test_query = test_query.filter(TestCase.project_id == project_id)
        def_query = def_query.filter(Defect.project_id == project_id)
        rel_query = rel_query.filter(Release.project_id == project_id)
        capa_query = capa_query.filter(CAPA.project_id == project_id)

    # 1. Requirements approval rate
    all_reqs = req_query.all()
    approved_reqs = [r for r in all_reqs if r.status == "approved"]
    req_appr_rate = (len(approved_reqs) / len(all_reqs) * 100.0) if len(all_reqs) > 0 else 0.0

    # 2. Code review completion rate
    code_reviews = rev_query.filter(Review.review_type == "code").all()
    completed_reviews = [r for r in code_reviews if r.status == "passed"]
    code_rev_rate = (len(completed_reviews) / len(code_reviews) * 100.0) if len(code_reviews) > 0 else 0.0

    # 3. Test pass rate
    executed_tests = [t for t in test_query.all() if t.status in ["pass", "fail", "blocked"]]
    passed_tests = [t for t in executed_tests if t.status == "pass"]
    test_pass_rate = (len(passed_tests) / len(executed_tests) * 100.0) if len(executed_tests) > 0 else 0.0

    # 4. Defect density (defects per requirement)
    all_defects = def_query.all()
    defect_density = (len(all_defects) / len(all_reqs)) if len(all_reqs) > 0 else 0.0

    # 5. Defect leakage (production defects / total defects * 100)
    prod_defects = [d for d in all_defects if d.is_production_leakage == 1]
    leakage_rate = (len(prod_defects) / len(all_defects) * 100.0) if len(all_defects) > 0 else 0.0

    # 6. Mean Time To Resolve (MTTR) in hours
    closed_defects = [d for d in all_defects if d.status == "closed" and d.closed_at and d.created_at]
    if len(closed_defects) > 0:
        total_hours = sum((d.closed_at - d.created_at).total_seconds() / 3600.0 for d in closed_defects)
        mttr_hours = total_hours / len(closed_defects)
    else:
        mttr_hours = 0.0

    # 7. CAPA closure rate
    all_capas = capa_query.all()
    closed_capas = [c for c in all_capas if c.status == "closed"]
    capa_closure_rate = (len(closed_capas) / len(all_capas) * 100.0) if len(all_capas) > 0 else 0.0

    # 8. Open critical and high defects
    open_critical_high = len([d for d in all_defects if d.status != "closed" and d.severity in ["critical", "high"]])

    # 9. Release gate pass rate
    releases = rel_query.all()
    approved_releases = [r for r in releases if r.release_decision in ["APPROVED", "READY_FOR_APPROVAL"]]
    gate_pass_rate = (len(approved_releases) / len(releases) * 100.0) if len(releases) > 0 else 0.0

    # Breakdowns for charts
    severity_breakdown = {
        "Critical": len([d for d in all_defects if d.severity == "critical"]),
        "High": len([d for d in all_defects if d.severity == "high"]),
        "Medium": len([d for d in all_defects if d.severity == "medium"]),
        "Low": len([d for d in all_defects if d.severity == "low"]),
    }

    categories = ["functional", "payment_transaction", "security", "performance", "data_integrity", "usability", "requirements", "design", "testing", "documentation"]
    category_breakdown = {
        c.replace("_", " ").title(): len([d for d in all_defects if d.category == c])
        for c in categories
    }

    all_tc = test_query.all()
    test_status_breakdown = {
        "Passed": len([t for t in all_tc if t.status == "pass"]),
        "Failed": len([t for t in all_tc if t.status == "fail"]),
        "Blocked": len([t for t in all_tc if t.status == "blocked"]),
        "Not Run": len([t for t in all_tc if t.status == "not_run"]),
    }

    return QualityMetricsDetails(
        project_id=project_id,
        requirements_approval_rate=round(req_appr_rate, 1),
        code_review_completion_rate=round(code_rev_rate, 1),
        test_pass_rate=round(test_pass_rate, 1),
        defect_density=round(defect_density, 2),
        defect_leakage=round(leakage_rate, 1),
        mean_time_to_resolve_hours=round(mttr_hours, 1),
        capa_closure_rate=round(capa_closure_rate, 1),
        open_critical_high_defects=open_critical_high,
        release_gate_pass_rate=round(gate_pass_rate, 1),
        severity_breakdown=severity_breakdown,
        category_breakdown=category_breakdown,
        test_status_breakdown=test_status_breakdown,
    )

def calculate_and_store_devp(db: Session, project_id: int, development_hours: float, software_size_kloc: float, user_id: int = None):
    """
    Metric A: Development Effort per KLOC (DevP)
    Formula: DevP = Development Hours / KLOC
    """
    if software_size_kloc is None or software_size_kloc <= 0:
        raise ValueError("Software size (KLOC) must be strictly greater than 0 (division by zero / non-positive size rejected).")
    if development_hours is None or development_hours < 0:
        raise ValueError("Development hours cannot be negative.")

    import json
    from app.models.quality_plan import QualityMetric
    
    val = round(development_hours / software_size_kloc, 2)
    inputs_json = json.dumps({"development_hours": development_hours, "software_size_kloc": software_size_kloc})
    details = f"Development Hours ({development_hours:,.1f} hrs) / Software Size ({software_size_kloc:,.1f} KLOC) = {val} hours/KLOC"
    interpretation = "Lower effort per KLOC is generally desirable when comparing similar projects with comparable scope and quality. Do not use this measure alone to judge developer productivity."

    metric = QualityMetric(
        project_id=project_id,
        metric_key="DevP",
        metric_name="Development Effort per KLOC",
        formula="Development Hours / KLOC",
        raw_inputs=inputs_json,
        value=val,
        unit="hours/KLOC",
        interpretation=interpretation,
        calculation_details=details,
        recorded_by_id=user_id
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric

def calculate_and_store_cre(db: Session, project_id: int, reused_kloc: float, total_kloc: float, user_id: int = None):
    """
    Metric B: Code Reuse Ratio (CRe)
    Formula: CRe = (Reused KLOC / Total KLOC) * 100
    """
    if total_kloc is None or total_kloc <= 0:
        raise ValueError("Total code (KLOC) must be strictly greater than 0 (division by zero / invalid code size rejected).")
    if reused_kloc is None or reused_kloc < 0:
        raise ValueError("Reused code (KLOC) cannot be negative.")
    if reused_kloc > total_kloc:
        raise ValueError(f"Reused code ({reused_kloc} KLOC) cannot exceed total codebase size ({total_kloc} KLOC).")

    import json
    from app.models.quality_plan import QualityMetric
    
    val = round((reused_kloc / total_kloc) * 100.0, 2)
    inputs_json = json.dumps({"reused_kloc": reused_kloc, "total_kloc": total_kloc})
    details = f"({reused_kloc:,.1f} Reused KLOC / {total_kloc:,.1f} Total KLOC) × 100 = {val}%"
    interpretation = "A higher reuse ratio indicates greater reuse of existing code. Also track the suitability and quality of reused components."

    metric = QualityMetric(
        project_id=project_id,
        metric_key="CRe",
        metric_name="Code Reuse Ratio",
        formula="Reused KLOC / Total KLOC × 100",
        raw_inputs=inputs_json,
        value=val,
        unit="%",
        interpretation=interpretation,
        calculation_details=details,
        recorded_by_id=user_id
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric

def calculate_and_store_docre(db: Session, project_id: int, reused_documents: int, total_documents: int, user_id: int = None):
    """
    Metric C: Documentation Reuse Ratio (DocRe)
    Formula: DocRe = (Reused Documents / Total Documents) * 100
    """
    if total_documents is None or total_documents <= 0:
        raise ValueError("Total documents must be strictly greater than 0 (division by zero rejected).")
    if reused_documents is None or reused_documents < 0:
        raise ValueError("Reused documents count cannot be negative.")
    if reused_documents > total_documents:
        raise ValueError(f"Reused documents ({reused_documents}) cannot exceed total documents count ({total_documents}).")

    import json
    from app.models.quality_plan import QualityMetric
    
    val = round((reused_documents / total_documents) * 100.0, 2)
    inputs_json = json.dumps({"reused_documents": reused_documents, "total_documents": total_documents})
    details = f"({reused_documents} Reused Documents / {total_documents} Total Documents) × 100 = {val}%"
    interpretation = "A higher ratio indicates greater documentation reuse. Verify each reused document against current requirements."

    metric = QualityMetric(
        project_id=project_id,
        metric_key="DocRe",
        metric_name="Documentation Reuse Ratio",
        formula="Reused Documents / Total Documents × 100",
        raw_inputs=inputs_json,
        value=val,
        unit="%",
        interpretation=interpretation,
        calculation_details=details,
        recorded_by_id=user_id
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric

