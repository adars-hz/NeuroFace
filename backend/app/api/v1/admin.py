from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import get_password_hash
from app.models.user import User, Teacher, Student, UserRole, TeacherDesignation
from app.models.academic import Department, Class, Subject, TeacherSubjectClassAssignment, AttendanceSlot
from app.models.attendance import AttendanceSession, AttendanceRecord, FaceEmbedding
from app.models.leave import FineRule
from app.models.audit import AuditLog
from app.schemas.user import (
    TeacherCreate, TeacherOut, StudentCreate, StudentOut, HODToggleRequest,
    TeacherUpdate, StudentUpdate
)
from app.schemas.academic import (
    DepartmentCreate, DepartmentOut, ClassCreate, ClassOut,
    SubjectCreate, SubjectOut, AssignmentCreate, AssignmentOut, SlotCreate, SlotOut
)
from app.schemas.leave import FineRuleUpdate, FineRuleOut
import json
from app.models.approval import HODApprovalRequest, ApprovalRequestType, ApprovalStatus
from app.api.deps import get_current_admin, get_current_admin_or_hod
from app.core.audit import log_audit_event
from app.services.attendance_calculator import get_active_fine_rule

router = APIRouter()

# ----------------- SYSTEM STATS -----------------
@router.get("/stats")
def get_system_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_hod)):
    total_students = db.query(Student).count()
    registered_faces = db.query(Student).filter(Student.face_registered == True).count()
    total_teachers = db.query(Teacher).count()
    total_classes = db.query(Class).count()
    total_subjects = db.query(Subject).count()
    total_sessions = db.query(AttendanceSession).count()
    total_attendance_marked = db.query(AttendanceRecord).count()
    pending_approvals = db.query(HODApprovalRequest).filter(HODApprovalRequest.status == ApprovalStatus.PENDING).count()

    return {
        "total_students": total_students,
        "face_registered_students": registered_faces,
        "face_registration_pct": round((registered_faces / total_students * 100), 1) if total_students > 0 else 0,
        "total_teachers": total_teachers,
        "total_classes": total_classes,
        "total_subjects": total_subjects,
        "total_attendance_sessions": total_sessions,
        "total_records_marked": total_attendance_marked,
        "pending_approvals_count": pending_approvals
    }

# ----------------- DEPARTMENTS -----------------
@router.get("/departments", response_model=List[DepartmentOut])
def get_departments(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_hod)):
    return db.query(Department).all()

@router.post("/departments")
def create_department(dept_in: DepartmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_hod)):
    existing = db.query(Department).filter(Department.code == dept_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department code already exists")

    if current_user.role == UserRole.ADMIN:
        dept = Department(code=dept_in.code.upper(), name=dept_in.name)
        db.add(dept)
        db.commit()
        db.refresh(dept)
        log_audit_event(db, "CREATE_DEPARTMENT", "Department", current_user.id, dept.id, {"code": dept.code})
        return dept

    req = HODApprovalRequest(
        request_type=ApprovalRequestType.CREATE_DEPARTMENT,
        status=ApprovalStatus.PENDING,
        requested_by_id=current_user.id,
        title=f"Create Department: {dept_in.name} ({dept_in.code.upper()})",
        payload_json=json.dumps(dept_in.model_dump())
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {
        "status": "PENDING_APPROVAL",
        "message": f"Creation of department '{dept_in.name}' submitted for Admin approval.",
        "request_id": req.id
    }

# ----------------- CLASSES -----------------
@router.get("/classes", response_model=List[ClassOut])
def get_classes(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_hod)):
    classes = db.query(Class).all()
    results = []
    for c in classes:
        student_count = db.query(Student).filter(Student.class_id == c.id).count()
        results.append(ClassOut(
            id=c.id,
            name=c.name,
            department_id=c.department_id,
            department_name=c.department.name if c.department else None,
            semester=c.semester,
            academic_year=c.academic_year,
            student_count=student_count
        ))
    return results

@router.post("/classes")
def create_class(cls_in: ClassCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_hod)):
    if current_user.role != UserRole.ADMIN:
        req = HODApprovalRequest(
            request_type=ApprovalRequestType.CREATE_CLASS,
            status=ApprovalStatus.PENDING,
            requested_by_id=current_user.id,
            title=f"Create Academic Class: {cls_in.name}",
            payload_json=json.dumps(cls_in.model_dump())
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        return {
            "status": "PENDING_APPROVAL",
            "message": f"Creation of class '{cls_in.name}' submitted for Admin approval.",
            "request_id": req.id
        }

    new_class = Class(
        name=cls_in.name,
        department_id=cls_in.department_id,
        semester=cls_in.semester,
        academic_year=cls_in.academic_year
    )
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    log_audit_event(db, "CREATE_CLASS", "Class", current_user.id, new_class.id, {"name": new_class.name})
    return ClassOut(
        id=new_class.id,
        name=new_class.name,
        department_id=new_class.department_id,
        department_name=new_class.department.name if new_class.department else None,
        semester=new_class.semester,
        academic_year=new_class.academic_year,
        student_count=0
    )

# ----------------- SUBJECTS -----------------
@router.get("/subjects", response_model=List[SubjectOut])
def get_subjects(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_hod)):
    subjects = db.query(Subject).all()
    results = []
    for s in subjects:
        results.append(SubjectOut(
            id=s.id,
            code=s.code,
            name=s.name,
            department_id=s.department_id,
            department_name=s.department.name if s.department else None,
            semester=s.semester,
            total_credits=s.total_credits
        ))
    return results

