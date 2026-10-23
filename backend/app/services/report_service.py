import io
import csv
from app.schemas.reports import StudentAttendanceReport

def generate_student_report_csv(report: StudentAttendanceReport) -> str:
    """Generate CSV string of student subject attendance."""
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["NEUROFACE - STUDENT ATTENDANCE REPORT"])
    writer.writerow(["Student Name", report.student_name])
    writer.writerow(["Register Number", report.register_number])
    writer.writerow(["Class", report.class_name])
    writer.writerow(["Department", report.department_name])
    writer.writerow(["Overall Attendance %", f"{report.overall_attendance_pct}%"])
    writer.writerow([])
    writer.writerow([
        "Subject Code", "Subject Name", "Total Classes", "Present",
        "Absent", "Waived", "Raw %", "Effective %", "Eligibility", "Fine Status"
    ])

    for s in report.subjects:
        writer.writerow([
            s.subject_code,
            s.subject_name,
            s.total_classes,
            s.present_classes,
            s.absent_classes,
            s.waived_classes,
            f"{s.raw_attendance_pct}%",
            f"{s.effective_attendance_pct}%",
            "ELIGIBLE" if s.is_eligible else ("CONDONATION" if s.requires_fine else "DETAINED"),
            f"FINE: Rs.{s.fine_amount} ({s.fine_status})" if s.requires_fine else s.fine_status
        ])

    return output.getvalue()

def generate_student_report_pdf(report: StudentAttendanceReport) -> bytes:
    """Generate a clean, professional PDF attendance summary.

    `reportlab` is an optional dependency, so it is imported here instead of
    at the top of the file. That way the CSV export keeps working on
    machines where reportlab was never installed.
    """
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
    except ImportError as exc:
        raise RuntimeError(
            "PDF export needs the 'reportlab' package. Install it with: pip install reportlab"
        ) from exc

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    elements = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=12
    )

    sub_style = ParagraphStyle(
        'SubStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor("#475569"),
        spaceAfter=6
    )

    elements.append(Paragraph("<b>NeuroFace: Attendance & Eligibility Report</b>", title_style))
    elements.append(Paragraph(f"<b>Student:</b> {report.student_name} ({report.register_number})", sub_style))
    elements.append(Paragraph(f"<b>Class:</b> {report.class_name} | <b>Department:</b> {report.department_name}", sub_style))
    elements.append(Paragraph(f"<b>Overall Attendance:</b> {report.overall_attendance_pct}% | <b>Status:</b> {'ALL ELIGIBLE' if report.all_subjects_eligible else 'ACTION REQUIRED'}", sub_style))
    elements.append(Spacer(1, 14))

    table_data = [
        ["Code", "Subject", "Total", "Present", "Absent", "Waived", "Att %", "Eligibility", "Fine"]
    ]

    for s in report.subjects:
        elig_text = "Eligible" if s.is_eligible else ("Condonation" if s.requires_fine else "Detained")
        fine_text = f"Rs.{s.fine_amount}" if s.requires_fine else "-"
        table_data.append([
            s.subject_code,
            s.subject_name[:18],
            str(s.total_classes),
            str(s.present_classes),
            str(s.absent_classes),
            str(s.waived_classes),
            f"{s.effective_attendance_pct}%",
            elig_text,
            fine_text
        ])

    t = Table(table_data, colWidths=[55, 130, 40, 45, 45, 45, 55, 65, 55])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e40af")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
    ]))

    elements.append(t)
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
