import datetime
from sqlalchemy.orm import Session
from app.models.release import Release, ReleaseGateResult
from app.models.requirement import Requirement
from app.models.review import Review, ReviewChecklistItem
from app.models.task import DevTask
from app.models.test_case import TestCase
from app.models.defect import Defect
from app.models.capa import CAPA
from app.models.user import User

def evaluate_release_gate(db: Session, release: Release, evaluator: User) -> Release:
    """
    Core Smart Release Gate Engine:
    Evaluates 8 automated quality rules against live database records.
    Sets release_decision to BLOCKED or READY_FOR_APPROVAL.
    """
    project_id = release.project_id
    
    # Clear previous evaluation results for this release
    db.query(ReleaseGateResult).filter(ReleaseGateResult.release_id == release.id).delete()
    
    gate_results: list[ReleaseGateResult] = []
    
    # -------------------------------------------------------------
    # Rule 1: GATE-REQ - All Mandatory Requirements Have Approval
    # -------------------------------------------------------------
    mandatory_reqs = db.query(Requirement).filter(
        Requirement.project_id == project_id,
        Requirement.is_mandatory == True
    ).all()
    
    total_reqs = len(mandatory_reqs)
    unapproved_reqs = [r for r in mandatory_reqs if r.status != "approved"]
    
    if total_reqs == 0:
        req_status = "FAIL"
        req_exp = "No mandatory requirements defined for this project."
        req_rec = "Project Requirements"
        req_action = "Define and approve baseline functional requirements."
    elif len(unapproved_reqs) > 0:
        req_status = "FAIL"
        unapproved_codes = ", ".join([r.req_code for r in unapproved_reqs[:5]])
        req_exp = f"{len(unapproved_reqs)} of {total_reqs} mandatory requirements lack approved status ({unapproved_codes})."
        req_rec = unapproved_codes
        req_action = "Obtain formal sign-off and approval from Quality Manager/Reviewer for all pending requirements."
    else:
        req_status = "PASS"
        req_exp = f"All {total_reqs} mandatory requirements are formally approved."
        req_rec = f"{total_reqs} Approved Requirements"
        req_action = "None. Requirement gate criteria fulfilled."
        
    gate_results.append(ReleaseGateResult(
        release_id=release.id,
        check_code="GATE-REQ",
        check_name="Mandatory Requirements Approval",
        is_mandatory=True,
        status=req_status,
        explanation=req_exp,
        related_record=req_rec,
        required_corrective_action=req_action
    ))

    # -------------------------------------------------------------
    # Rule 2: GATE-DESIGN - Design Reviews Passed and Baselined
    # -------------------------------------------------------------
    all_design_reviews = db.query(Review).filter(
        Review.project_id == project_id,
        Review.review_type == "design"
    ).all()
    
    # Filter to in-scope design reviews for the release (exclude reviews for optional/future non-mandatory requirements)
    design_reviews = []
    for dr in all_design_reviews:
        if dr.requirement_id:
            req_linked = db.query(Requirement).filter(Requirement.id == dr.requirement_id).first()
            if req_linked and not req_linked.is_mandatory:
                continue
        design_reviews.append(dr)
    
    unpassed_design = [r for r in design_reviews if r.status != "passed" or not r.is_baselined]
    failed_items = []
    for dr in design_reviews:
        for item in dr.checklist_items:
            if item.is_mandatory and item.result != "pass":
                failed_items.append(f"{dr.review_code}:{item.item_name} ({item.result})")
                
    if len(design_reviews) == 0:
        des_status = "FAIL"
        des_exp = "No architectural/design reviews recorded for this project."
        des_rec = "Design Review"
        des_action = "Conduct architecture and transaction consistency review before releasing."
    elif len(failed_items) > 0:
        des_status = "FAIL"
        des_exp = f"Mandatory design checklist items unresolved: {', '.join(failed_items[:4])}."
        des_rec = failed_items[0]
        des_action = "Resolve all critical architectural questions and pass checklist verification."
    elif len(unpassed_design) > 0:
        des_status = "FAIL"
        des_exp = f"Design reviews not formally passed or baselined: {', '.join([d.review_code for d in unpassed_design])}."
        des_rec = unpassed_design[0].review_code
        des_action = "Approve and baseline all design specifications."
    else:
        des_status = "PASS"
        des_exp = f"All {len(design_reviews)} design review(s) passed and baselined."
        des_rec = "Architectural Baseline Approved"
        des_action = "None. Design gate criteria fulfilled."
        
    gate_results.append(ReleaseGateResult(
        release_id=release.id,
        check_code="GATE-DESIGN",
        check_name="Design Reviews & Architecture Baseline",
        is_mandatory=True,
        status=des_status,
        explanation=des_exp,
        related_record=des_rec,
        required_corrective_action=des_action
    ))

    # -------------------------------------------------------------
    # Rule 3: GATE-CODE - Required Code Reviews Complete
    # -------------------------------------------------------------
    code_reviews = db.query(Review).filter(
        Review.project_id == project_id,
        Review.review_type == "code"
    ).all()
    
    open_tasks = db.query(DevTask).filter(
        DevTask.project_id == project_id,
        DevTask.rework_status == "needed"
    ).all()
    
    unpassed_code = [cr for cr in code_reviews if cr.status != "passed"]
    
    if len(code_reviews) == 0:
        code_status = "FAIL"
        code_exp = "No peer code reviews documented for project development tasks."
        code_rec = "Code Reviews"
        code_action = "Submit code changes to peer review with security and quality checklists."
    elif len(unpassed_code) > 0:
        code_status = "FAIL"
        unpassed_refs = ", ".join([c.target_ref for c in unpassed_code[:4]])
        code_exp = f"{len(unpassed_code)} code review(s) not passed: {unpassed_refs}."
        code_rec = unpassed_code[0].review_code
        code_action = "Address reviewer feedback, resolve comments, and re-review pull requests."
    elif len(open_tasks) > 0:
        code_status = "FAIL"
        code_exp = f"{len(open_tasks)} task(s) marked as needing rework."
        code_rec = open_tasks[0].task_code
        code_action = "Complete required rework on development tasks."
    else:
        code_status = "PASS"
        code_exp = f"All {len(code_reviews)} code review(s) completed with documented approval."
        code_rec = f"{len(code_reviews)} Code Reviews Passed"
        code_action = "None. Code review gate criteria fulfilled."

    gate_results.append(ReleaseGateResult(
        release_id=release.id,
        check_code="GATE-CODE",
        check_name="Peer Code Review Completion",
        is_mandatory=True,
        status=code_status,
        explanation=code_exp,
        related_record=code_rec,
        required_corrective_action=code_action
    ))

    # -------------------------------------------------------------
    # Rule 4: GATE-TEST - Mandatory Test Cases Passed
    # -------------------------------------------------------------
    mandatory_tests = db.query(TestCase).filter(
        TestCase.project_id == project_id,
        TestCase.is_mandatory == True
    ).all()
    
    total_mandatory_tests = len(mandatory_tests)
    failed_tests = [t for t in mandatory_tests if t.status in ["fail", "blocked"]]
    not_run_tests = [t for t in mandatory_tests if t.status == "not_run"]
    
    if total_mandatory_tests == 0:
        test_status = "FAIL"
        test_exp = "No mandatory test cases registered for release verification."
        test_rec = "Test Suite"
        test_action = "Define mandatory e-commerce test suite."
    elif len(failed_tests) > 0:
        test_status = "FAIL"
        failed_codes = ", ".join([f"{t.tc_code} ({t.scenario_title})" for t in failed_tests[:3]])
        test_exp = f"{len(failed_tests)} mandatory test(s) failed or blocked: {failed_codes}."
        test_rec = failed_tests[0].tc_code
        test_action = "Debug failure, fix defect, and retest until all mandatory scenarios pass."
    elif len(not_run_tests) > 0:
        test_status = "FAIL"
        not_run_codes = ", ".join([t.tc_code for t in not_run_tests[:4]])
        test_exp = f"{len(not_run_tests)} mandatory test(s) not yet executed ({not_run_codes})."
        test_rec = not_run_tests[0].tc_code
        test_action = "Execute all unrun test cases and document actual results."
    else:
        test_status = "PASS"
        test_exp = f"All {total_mandatory_tests} mandatory test cases executed and passed."
        test_rec = f"{total_mandatory_tests} Passed Tests"
        test_action = "None. Test execution gate criteria fulfilled."

    gate_results.append(ReleaseGateResult(
        release_id=release.id,
        check_code="GATE-TEST",
        check_name="Mandatory Test Verification",
        is_mandatory=True,
        status=test_status,
        explanation=test_exp,
        related_record=test_rec,
        required_corrective_action=test_action
    ))

    # -------------------------------------------------------------
    # Rule 5: GATE-DEFECT - Zero Open Critical or High Defects
    # -------------------------------------------------------------
    open_critical_high = db.query(Defect).filter(
        Defect.project_id == project_id,
        Defect.severity.in_(["critical", "high"]),
        Defect.status != "closed"
    ).all()
    
    if len(open_critical_high) > 0:
        def_status = "FAIL"
        def_list = ", ".join([f"{d.defect_code}: {d.title} [{d.severity}]" for d in open_critical_high[:3]])
        def_exp = f"Found {len(open_critical_high)} open Critical/High defect(s): {def_list}."
        def_rec = open_critical_high[0].defect_code
        def_action = "Implement fix, perform successful retesting, and close all Critical and High defects."
    else:
        def_status = "PASS"
        def_exp = "Zero unresolved Critical or High severity defects detected."
        def_rec = "Defect Register Clean"
        def_action = "None. Defect gate criteria fulfilled."

    gate_results.append(ReleaseGateResult(
        release_id=release.id,
        check_code="GATE-DEFECT",
        check_name="Critical & High Defect Absence",
        is_mandatory=True,
        status=def_status,
        explanation=def_exp,
        related_record=def_rec,
        required_corrective_action=def_action
    ))

    # -------------------------------------------------------------
    # Rule 6: GATE-SEC - Security Verification Requirements
    # -------------------------------------------------------------
    open_sec_defects = db.query(Defect).filter(
        Defect.project_id == project_id,
        Defect.category == "security",
        Defect.status != "closed"
    ).all()
    
    sec_tests = db.query(TestCase).filter(
        TestCase.project_id == project_id,
        TestCase.scenario_category == "security"
    ).all()
    failed_sec_tests = [t for t in sec_tests if t.status != "pass"]
    
    if len(open_sec_defects) > 0:
        sec_status = "FAIL"
        sec_exp = f"Open security defect(s) present: {', '.join([d.defect_code for d in open_sec_defects])}."
        sec_rec = open_sec_defects[0].defect_code
        sec_action = "Remediate security vulnerability and obtain Quality Manager sign-off."
    elif len(failed_sec_tests) > 0:
        sec_status = "FAIL"
        sec_exp = f"Security test case(s) not passed: {', '.join([t.tc_code for t in failed_sec_tests])}."
        sec_rec = failed_sec_tests[0].tc_code
        sec_action = "Fix auth/authorization controls and verify security test scenarios."
    else:
        sec_status = "PASS"
        sec_exp = "No open security defects; all security verification checks passed."
        sec_rec = "Security Compliance Verified"
        sec_action = "None. Security gate criteria fulfilled."

    gate_results.append(ReleaseGateResult(
        release_id=release.id,
        check_code="GATE-SEC",
        check_name="Security Verification & Compliance",
        is_mandatory=True,
        status=sec_status,
        explanation=sec_exp,
        related_record=sec_rec,
        required_corrective_action=sec_action
    ))

    # -------------------------------------------------------------
    # Rule 7: GATE-METRICS - Quality Metrics Meet Thresholds
    # -------------------------------------------------------------
    # Thresholds: test pass rate >= 90%, requirements approval rate >= 80%
    all_tests = db.query(TestCase).filter(TestCase.project_id == project_id).all()
    passed_tests = [t for t in all_tests if t.status == "pass"]
    test_pass_rate = (len(passed_tests) / len(all_tests) * 100.0) if len(all_tests) > 0 else 0.0
    
    all_reqs = db.query(Requirement).filter(
        Requirement.project_id == project_id,
        Requirement.is_mandatory == True
    ).all()
    appr_reqs = [r for r in all_reqs if r.status == "approved"]
    req_appr_rate = (len(appr_reqs) / len(all_reqs) * 100.0) if len(all_reqs) > 0 else 0.0
    
    metric_failures = []
    if test_pass_rate < 90.0:
        metric_failures.append(f"Test Pass Rate {test_pass_rate:.1f}% < 90.0% threshold")
    if req_appr_rate < 80.0:
        metric_failures.append(f"Requirement Approval Rate {req_appr_rate:.1f}% < 80.0% threshold")
        
    if len(metric_failures) > 0:
        met_status = "FAIL"
        met_exp = f"Quality metrics breach release thresholds: {'; '.join(metric_failures)}."
        met_rec = f"TPR: {test_pass_rate:.1f}%, RAR: {req_appr_rate:.1f}%"
        met_action = "Execute tests to achieve >=90% pass rate and complete requirement reviews."
    else:
        met_status = "PASS"
        met_exp = f"Quality metrics satisfy all targets: Test Pass Rate: {test_pass_rate:.1f}%, Req Approval: {req_appr_rate:.1f}%."
        met_rec = f"TPR: {test_pass_rate:.1f}%, RAR: {req_appr_rate:.1f}%"
        met_action = "None. Organizational quality benchmarks met."

    gate_results.append(ReleaseGateResult(
        release_id=release.id,
        check_code="GATE-METRICS",
        check_name="Organizational Quality Thresholds",
        is_mandatory=True,
        status=met_status,
        explanation=met_exp,
        related_record=met_rec,
        required_corrective_action=met_action
    ))

    # -------------------------------------------------------------
    # Rule 8: GATE-EVIDENCE - Test & Defect Verification Evidence
    # -------------------------------------------------------------
    missing_evidence_tests = [
        t for t in passed_tests 
        if not (t.evidence_notes or t.evidence_url)
    ]
    closed_defects = db.query(Defect).filter(
        Defect.project_id == project_id,
        Defect.status == "closed"
    ).all()
    missing_evidence_defects = [
        d for d in closed_defects
        if not (d.root_cause and d.resolution_notes)
    ]
    
    if len(missing_evidence_tests) > 0:
        evi_status = "FAIL"
        evi_exp = f"{len(missing_evidence_tests)} passed test(s) lack execution evidence or verification logs."
        evi_rec = missing_evidence_tests[0].tc_code
        evi_action = "Attach logs, trace IDs, or screenshots demonstrating successful test outcome."
    elif len(missing_evidence_defects) > 0:
        evi_status = "FAIL"
        evi_exp = f"{len(missing_evidence_defects)} closed defect(s) missing root cause or resolution audit notes."
        evi_rec = missing_evidence_defects[0].defect_code
        evi_action = "Document root cause analysis and resolution details prior to closing defect."
    else:
        evi_status = "PASS"
        evi_exp = "All passed test cases and closed defects contain verifiable evidence and audit documentation."
        evi_rec = "Complete Audit Evidence"
        evi_action = "None. Traceability and audit readiness confirmed."

    gate_results.append(ReleaseGateResult(
        release_id=release.id,
        check_code="GATE-EVIDENCE",
        check_name="Traceability & Verification Evidence",
        is_mandatory=True,
        status=evi_status,
        explanation=evi_exp,
        related_record=evi_rec,
        required_corrective_action=evi_action
    ))

    # Add all gate results to DB
    for res in gate_results:
        db.add(res)
        
    # Evaluate final decision
    any_mandatory_fail = any(r.status == "FAIL" for r in gate_results if r.is_mandatory)
    
    if any_mandatory_fail:
        release.release_decision = "BLOCKED"
    else:
        release.release_decision = "READY_FOR_APPROVAL"
        
    release.evaluator_id = evaluator.id if evaluator else None
    release.evaluated_at = datetime.datetime.now(datetime.timezone.utc)
    
    # Append to approval history
    history_entry = f"[{release.evaluated_at.isoformat()}] Evaluated by {evaluator.username if evaluator else 'SYSTEM'}: {release.release_decision}"
    if release.approval_history:
        release.approval_history += f"\n{history_entry}"
    else:
        release.approval_history = history_entry
        
    db.commit()
    db.refresh(release)
    return release