@router.post("/subjects")
def create_subject(sub_in: SubjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_hod)):
    existing = db.query(Subject).filter(Subject.code == sub_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject code already exists")

    if current_user.role != UserRole.ADMIN:
        req = HODApprovalRequest(
            request_type=ApprovalRequestType.CREATE_SUBJECT,
            status=ApprovalStatus.PENDING,
            requested_by_id=current_user.id,
            title=f"Create Subject: {sub_in.name} ({sub_in.code.upper()})",
            payload_json=json.dumps(sub_in.model_dump())
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        return {
            "status": "PENDING_APPROVAL",
            "message": f"Creation of subject '{sub_in.name}' submitted for Admin approval.",
            "request_id": req.id
        }

    sub = Subject(
        code=sub_in.code.upper(),
        name=sub_in.name,
        department_id=sub_in.department_id,
        semester=sub_in.semester,
        total_credits=sub_in.total_credits
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    log_audit_event(db, "CREATE_SUBJECT", "Subject", current_user.id, sub.id, {"code": sub.code})
    return SubjectOut(
        id=sub.id,
        code=sub.code,
        name=sub.name,
        department_id=sub.department_id,
        department_name=sub.department.name if sub.department else None,
        semester=sub.semester,
        total_credits=sub.total_credits
    )

# ----------------- TEACHERS -----------------
@router.get("/teachers", response_model=List[TeacherOut])
def get_teachers(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_hod)):
    teachers = db.query(Teacher).all()
    results = []
    for t in teachers:
        results.append(TeacherOut(
            id=t.id,
            user_id=t.user_id,
            teacher_code=t.teacher_code,
            full_name=t.full_name,
            department_id=t.department_id,
            department_name=t.department.name if t.department else None,
            designation=t.designation,
            is_hod=t.is_hod,
            email=t.user.email,
            phone=t.phone,
            is_active=t.user.is_active
        ))
    return results

@router.post("/teachers")
def create_teacher(t_in: TeacherCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_hod)):
    if db.query(User).filter((User.username == t_in.username) | (User.email == t_in.email)).first():
        raise HTTPException(status_code=400, detail="Username or Email already registered")
    if db.query(Teacher).filter(Teacher.teacher_code == t_in.teacher_code).first():
        raise HTTPException(status_code=400, detail="Teacher code already exists")

    # If an HOD is requesting to add a teacher, put in pending approval for Admin
    if current_user.role != UserRole.ADMIN:
        req = HODApprovalRequest(
            request_type=ApprovalRequestType.CREATE_TEACHER,
            status=ApprovalStatus.PENDING,
            requested_by_id=current_user.id,
            title=f"Add Faculty Member: {t_in.full_name} ({t_in.teacher_code})",
            payload_json=json.dumps(t_in.model_dump())
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        log_audit_event(db, "HOD_REQUEST_CREATE_TEACHER", "HODApprovalRequest", current_user.id, req.id, {"teacher_code": t_in.teacher_code})
        return {
            "status": "PENDING_APPROVAL",
            "message": f"Request to add faculty member '{t_in.full_name}' submitted for Admin approval.",
            "request_id": req.id
        }

    # Admin direct execution
    user = User(
        username=t_in.username,
        email=t_in.email,
        password_hash=get_password_hash(t_in.password),
        role=UserRole.TEACHER,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    teacher = Teacher(
        user_id=user.id,
        teacher_code=t_in.teacher_code,
        full_name=t_in.full_name,
        department_id=t_in.department_id,
        designation=t_in.designation,
        phone=t_in.phone
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)

    log_audit_event(db, "CREATE_TEACHER", "Teacher", current_user.id, teacher.id, {"teacher_code": teacher.teacher_code})

    return TeacherOut(
        id=teacher.id,
        user_id=teacher.user_id,
        teacher_code=teacher.teacher_code,
        full_name=teacher.full_name,
        department_id=teacher.department_id,
        department_name=teacher.department.name if teacher.department else None,
        designation=teacher.designation,
        is_hod=teacher.is_hod,
        email=user.email,
        phone=teacher.phone,
        is_active=user.is_active
    )

@router.put("/teachers/toggle-hod")
def toggle_hod_designation(req: HODToggleRequest, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    """Assign or remove HOD designation from a teacher account (Admin only)."""
    teacher = db.query(Teacher).filter(Teacher.id == req.teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    old_desig = teacher.designation
    new_desig = TeacherDesignation.HOD if req.is_hod else TeacherDesignation.ASSISTANT_PROFESSOR
    teacher.designation = new_desig
    db.commit()

    log_audit_event(
        db,
        action="TOGGLE_HOD_DESIGNATION",
        entity_type="Teacher",
        user_id=admin.id,
        entity_id=teacher.id,
        details={"previous": old_desig.value, "new": new_desig.value, "is_hod": req.is_hod}
    )

    return {"message": f"HOD status updated to {req.is_hod}", "designation": teacher.designation}

@router.put("/teachers/{teacher_id}")
def update_teacher(
    teacher_id: int,
    t_in: TeacherUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_hod)
):
    """Update faculty member details. If HOD initiates, submits for Admin approval."""
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    if current_user.role != UserRole.ADMIN:
        payload = t_in.model_dump()
        payload["teacher_id"] = teacher_id
        req = HODApprovalRequest(
            request_type=ApprovalRequestType.UPDATE_TEACHER,
            status=ApprovalStatus.PENDING,
            requested_by_id=current_user.id,
            title=f"Update Faculty Member: {teacher.full_name} ({teacher.teacher_code})",
            payload_json=json.dumps(payload)
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        return {
            "status": "PENDING_APPROVAL",
            "message": f"Update request for '{teacher.full_name}' submitted for Admin approval.",
            "request_id": req.id
        }

    user = teacher.user
    if t_in.email and t_in.email != user.email:
        existing_email = db.query(User).filter(User.email == t_in.email, User.id != user.id).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already registered to another account")
        user.email = t_in.email

    if t_in.full_name is not None and t_in.full_name.strip():
        teacher.full_name = t_in.full_name.strip()
    if t_in.department_id is not None:
        teacher.department_id = t_in.department_id
    if t_in.designation is not None:
        teacher.designation = t_in.designation
    if t_in.phone is not None:
        teacher.phone = t_in.phone.strip()
    if t_in.is_active is not None:
        user.is_active = t_in.is_active
    if t_in.password and t_in.password.strip():
        user.password_hash = get_password_hash(t_in.password.strip())

    db.commit()
    db.refresh(teacher)
    db.refresh(user)

    log_audit_event(
        db,
        action="UPDATE_TEACHER",
        entity_type="Teacher",
        user_id=current_user.id,
        entity_id=teacher.id,
        details={"teacher_code": teacher.teacher_code, "full_name": teacher.full_name}
    )

    return TeacherOut(
        id=teacher.id,
        user_id=teacher.user_id,
        teacher_code=teacher.teacher_code,
        full_name=teacher.full_name,
        department_id=teacher.department_id,
        department_name=teacher.department.name if teacher.department else None,
        designation=teacher.designation,
        is_hod=teacher.is_hod,
        email=user.email,
        phone=teacher.phone,
        is_active=user.is_active
    )

@router.delete("/teachers/{teacher_id}")
def delete_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_hod)
):
    """Delete a faculty member. If HOD, submits for Admin approval."""
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    if current_user.role != UserRole.ADMIN:
        req = HODApprovalRequest(
            request_type=ApprovalRequestType.DELETE_TEACHER,
            status=ApprovalStatus.PENDING,
            requested_by_id=current_user.id,
            title=f"Delete Faculty Member: {teacher.full_name} ({teacher.teacher_code})",
            payload_json=json.dumps({"teacher_id": teacher_id})
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        return {
            "status": "PENDING_APPROVAL",
            "message": f"Deletion of '{teacher.full_name}' submitted for Admin approval.",
            "request_id": req.id
        }

    user_id = teacher.user_id
    t_name = teacher.full_name
    t_code = teacher.teacher_code

    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user)
    else:
        db.delete(teacher)
    db.commit()

    log_audit_event(
        db,
        action="DELETE_TEACHER",
        entity_type="Teacher",
        user_id=current_user.id,
        entity_id=teacher_id,
        details={"teacher_code": t_code, "full_name": t_name}
    )

    return {"message": f"Teacher '{t_name}' ({t_code}) successfully deleted", "id": teacher_id}

# ----------------- STUDENTS -----------------
@router.get("/students", response_model=List[StudentOut])
def get_students(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_hod)):
    students = db.query(Student).all()
    results = []
    for s in students:
        results.append(StudentOut(
            id=s.id,
            user_id=s.user_id,
            register_number=s.register_number,
            full_name=s.full_name,
            department_id=s.department_id,
            department_name=s.department.name if s.department else None,
            class_id=s.class_id,
            class_name=s.class_assigned.name if s.class_assigned else None,
            face_registered=s.face_registered,
            email=s.user.email,
            phone=s.phone,
            is_active=s.user.is_active
        ))
    return results

@router.post("/students")
def create_student(s_in: StudentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_hod)):
    if db.query(User).filter((User.username == s_in.username) | (User.email == s_in.email)).first():
        raise HTTPException(status_code=400, detail="Username or Email already registered")
    if db.query(Student).filter(Student.register_number == s_in.register_number).first():
        raise HTTPException(status_code=400, detail="Student register number already exists")

    # If HOD, queue for Admin approval
    if current_user.role != UserRole.ADMIN:
        req = HODApprovalRequest(
            request_type=ApprovalRequestType.CREATE_STUDENT,
            status=ApprovalStatus.PENDING,
            requested_by_id=current_user.id,
            title=f"Enroll Student: {s_in.full_name} ({s_in.register_number})",
            payload_json=json.dumps(s_in.model_dump())
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        log_audit_event(db, "HOD_REQUEST_CREATE_STUDENT", "HODApprovalRequest", current_user.id, req.id, {"register_number": s_in.register_number})
        return {
            "status": "PENDING_APPROVAL",
            "message": f"Enrollment for student '{s_in.full_name}' submitted for Admin approval.",
            "request_id": req.id
        }

    # Admin direct execution
    user = User(
        username=s_in.username,
        email=s_in.email,
        password_hash=get_password_hash(s_in.password),
        role=UserRole.STUDENT,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    student = Student(
        user_id=user.id,
        register_number=s_in.register_number,
        full_name=s_in.full_name,
        department_id=s_in.department_id,
        class_id=s_in.class_id,
        face_registered=False,
        phone=s_in.phone
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    log_audit_event(db, "CREATE_STUDENT", "Student", current_user.id, student.id, {"register_number": student.register_number})

    return StudentOut(
        id=student.id,
        user_id=student.user_id,
        register_number=student.register_number,
        full_name=student.full_name,
        department_id=student.department_id,
        department_name=student.department.name if student.department else None,
        class_id=student.class_id,
        class_name=student.class_assigned.name if student.class_assigned else None,
        face_registered=student.face_registered,
        email=user.email,
        phone=student.phone,
        is_active=user.is_active
    )

@router.put("/students/{student_id}")
def update_student(
    student_id: int,
    s_in: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_hod)
):
    """Update student profile. If HOD, submits for Admin approval."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if current_user.role != UserRole.ADMIN:
        payload = s_in.model_dump()
        payload["student_id"] = student_id
        req = HODApprovalRequest(
            request_type=ApprovalRequestType.UPDATE_STUDENT,
            status=ApprovalStatus.PENDING,
            requested_by_id=current_user.id,
            title=f"Update Student: {student.full_name} ({student.register_number})",
            payload_json=json.dumps(payload)
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        return {
            "status": "PENDING_APPROVAL",
            "message": f"Update request for student '{student.full_name}' submitted for Admin approval.",
            "request_id": req.id
        }

    user = student.user
    if s_in.email and s_in.email != user.email:
        existing_email = db.query(User).filter(User.email == s_in.email, User.id != user.id).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already in use by another account")
        user.email = s_in.email

    if s_in.register_number and s_in.register_number != student.register_number:
        existing_reg = db.query(Student).filter(Student.register_number == s_in.register_number, Student.id != student.id).first()
        if existing_reg:
            raise HTTPException(status_code=400, detail="Register number already exists")
        student.register_number = s_in.register_number.strip().upper()

    if s_in.full_name is not None and s_in.full_name.strip():
        student.full_name = s_in.full_name.strip()
    if s_in.department_id is not None:
        student.department_id = s_in.department_id
    if s_in.class_id is not None:
        student.class_id = s_in.class_id
    if s_in.phone is not None:
        student.phone = s_in.phone.strip()
    if s_in.is_active is not None:
        user.is_active = s_in.is_active
    if s_in.password and s_in.password.strip():
        user.password_hash = get_password_hash(s_in.password.strip())

    if s_in.reset_face:
        db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student.id).delete()
        student.face_registered = False

    db.commit()
    db.refresh(student)
    db.refresh(user)

    log_audit_event(
        db,
        action="UPDATE_STUDENT",
        entity_type="Student",
        user_id=current_user.id,
        entity_id=student.id,
        details={"register_number": student.register_number, "full_name": student.full_name}
    )

    return StudentOut(
        id=student.id,
        user_id=student.user_id,
        register_number=student.register_number,
        full_name=student.full_name,
        department_id=student.department_id,
        department_name=student.department.name if student.department else None,
        class_id=student.class_id,
        class_name=student.class_assigned.name if student.class_assigned else None,
        face_registered=student.face_registered,
        email=user.email,
        phone=student.phone,
        is_active=user.is_active
    )

@router.post("/students/{student_id}/reset-face")
def reset_student_face(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_hod)
):
    """Clear registered biometric face embedding for a student to allow re-enrollment."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    deleted_count = db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student.id).delete()
    student.face_registered = False
    db.commit()

    log_audit_event(
        db,
        action="RESET_STUDENT_FACE",
        entity_type="Student",
        user_id=current_user.id,
        entity_id=student.id,
        details={"register_number": student.register_number, "deleted_embeddings": deleted_count}
    )

    return {
        "message": f"Biometric template for '{student.full_name}' cleared successfully. Student can now re-register face.",
        "student_id": student.id,
        "face_registered": False
    }

@router.delete("/students/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_hod)
):
    """Delete student. If HOD, submits for Admin approval."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if current_user.role != UserRole.ADMIN:
        req = HODApprovalRequest(
            request_type=ApprovalRequestType.DELETE_STUDENT,
            status=ApprovalStatus.PENDING,
            requested_by_id=current_user.id,
            title=f"Delete Student: {student.full_name} ({student.register_number})",
            payload_json=json.dumps({"student_id": student_id})
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        return {
            "status": "PENDING_APPROVAL",
            "message": f"Deletion of '{student.full_name}' submitted for Admin approval.",
            "request_id": req.id
        }

    user_id = student.user_id
    s_name = student.full_name
    s_reg = student.register_number

    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user)
    else:
        db.delete(student)
    db.commit()

    log_audit_event(
        db,
        action="DELETE_STUDENT",
        entity_type="Student",
        user_id=current_user.id,
        entity_id=student_id,
        details={"register_number": s_reg, "full_name": s_name}
    )

    return {"message": f"Student '{s_name}' ({s_reg}) successfully deleted", "id": student_id}

# ----------------- ASSIGNMENTS -----------------
@router.get("/assignments", response_model=List[AssignmentOut])
def get_assignments(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_hod)):
    assignments = db.query(TeacherSubjectClassAssignment).all()
    results = []
    for a in assignments:
        results.append(AssignmentOut(
            id=a.id,
            teacher_id=a.teacher_id,
            teacher_name=a.teacher.full_name,
            teacher_code=a.teacher.teacher_code,
            subject_id=a.subject_id,
            subject_name=a.subject.name,
            subject_code=a.subject.code,
            class_id=a.class_id,
            class_name=a.class_assigned.name
        ))
    return results

@router.post("/assignments")
def create_assignment(a_in: AssignmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_hod)):
    existing = db.query(TeacherSubjectClassAssignment).filter(
        TeacherSubjectClassAssignment.teacher_id == a_in.teacher_id,
        TeacherSubjectClassAssignment.subject_id == a_in.subject_id,
        TeacherSubjectClassAssignment.class_id == a_in.class_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Assignment already exists")

    if current_user.role != UserRole.ADMIN:
        teacher = db.query(Teacher).filter(Teacher.id == a_in.teacher_id).first()
        subj = db.query(Subject).filter(Subject.id == a_in.subject_id).first()
        cls = db.query(Class).filter(Class.id == a_in.class_id).first()
        t_name = teacher.full_name if teacher else f"ID {a_in.teacher_id}"
        s_name = subj.name if subj else f"ID {a_in.subject_id}"
        c_name = cls.name if cls else f"ID {a_in.class_id}"

        req = HODApprovalRequest(
            request_type=ApprovalRequestType.CREATE_ASSIGNMENT,
            status=ApprovalStatus.PENDING,
            requested_by_id=current_user.id,
            title=f"Assign {t_name} to {s_name} ({c_name})",
            payload_json=json.dumps(a_in.model_dump())
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        return {
            "status": "PENDING_APPROVAL",
            "message": f"Subject assignment submitted for Admin approval.",
            "request_id": req.id
        }

    a = TeacherSubjectClassAssignment(
        teacher_id=a_in.teacher_id,
        subject_id=a_in.subject_id,
        class_id=a_in.class_id
    )
    db.add(a)
    db.commit()
    db.refresh(a)

    log_audit_event(db, "ASSIGN_TEACHER", "Assignment", current_user.id, a.id, {
        "teacher_id": a.teacher_id, "subject_id": a.subject_id, "class_id": a.class_id
    })

    return AssignmentOut(
        id=a.id,
        teacher_id=a.teacher_id,
        teacher_name=a.teacher.full_name,
        teacher_code=a.teacher.teacher_code,
        subject_id=a.subject_id,
        subject_name=a.subject.name,
        subject_code=a.subject.code,
        class_id=a.class_id,
        class_name=a.class_assigned.name
    )

@router.delete("/assignments/{id}")
def delete_assignment(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_hod)):
    a = db.query(TeacherSubjectClassAssignment).filter(TeacherSubjectClassAssignment.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if current_user.role != UserRole.ADMIN:
        req = HODApprovalRequest(
            request_type=ApprovalRequestType.DELETE_ASSIGNMENT,
            status=ApprovalStatus.PENDING,
            requested_by_id=current_user.id,
            title=f"Revoke Assignment: {a.teacher.full_name} from {a.subject.name} ({a.class_assigned.name})",
            payload_json=json.dumps({"assignment_id": id})
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        return {
            "status": "PENDING_APPROVAL",
            "message": "Revocation request submitted for Admin approval.",
            "request_id": req.id
        }

    db.delete(a)
    db.commit()
    log_audit_event(db, "DELETE_ASSIGNMENT", "Assignment", current_user.id, id)
    return {"message": "Assignment deleted successfully"}

# ----------------- SLOTS -----------------
@router.get("/slots", response_model=List[SlotOut])
def get_slots(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
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

# ----------------- FINE RULES -----------------
@router.get("/fine-rules", response_model=FineRuleOut)
def get_fine_rules(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return get_active_fine_rule(db)

@router.put("/fine-rules", response_model=FineRuleOut)
def update_fine_rules(rule_in: FineRuleUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    rule = get_active_fine_rule(db)
    rule.min_eligible_pct = rule_in.min_eligible_pct
    rule.condonation_min_pct = rule_in.condonation_min_pct
    rule.fine_amount = rule_in.fine_amount
    rule.is_active = rule_in.is_active
    db.commit()
    db.refresh(rule)

    log_audit_event(db, "UPDATE_FINE_RULES", "FineRule", admin.id, rule.id, {
        "min_pct": rule.min_eligible_pct, "condonation_pct": rule.condonation_min_pct, "fine": rule.fine_amount
    })

    return rule

# ----------------- AUDIT LOGS -----------------
@router.get("/audit-logs")
def get_audit_logs(limit: int = 100, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    results = []
    for l in logs:
        results.append({
            "id": l.id,
            "user_id": l.user_id,
            "username": l.user.username if l.user else "System",
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "details": l.details,
            "timestamp": l.timestamp
        })
    return results

# ----------------- DATABASE EXPLORER -----------------
@router.get("/db-explorer/tables")
def get_all_database_tables(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    """Retrieve metadata and row counts for all database tables."""
    from sqlalchemy import inspect
    inspector = inspect(db.bind)
    tables = []
    for table_name in inspector.get_table_names():
        try:
            from sqlalchemy import text
            count = db.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar()
            tables.append({
                "table_name": table_name,
                "row_count": count
            })
        except Exception:
            continue
    return sorted(tables, key=lambda x: x["table_name"])

@router.get("/db-explorer/table/{table_name}")
def get_table_data(
    table_name: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Retrieve column schema and up to 50 rows for any selected database table."""
    from sqlalchemy import inspect, text
    inspector = inspect(db.bind)
    valid_tables = inspector.get_table_names()
    if table_name not in valid_tables:
        raise HTTPException(status_code=404, detail=f"Table '{table_name}' does not exist.")

    columns = [col["name"] for col in inspector.get_columns(table_name)]
    rows_query = db.execute(text(f"SELECT * FROM {table_name} LIMIT :limit"), {"limit": limit})
    rows = []
    for r in rows_query.mappings():
        row_dict = {}
        for k, v in r.items():
            # If embedding vector is too long, truncate preview
            if k == "embedding_vector" and isinstance(v, str) and len(v) > 60:
                row_dict[k] = f"{v[:40]}... [512-D vector]"
            elif k == "password_hash" and isinstance(v, str):
                row_dict[k] = f"{v[:15]}... [Bcrypt Hash]"
            else:
                row_dict[k] = str(v) if v is not None else None
        rows.append(row_dict)

    return {
        "table_name": table_name,
        "columns": columns,
        "total_rows_returned": len(rows),
        "rows": rows
    }

