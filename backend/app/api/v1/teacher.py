from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User, Teacher, Student, TeacherDesignation
from app.models.academic import Department, Class, Subject, TeacherSubjectClassAssignment, AttendanceSlot
from app.models.attendance import AttendanceSession, AttendanceRecord, AttendanceStatus, AttendanceSessionStatus, VerificationMethod
from app.models.leave import MedicalWaiver, LeaveApplication, LeaveStatus
from app.schemas.academic import AssignmentOut, SlotOut
from app.schemas.attendance import SessionOut, AttendanceRecordOut, ManualAttendanceCorrection
from app.schemas.leave import MedicalWaiverCreate, MedicalWaiverOut
from app.api.deps import get_current_teacher, get_current_hod
from app.core.audit import log_audit_event
from app.services.attendance_calculator import calculate_student_full_report

router = APIRouter()

# ----------------- TEACHER RESTRICTED ASSIGNMENTS -----------------
@router.get("/my-assignments", response_model=List[AssignmentOut])
def get_my_assignments(
    db: Session = Depends(get_db),
    current_teacher_user: User = Depends(get_current_teacher)
):
    """
    Returns ONLY the subjects and classes assigned to the logged-in teacher.
    Guarantees that a teacher cannot see or access subjects outside their assignment.
    """
    teacher = current_teacher_user.teacher_profile
    assignments = db.query(TeacherSubjectClassAssignment).filter(
        TeacherSubjectClassAssignment.teacher_id == teacher.id
    ).all()

    return [
        AssignmentOut(
            id=a.id,
            teacher_id=a.teacher_id,
            teacher_name=teacher.full_name,
            teacher_code=teacher.teacher_code,
            subject_id=a.subject_id,
            subject_name=a.subject.name,
            subject_code=a.subject.code,
            class_id=a.class_id,
            class_name=a.class_assigned.name
        ) for a in assignments
    ]

@router.get("/available-slots", response_model=List[SlotOut])
def get_available_slots(
    db: Session = Depends(get_db),
    current_teacher_user: User = Depends(get_current_teacher)
):
    """List available attendance slots."""
    slots = db.query(AttendanceSlot).all()
    return [
        SlotOut(
            id=s.id,
            name=s.name,
            start_time=s.start_time.strftime("%H:%M:%S"),
            end_time=s.end_time.strftime("%H:%M:%S"),
            day_of_week=s.day_of_week
        ) for s in slots
    ]

@router.get("/my-sessions", response_model=List[SessionOut])
def get_my_sessions(
    db: Session = Depends(get_db),
    current_teacher_user: User = Depends(get_current_teacher)
):
    """Return historical and active attendance sessions for this teacher."""
    teacher = current_teacher_user.teacher_profile
    sessions = db.query(AttendanceSession).filter(
        AttendanceSession.teacher_id == teacher.id
    ).order_by(AttendanceSession.start_time.desc()).all()

    results = []
    for s in sessions:
        total_enrolled = db.query(Student).filter(Student.class_id == s.assignment.class_id).count()
        present_count = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == s.id,
            AttendanceRecord.status == AttendanceStatus.PRESENT
        ).count()

        results.append(SessionOut(
            id=s.id,
            assignment_id=s.assignment_id,
            teacher_id=s.teacher_id,
            teacher_name=teacher.full_name,
            subject_id=s.assignment.subject_id,
            subject_name=s.assignment.subject.name,
            subject_code=s.assignment.subject.code,
            class_id=s.assignment.class_id,
            class_name=s.assignment.class_assigned.name,
            slot_id=s.slot_id,
            slot_name=s.slot.name if s.slot else "On-Demand Session",
            session_date=s.session_date,
            start_time=s.start_time,
            end_time=s.end_time,
            status=s.status,
            total_enrolled=total_enrolled,
            present_count=present_count
        ))
    return results

@router.get("/sessions/{session_id}/records", response_model=List[AttendanceRecordOut])
def get_session_records(
    session_id: int,
    db: Session = Depends(get_db),
    current_teacher_user: User = Depends(get_current_teacher)
):
    """Retrieve attendance records for a specific session."""
    teacher = current_teacher_user.teacher_profile
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Access check: teacher must own this session or be HOD
    if session.teacher_id != teacher.id and not teacher.is_hod:
        raise HTTPException(status_code=403, detail="Unauthorized to view this session")

    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()
    return [
        AttendanceRecordOut(
            id=r.id,
            session_id=r.session_id,
            student_id=r.student_id,
            student_name=r.student.full_name,
            register_number=r.student.register_number,
            status=r.status,
            timestamp=r.timestamp,
            confidence_score=r.confidence_score,
            verification_method=r.verification_method,
            marked_by=r.marked_by
        ) for r in records
    ]

