import io
import csv
import datetime
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.models.project import Project
from app.models.requirement import Requirement
from app.models.review import Review
from app.models.test_case import TestCase
from app.models.defect import Defect
from app.models.release import Release
from app.models.capa import CAPA
from app.services.metrics import calculate_quality_metrics

def generate_csv_report(db: Session, report_type: str, project_id: int = None) -> io.StringIO:
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "defects":
        writer.writerow(["Defect Code", "Title", "Severity", "Priority", "Category", "Module", "Status", "Retest Result", "Created At", "Closed At"])
        query = db.query(Defect)
        if project_id:
            query = query.filter(Defect.project_id == project_id)
        for d in query.all():
            writer.writerow([d.defect_code, d.title, d.severity, d.priority, d.category, d.affected_module, d.status, d.retest_result, d.created_at, d.closed_at])

    elif report_type == "requirements":
        writer.writerow(["Req Code", "Title", "Priority", "Risk Level", "Quality Factor", "Version", "Status", "Review Comments"])
        query = db.query(Requirement)
        if project_id:
            query = query.filter(Requirement.project_id == project_id)
        for r in query.all():
            writer.writerow([r.req_code, r.title, r.priority, r.risk_level, r.quality_factor, r.version, r.status, r.review_comments or ""])

    elif report_type == "tests":
        writer.writerow(["Test Code", "Scenario Title", "Category", "Status", "Mandatory", "Actual Result", "Execution Date", "Evidence"])
        query = db.query(TestCase)
        if project_id:
            query = query.filter(TestCase.project_id == project_id)
        for t in query.all():
            writer.writerow([t.tc_code, t.scenario_title, t.scenario_category, t.status, "Yes" if t.is_mandatory else "No", t.actual_result or "", t.execution_date, t.evidence_notes or t.evidence_url or ""])

    elif report_type == "capa":
        writer.writerow(["CAPA Code", "Title", "Status", "Root Cause", "Corrective Action", "Preventive Action", "Due Date", "Closed At"])
        query = db.query(CAPA)
        if project_id:
            query = query.filter(CAPA.project_id == project_id)
        for c in query.all():
            writer.writerow([c.capa_code, c.title, c.status, c.root_cause_analysis, c.corrective_action, c.preventive_action, c.due_date, c.closed_at])

    else:
        # Default quality metrics summary
        metrics = calculate_quality_metrics(db, project_id)
        writer.writerow(["Metric Name", "Value", "Benchmark Target"])
        writer.writerow(["Requirements Approval Rate", f"{metrics.requirements_approval_rate}%", ">= 80%"])
        writer.writerow(["Code Review Completion Rate", f"{metrics.code_review_completion_rate}%", "100%"])
        writer.writerow(["Test Pass Rate", f"{metrics.test_pass_rate}%", ">= 90%"])
        writer.writerow(["Defect Density", f"{metrics.defect_density} def/req", "< 1.5"])
        writer.writerow(["Defect Leakage", f"{metrics.defect_leakage}%", "0%"])
        writer.writerow(["Mean Time To Resolve", f"{metrics.mean_time_to_resolve_hours} hrs", "< 48 hrs"])
        writer.writerow(["CAPA Closure Rate", f"{metrics.capa_closure_rate}%", ">= 80%"])
        writer.writerow(["Open Critical/High Defects", metrics.open_critical_high_defects, "0"])

    output.seek(0)
    return output

