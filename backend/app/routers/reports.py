from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.services.auth import get_current_user
from app.services.reporting import generate_csv_report, generate_pdf_report
from app.services.audit import log_audit

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/export/{report_format}/{report_type}")
def export_report(
    report_format: str, # "pdf" or "csv"
    report_type: str,   # "quality", "defects", "requirements", "tests", "releases", "capa"
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log_audit(db, current_user, "REPORT_EXPORT", "Report", f"{report_type}.{report_format}", f"Exported {report_type} report in {report_format} format")
    
    if report_format.lower() == "csv":
        csv_buffer = generate_csv_report(db, report_type, project_id)
        return Response(
            content=csv_buffer.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=SmartQMS_{report_type}_report.csv"}
        )
    elif report_format.lower() == "pdf":
        pdf_buffer = generate_pdf_report(db, report_type, project_id)
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=SmartQMS_{report_type}_report.pdf"}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid report format. Supported: 'pdf', 'csv'")