# ----------------- HOD-EXCLUSIVE ENDPOINTS -----------------
@router.get("/hod/department-overview")
def get_hod_department_overview(
    db: Session = Depends(get_db),
    current_hod_user: User = Depends(get_current_hod)
):
    """
    HOD-exclusive endpoint:
    Access broader attendance trends, all classes in department, and irregular attendances.
    """
    teacher = current_hod_user.teacher_profile
    dept_id = teacher.department_id

    classes = db.query(Class).filter(Class.department_id == dept_id).all() if dept_id else db.query(Class).all()
    teachers_in_dept = db.query(Teacher).filter(Teacher.department_id == dept_id).all() if dept_id else db.query(Teacher).all()
    total_students = db.query(Student).filter(Student.department_id == dept_id).count() if dept_id else db.query(Student).count()

    active_sessions = db.query(AttendanceSession).filter(
        AttendanceSession.status == AttendanceSessionStatus.ACTIVE
    ).count()

    pending_waivers = db.query(LeaveApplication).filter(
        LeaveApplication.status == LeaveStatus.PENDING
    ).count()

    return {
        "department_name": teacher.department.name if teacher.department else "All Departments",
        "total_classes": len(classes),
        "total_teachers": len(teachers_in_dept),
        "total_students": total_students,
        "active_attendance_sessions": active_sessions,
        "pending_leave_applications": pending_waivers
    }

@router.post("/hod/grant-medical-waiver", response_model=MedicalWaiverOut)
def grant_medical_waiver(
    waiver_in: MedicalWaiverCreate,
    db: Session = Depends(get_db),
    current_hod_user: User = Depends(get_current_hod)
):
    """
    HOD-exclusive: Approve a medical attendance waiver for a student in a specific subject.
    Re-evaluates attendance without deleting historical records.
    """
    student = db.query(Student).filter(Student.id == waiver_in.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    subject = db.query(Subject).filter(Subject.id == waiver_in.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    waiver = MedicalWaiver(
        student_id=student.id,
        subject_id=subject.id,
        leave_id=waiver_in.leave_id,
        waived_classes_count=waiver_in.waived_classes_count,
        applied_rule="HOD_MEDICAL_WAIVER_ADD_PRESENT",
        approved_by=current_hod_user.id,
        remarks=waiver_in.remarks
    )
    db.add(waiver)

    # If linked to a leave application, mark it as approved
    if waiver_in.leave_id:
        leave = db.query(LeaveApplication).filter(LeaveApplication.id == waiver_in.leave_id).first()
        if leave:
            leave.status = LeaveStatus.APPROVED
            leave.reviewed_by = current_hod_user.id
            leave.review_remarks = f"Medical waiver granted: {waiver_in.waived_classes_count} classes waived."

    db.commit()
    db.refresh(waiver)

    log_audit_event(
        db,
        action="HOD_GRANT_MEDICAL_WAIVER",
        entity_type="MedicalWaiver",
        user_id=current_hod_user.id,
        entity_id=waiver.id,
        details={
            "student_id": student.id,
            "register_number": student.register_number,
            "subject_id": subject.id,
            "waived_classes": waiver.waived_classes_count
        }
    )

    return MedicalWaiverOut(
        id=waiver.id,
        student_id=student.id,
        student_name=student.full_name,
        register_number=student.register_number,
        subject_id=subject.id,
        subject_name=subject.name,
        subject_code=subject.code,
        leave_id=waiver.leave_id,
        waived_classes_count=waiver.waived_classes_count,
        applied_rule=waiver.applied_rule,
        approved_by_name=current_hod_user.teacher_profile.full_name,
        approval_date=waiver.approval_date,
        remarks=waiver.remarks
    )

@router.put("/hod/manual-attendance-override/{session_id}")
def manual_attendance_override(
    session_id: int,
    correction: ManualAttendanceCorrection,
    db: Session = Depends(get_db),
    current_hod_user: User = Depends(get_current_hod)
):
    """
    HOD-exclusive: Manually correct or override student attendance status for a session.
    Every modification is permanently recorded in the audit log.
    """
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.student_id == correction.student_id
    ).first()

    old_status = record.status.value if record else "NOT_RECORDED"

    if record:
        record.status = correction.status
        record.verification_method = VerificationMethod.MANUAL_OVERRIDE
        record.marked_by = f"HOD Override: {current_hod_user.teacher_profile.full_name} ({correction.remarks})"
    else:
        record = AttendanceRecord(
            session_id=session_id,
            student_id=correction.student_id,
            status=correction.status,
            verification_method=VerificationMethod.MANUAL_OVERRIDE,
            marked_by=f"HOD Override: {current_hod_user.teacher_profile.full_name} ({correction.remarks})"
        )
        db.add(record)

    db.commit()

    log_audit_event(
        db,
        action="HOD_ATTENDANCE_OVERRIDE",
        entity_type="AttendanceRecord",
        user_id=current_hod_user.id,
        entity_id=record.id,
        details={
            "session_id": session_id,
            "student_id": correction.student_id,
            "previous_status": old_status,
            "new_status": correction.status.value,
            "remarks": correction.remarks
        }
    )

    return {"message": "Attendance record updated successfully", "status": record.status.value}