def generate_pdf_report(db: Session, report_type: str, project_id: int = None) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="ReportTitle",
        parent=styles["Title"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
        alignment=0
    )
    subtitle_style = ParagraphStyle(
        name="ReportSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b")
    )
    h2_style = ParagraphStyle(
        name="ReportH2",
        parent=styles["Heading2"],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0284c7")
    )
    body_style = ParagraphStyle(
        name="ReportBody",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1e293b")
    )

    # Header
    elements.append(Paragraph("SmartQMS | E-Commerce Quality Management Suite", title_style))
    elements.append(Paragraph("Software Quality. Verified at Every Stage. — Official Verification Audit Report", subtitle_style))
    elements.append(Spacer(1, 4))
    proj_name = "All Projects"
    if project_id:
        proj = db.query(Project).filter(Project.id == project_id).first()
        if proj:
            proj_name = f"{proj.name} ({proj.code})"
    
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    elements.append(Paragraph(f"Report Type: <b>{report_type.upper()}</b> | Scope: <b>{proj_name}</b> | Generated: {now_str}", subtitle_style))
    elements.append(Spacer(1, 15))

    if report_type == "defects":
        elements.append(Paragraph("Defect & Non-Conformance Register", h2_style))
        elements.append(Spacer(1, 8))
        query = db.query(Defect)
        if project_id:
            query = query.filter(Defect.project_id == project_id)
        defects = query.all()
        
        data = [["Code", "Title", "Severity", "Category", "Status", "Module"]]
        for d in defects[:25]:
            data.append([
                d.defect_code,
                Paragraph(d.title[:35] + ("..." if len(d.title) > 35 else ""), body_style),
                d.severity.upper(),
                d.category.replace("_", " ").title(),
                d.status.upper(),
                d.affected_module
            ])
            
        t = Table(data, colWidths=[65, 180, 60, 95, 60, 80])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0284c7")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 9),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#f8fafc")),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elements.append(t)

    elif report_type == "releases":
        elements.append(Paragraph("Release Readiness & Quality Gate Status", h2_style))
        elements.append(Spacer(1, 8))
        query = db.query(Release)
        if project_id:
            query = query.filter(Release.project_id == project_id)
        releases = query.all()

        data = [["Release Code", "Target Env", "Decision", "Evaluated At", "Approved At"]]
        for r in releases:
            data.append([
                r.release_code,
                r.target_environment.upper(),
                r.release_decision,
                r.evaluated_at.strftime("%Y-%m-%d %H:%M") if r.evaluated_at else "Not Evaluated",
                r.approved_at.strftime("%Y-%m-%d %H:%M") if r.approved_at else "Pending"
            ])
        t = Table(data, colWidths=[110, 80, 110, 120, 120])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 9),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ]))
        elements.append(t)

    else:
        # Quality Summary
        metrics = calculate_quality_metrics(db, project_id)
        elements.append(Paragraph("Executive Quality Scorecard", h2_style))
        elements.append(Spacer(1, 8))

        data = [
            ["Quality Metric Indicator", "Calculated Measurement", "Compliance Benchmark Target", "Evaluation Status"],
            ["Requirements Approval Rate", f"{metrics.requirements_approval_rate}%", ">= 80.0%", "COMPLIANT" if metrics.requirements_approval_rate >= 80 else "BREACH"],
            ["Code Review Completion Rate", f"{metrics.code_review_completion_rate}%", "100.0%", "COMPLIANT" if metrics.code_review_completion_rate == 100 else "ATTENTION"],
            ["Test Pass Rate", f"{metrics.test_pass_rate}%", ">= 90.0%", "COMPLIANT" if metrics.test_pass_rate >= 90 else "BREACH"],
            ["Defect Density", f"{metrics.defect_density} def/req", "< 1.5 def/req", "COMPLIANT" if metrics.defect_density < 1.5 else "HIGH"],
            ["Defect Leakage", f"{metrics.defect_leakage}%", "0.0%", "EXCELLENT" if metrics.defect_leakage == 0 else "OBSERVE"],
            ["Mean Time To Resolve", f"{metrics.mean_time_to_resolve_hours} hours", "< 48.0 hours", "PASS" if metrics.mean_time_to_resolve_hours < 48 else "DELAY"],
            ["Open Critical & High Defects", str(metrics.open_critical_high_defects), "0", "ZERO TOLERANCE MET" if metrics.open_critical_high_defects == 0 else "BLOCKING RELEASE"],
            ["Release Gate Pass Rate", f"{metrics.release_gate_pass_rate}%", "100.0%", "READY" if metrics.release_gate_pass_rate == 100 else "PENDING"]
        ]
        t = Table(data, colWidths=[160, 110, 130, 140])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0284c7")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 9),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#f8fafc")),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ]))
        elements.append(t)

    doc.build(elements)
    buffer.seek(0)
    return buffer
