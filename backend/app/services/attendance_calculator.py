from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.academic import Subject, Class, TeacherSubjectClassAssignment
from app.models.attendance import AttendanceSession, AttendanceRecord, AttendanceStatus, AttendanceSessionStatus
from app.models.leave import MedicalWaiver, FineRule, FineRecord, FinePaymentStatus
from app.models.user import Student
from app.schemas.reports import SubjectAttendanceStat, StudentAttendanceReport

def get_active_fine_rule(db: Session) -> FineRule:
    """Retrieve the currently active institutional fine rule, or default if none."""
    rule = db.query(FineRule).filter(FineRule.is_active == True).first()
    if not rule:
        rule = FineRule(
            min_eligible_pct=85.0,
            condonation_min_pct=75.0,
            fine_amount=500.0,
            is_active=True
        )
        db.add(rule)
        db.commit()
        db.refresh(rule)
    return rule

def calculate_student_subject_attendance(
    db: Session,
    student_id: int,
    subject_id: int,
    fine_rule: Optional[FineRule] = None
) -> SubjectAttendanceStat:
    """
    Calculate subject-wise attendance percentage for a student.
    Formula:
      Raw % = (Present / Total Held) * 100
      With Medical Waiver:
      Effective % = min(100.0, ((Present + Waived) / Total Held) * 100)
    Eligibility:
      Effective % >= 85.0 -> Eligible (No Fine)
      75.0 <= Effective % < 85.0 -> Eligible with Condonation Fine
      Effective % < 75.0 -> Ineligible / Detained
    """
    if not fine_rule:
        fine_rule = get_active_fine_rule(db)

    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise ValueError("Subject not found")

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise ValueError("Student not found")

    # 1. Total sessions held for this subject and student's class
    total_sessions = db.query(AttendanceSession)\
        .join(TeacherSubjectClassAssignment, AttendanceSession.assignment_id == TeacherSubjectClassAssignment.id)\
        .filter(
            TeacherSubjectClassAssignment.subject_id == subject_id,
            TeacherSubjectClassAssignment.class_id == student.class_id,
            AttendanceSession.status.in_([AttendanceSessionStatus.COMPLETED, AttendanceSessionStatus.EXPIRED, AttendanceSessionStatus.ACTIVE])
        ).count()

    if total_sessions == 0:
        return SubjectAttendanceStat(
            subject_id=subject.id,
            subject_code=subject.code,
            subject_name=subject.name,
            total_classes=0,
            present_classes=0,
            absent_classes=0,
            waived_classes=0,
            raw_attendance_pct=100.0,  # No classes held yet
            effective_attendance_pct=100.0,
            is_eligible=True,
            requires_fine=False,
            fine_amount=0.0,
            fine_status="NONE"
        )

    # 2. Count present sessions for student
    present_count = db.query(AttendanceRecord)\
        .join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id)\
        .join(TeacherSubjectClassAssignment, AttendanceSession.assignment_id == TeacherSubjectClassAssignment.id)\
        .filter(
            AttendanceRecord.student_id == student_id,
            TeacherSubjectClassAssignment.subject_id == subject_id,
            AttendanceRecord.status == AttendanceStatus.PRESENT
        ).count()

    # 3. Count medical waivers approved for this student and subject
    waiver_sum = db.query(func.coalesce(func.sum(MedicalWaiver.waived_classes_count), 0))\
        .filter(
            MedicalWaiver.student_id == student_id,
            MedicalWaiver.subject_id == subject_id
        ).scalar()
    waived_count = int(waiver_sum)

    # Calculate percentages
    raw_pct = round((present_count / total_sessions) * 100.0, 2)
    effective_count = min(total_sessions, present_count + waived_count)
    effective_pct = round((effective_count / total_sessions) * 100.0, 2)

    absent_count = max(0, total_sessions - present_count)

    # Evaluate attendance metrics (exam eligibility and fine removed)
    is_eligible = True
    requires_fine = False
    fine_amt = 0.0
    fine_status = "NONE"

    return SubjectAttendanceStat(
        subject_id=subject.id,
        subject_code=subject.code,
        subject_name=subject.name,
        total_classes=total_sessions,
        present_classes=present_count,
        absent_classes=absent_count,
        waived_classes=waived_count,
        raw_attendance_pct=raw_pct,
        effective_attendance_pct=effective_pct,
        is_eligible=is_eligible,
        requires_fine=requires_fine,
        fine_amount=fine_amt,
        fine_status=fine_status
    )

def calculate_student_full_report(db: Session, student_id: int) -> StudentAttendanceReport:
    """Calculate attendance report across all subjects assigned to the student's class."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise ValueError("Student not found")

    fine_rule = get_active_fine_rule(db)

    # Find subjects assigned to the student's class
    subjects = db.query(Subject)\
        .join(TeacherSubjectClassAssignment, Subject.id == TeacherSubjectClassAssignment.subject_id)\
        .filter(TeacherSubjectClassAssignment.class_id == student.class_id)\
        .distinct()\
        .all()

    subject_stats: List[SubjectAttendanceStat] = []
    total_effective_pct = 0.0
    all_eligible = True

    for sub in subjects:
        stat = calculate_student_subject_attendance(db, student_id, sub.id, fine_rule)
        subject_stats.append(stat)
        total_effective_pct += stat.effective_attendance_pct

    overall_pct = round(total_effective_pct / len(subject_stats), 2) if subject_stats else 100.0

    return StudentAttendanceReport(
        student_id=student.id,
        register_number=student.register_number,
        student_name=student.full_name,
        class_id=student.class_id or 0,
        class_name=student.class_assigned.name if student.class_assigned else "Unassigned",
        department_name=student.department.name if student.department else "Unassigned",
        overall_attendance_pct=overall_pct,
        all_subjects_eligible=all_eligible,
        subjects=subject_stats
    )
