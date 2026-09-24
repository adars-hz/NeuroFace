from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User, UserRole, Student
from app.models.academic import Class, Subject, TeacherSubjectClassAssignment
from app.models.attendance import AttendanceSession, AttendanceRecord, AttendanceStatus
from app.api.deps import get_current_user
from app.services.attendance_calculator import calculate_student_full_report, calculate_student_subject_attendance, get_active_fine_rule
from app.services.report_service import generate_student_report_csv, generate_student_report_pdf
from app.schemas.reports import StudentAttendanceReport, ClassSubjectReport, ClassAttendanceRow

router = APIRouter()

@router.get("/student/{student_id}", response_model=StudentAttendanceReport)
def get_student_report(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve full subject-wise attendance, eligibility, and fine status for a student."""
    # Enforce role boundary: student can only view their own
    if current_user.role == UserRole.STUDENT and current_user.student_profile.id != student_id:
        raise HTTPException(status_code=403, detail="Unauthorized to view other students' reports.")

    return calculate_student_full_report(db, student_id)

@router.get("/student/{student_id}/export-csv")
def export_student_csv(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download attendance report as a CSV file."""
    if current_user.role == UserRole.STUDENT and current_user.student_profile.id != student_id:
        raise HTTPException(status_code=403, detail="Unauthorized.")

    report = calculate_student_full_report(db, student_id)
    csv_data = generate_student_report_csv(report)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{report.register_number}.csv"}
    )

@router.get("/student/{student_id}/export-pdf")
def export_student_pdf(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download attendance report as a styled PDF document."""
    if current_user.role == UserRole.STUDENT and current_user.student_profile.id != student_id:
        raise HTTPException(status_code=403, detail="Unauthorized.")

    report = calculate_student_full_report(db, student_id)
    pdf_bytes = generate_student_report_pdf(report)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=attendance_{report.register_number}.pdf"}
    )

@router.get("/class/{class_id}/subject/{subject_id}", response_model=ClassSubjectReport)
def get_class_subject_report(
    class_id: int,
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve complete attendance roster matrix for a specific class and subject."""
    cls = db.query(Class).filter(Class.id == class_id).first()
    sub = db.query(Subject).filter(Subject.id == subject_id).first()
    if not cls or not sub:
        raise HTTPException(status_code=404, detail="Class or Subject not found")

    assignment = db.query(TeacherSubjectClassAssignment).filter(
        TeacherSubjectClassAssignment.class_id == class_id,
        TeacherSubjectClassAssignment.subject_id == subject_id
    ).first()

    teacher_name = assignment.teacher.full_name if assignment else "Unassigned"

    total_sessions = db.query(AttendanceSession).filter(
        AttendanceSession.assignment_id == (assignment.id if assignment else -1)
    ).count()

    students = db.query(Student).filter(Student.class_id == class_id).all()
    fine_rule = get_active_fine_rule(db)

    rows: list[ClassAttendanceRow] = []
    total_pct = 0.0
    eligible_count = 0
    condonation_count = 0
    detained_count = 0

    for s in students:
        stat = calculate_student_subject_attendance(db, s.id, subject_id, fine_rule)
        rows.append(ClassAttendanceRow(
            student_id=s.id,
            register_number=s.register_number,
            student_name=s.full_name,
            total_classes=stat.total_classes,
            present_classes=stat.present_classes,
            waived_classes=stat.waived_classes,
            attendance_pct=stat.effective_attendance_pct,
            is_eligible=stat.is_eligible,
            fine_status=stat.fine_status
        ))
        total_pct += stat.effective_attendance_pct
        if stat.is_eligible:
            eligible_count += 1
        elif stat.requires_fine:
            condonation_count += 1
        else:
            detained_count += 1

    avg_pct = round(total_pct / len(students), 2) if students else 100.0

    return ClassSubjectReport(
        class_id=cls.id,
        class_name=cls.name,
        subject_id=sub.id,
        subject_code=sub.code,
        subject_name=sub.name,
        teacher_name=teacher_name,
        total_sessions_held=total_sessions,
        average_attendance_pct=avg_pct,
        eligible_students_count=eligible_count,
        condonation_students_count=condonation_count,
        detained_students_count=detained_count,
        students=rows
    )
