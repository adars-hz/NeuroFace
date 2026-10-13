import json
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import get_password_hash
from app.models.user import User, Teacher, Student, UserRole, TeacherDesignation
from app.models.academic import Department, Class, Subject, TeacherSubjectClassAssignment
from app.models.approval import HODApprovalRequest, ApprovalRequestType, ApprovalStatus
from app.schemas.approval import HODApprovalRequestOut, HODApprovalRequestReview
from app.api.deps import get_current_admin, get_current_admin_or_hod
from app.core.audit import log_audit_event

router = APIRouter()

def execute_approval_payload(request_type: ApprovalRequestType, payload: dict, db: Session, admin_id: int):
    """Executes the approved action in the database and logs an audit trail."""
    if request_type == ApprovalRequestType.CREATE_TEACHER:
        username = payload["username"]
        email = payload["email"]
        password = payload["password"]
        full_name = payload["full_name"]
        teacher_code = payload["teacher_code"]
        department_id = payload.get("department_id")
        designation = payload.get("designation", TeacherDesignation.ASSISTANT_PROFESSOR.value)
        phone = payload.get("phone")

        if db.query(User).filter((User.username == username) | (User.email == email)).first():
            raise HTTPException(status_code=400, detail="Username or Email already registered")
        if db.query(Teacher).filter(Teacher.teacher_code == teacher_code).first():
            raise HTTPException(status_code=400, detail="Teacher code already exists")

        user = User(
            username=username,
            email=email,
            password_hash=get_password_hash(password),
            role=UserRole.TEACHER,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        teacher = Teacher(
            user_id=user.id,
            teacher_code=teacher_code,
            full_name=full_name,
            department_id=department_id,
            designation=TeacherDesignation(designation),
            phone=phone
        )
        db.add(teacher)
        db.commit()
        db.refresh(teacher)
        log_audit_event(db, "EXECUTE_HOD_CREATE_TEACHER", "Teacher", admin_id, teacher.id, {"teacher_code": teacher_code})
        return {"teacher_id": teacher.id, "full_name": full_name}

    elif request_type == ApprovalRequestType.UPDATE_TEACHER:
        teacher_id = payload["teacher_id"]
        teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")
        user = teacher.user

        if payload.get("email") and payload["email"] != user.email:
            existing = db.query(User).filter(User.email == payload["email"], User.id != user.id).first()
            if existing:
                raise HTTPException(status_code=400, detail="Email already registered")
            user.email = payload["email"]

        if payload.get("full_name"):
            teacher.full_name = payload["full_name"].strip()
        if payload.get("department_id"):
            teacher.department_id = payload["department_id"]
        if payload.get("designation"):
            teacher.designation = TeacherDesignation(payload["designation"])
        if payload.get("phone") is not None:
            teacher.phone = payload["phone"]
        if payload.get("is_active") is not None:
            user.is_active = payload["is_active"]
        if payload.get("password") and payload["password"].strip():
            user.password_hash = get_password_hash(payload["password"].strip())

        db.commit()
        log_audit_event(db, "EXECUTE_HOD_UPDATE_TEACHER", "Teacher", admin_id, teacher.id, {"teacher_code": teacher.teacher_code})
        return {"teacher_id": teacher.id, "full_name": teacher.full_name}

    elif request_type == ApprovalRequestType.DELETE_TEACHER:
        teacher_id = payload["teacher_id"]
        teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")
        user_id = teacher.user_id
        t_name = teacher.full_name
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            db.delete(user)
        else:
            db.delete(teacher)
        db.commit()
        log_audit_event(db, "EXECUTE_HOD_DELETE_TEACHER", "Teacher", admin_id, teacher_id, {"full_name": t_name})
        return {"deleted_id": teacher_id}

    elif request_type == ApprovalRequestType.CREATE_STUDENT:
        username = payload["username"]
        email = payload["email"]
        password = payload["password"]
        full_name = payload["full_name"]
        register_number = payload["register_number"]
        department_id = payload.get("department_id")
        class_id = payload.get("class_id")
        phone = payload.get("phone")

        if db.query(User).filter((User.username == username) | (User.email == email)).first():
            raise HTTPException(status_code=400, detail="Username or Email already registered")
        if db.query(Student).filter(Student.register_number == register_number).first():
            raise HTTPException(status_code=400, detail="Student register number already exists")

        user = User(
            username=username,
            email=email,
            password_hash=get_password_hash(password),
            role=UserRole.STUDENT,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        student = Student(
            user_id=user.id,
            register_number=register_number,
            full_name=full_name,
            department_id=department_id,
            class_id=class_id,
            face_registered=False,
            phone=phone
        )
        db.add(student)
        db.commit()
        db.refresh(student)
        log_audit_event(db, "EXECUTE_HOD_CREATE_STUDENT", "Student", admin_id, student.id, {"register_number": register_number})
        return {"student_id": student.id, "full_name": full_name}

    elif request_type == ApprovalRequestType.UPDATE_STUDENT:
        student_id = payload["student_id"]
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        user = student.user

        if payload.get("email") and payload["email"] != user.email:
            existing = db.query(User).filter(User.email == payload["email"], User.id != user.id).first()
            if existing:
                raise HTTPException(status_code=400, detail="Email already registered")
            user.email = payload["email"]
        if payload.get("register_number") and payload["register_number"] != student.register_number:
            existing = db.query(Student).filter(Student.register_number == payload["register_number"], Student.id != student.id).first()
            if existing:
                raise HTTPException(status_code=400, detail="Register number already exists")
            student.register_number = payload["register_number"].strip().upper()
        if payload.get("full_name"):
            student.full_name = payload["full_name"].strip()
        if payload.get("department_id"):
            student.department_id = payload["department_id"]
        if payload.get("class_id"):
            student.class_id = payload["class_id"]
        if payload.get("phone") is not None:
            student.phone = payload["phone"]
        if payload.get("is_active") is not None:
            user.is_active = payload["is_active"]
        if payload.get("password") and payload["password"].strip():
            user.password_hash = get_password_hash(payload["password"].strip())

        db.commit()
        log_audit_event(db, "EXECUTE_HOD_UPDATE_STUDENT", "Student", admin_id, student.id, {"register_number": student.register_number})
        return {"student_id": student.id, "full_name": student.full_name}

    elif request_type == ApprovalRequestType.DELETE_STUDENT:
        student_id = payload["student_id"]
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        user_id = student.user_id
        s_name = student.full_name
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            db.delete(user)
        else:
            db.delete(student)
        db.commit()
        log_audit_event(db, "EXECUTE_HOD_DELETE_STUDENT", "Student", admin_id, student_id, {"full_name": s_name})
        return {"deleted_id": student_id}

    elif request_type == ApprovalRequestType.CREATE_DEPARTMENT:
        code = payload["code"].upper()
        name = payload["name"]
        existing = db.query(Department).filter(Department.code == code).first()
        if existing:
            raise HTTPException(status_code=400, detail="Department code already exists")
        dept = Department(code=code, name=name)
        db.add(dept)
        db.commit()
        db.refresh(dept)
        log_audit_event(db, "EXECUTE_HOD_CREATE_DEPARTMENT", "Department", admin_id, dept.id, {"code": code})
        return {"department_id": dept.id, "name": name}

    elif request_type == ApprovalRequestType.CREATE_CLASS:
        new_class = Class(
            name=payload["name"],
            department_id=payload["department_id"],
            semester=payload["semester"],
            academic_year=payload["academic_year"]
        )
        db.add(new_class)
        db.commit()
        db.refresh(new_class)
        log_audit_event(db, "EXECUTE_HOD_CREATE_CLASS", "Class", admin_id, new_class.id, {"name": new_class.name})
        return {"class_id": new_class.id, "name": new_class.name}

    elif request_type == ApprovalRequestType.CREATE_SUBJECT:
        sub = Subject(
            code=payload["code"].upper(),
            name=payload["name"],
            department_id=payload["department_id"],
            semester=payload["semester"],
            total_credits=payload.get("total_credits", 4)
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
        log_audit_event(db, "EXECUTE_HOD_CREATE_SUBJECT", "Subject", admin_id, sub.id, {"code": sub.code})
        return {"subject_id": sub.id, "code": sub.code}

    elif request_type == ApprovalRequestType.CREATE_ASSIGNMENT:
        existing = db.query(TeacherSubjectClassAssignment).filter(
            TeacherSubjectClassAssignment.teacher_id == payload["teacher_id"],
            TeacherSubjectClassAssignment.subject_id == payload["subject_id"],
            TeacherSubjectClassAssignment.class_id == payload["class_id"]
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Assignment already exists")
        a = TeacherSubjectClassAssignment(
            teacher_id=payload["teacher_id"],
            subject_id=payload["subject_id"],
            class_id=payload["class_id"]
        )
        db.add(a)
        db.commit()
        db.refresh(a)
        log_audit_event(db, "EXECUTE_HOD_CREATE_ASSIGNMENT", "Assignment", admin_id, a.id, {
            "teacher_id": a.teacher_id, "subject_id": a.subject_id, "class_id": a.class_id
        })
        return {"assignment_id": a.id}

    elif request_type == ApprovalRequestType.DELETE_ASSIGNMENT:
        assignment_id = payload["assignment_id"]
        a = db.query(TeacherSubjectClassAssignment).filter(TeacherSubjectClassAssignment.id == assignment_id).first()
        if not a:
            raise HTTPException(status_code=404, detail="Assignment not found")
        db.delete(a)
        db.commit()
        log_audit_event(db, "EXECUTE_HOD_DELETE_ASSIGNMENT", "Assignment", admin_id, assignment_id)
        return {"deleted_assignment_id": assignment_id}

    raise HTTPException(status_code=400, detail="Unknown approval request type")


@router.get("/approvals", response_model=List[HODApprovalRequestOut])
def get_approval_requests(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_hod)
):
    """
    Get approval requests.
    - Admins see all requests.
    - HODs see requests submitted by themselves (or department-scoped).
    """
    query = db.query(HODApprovalRequest)
    if current_user.role != UserRole.ADMIN:
        # HOD view: show their submitted requests
        query = query.filter(HODApprovalRequest.requested_by_id == current_user.id)
    
    if status_filter and status_filter.upper() in [s.value for s in ApprovalStatus]:
        query = query.filter(HODApprovalRequest.status == ApprovalStatus(status_filter.upper()))
        
    requests = query.order_by(HODApprovalRequest.created_at.desc()).all()
    results = []
    for r in requests:
        try:
            parsed_payload = json.loads(r.payload_json)
        except Exception:
            parsed_payload = {}
        
        req_name = "Unknown"
        if r.requested_by:
            if r.requested_by.teacher_profile:
                req_name = f"{r.requested_by.teacher_profile.full_name} (HOD)"
            else:
                req_name = r.requested_by.username
                
        rev_name = None
        if r.reviewed_by:
            rev_name = r.reviewed_by.username

        results.append(HODApprovalRequestOut(
            id=r.id,
            request_type=r.request_type,
            status=r.status,
            requested_by_id=r.requested_by_id,
            requested_by_name=req_name,
            title=r.title,
            payload=parsed_payload,
            reviewed_by_id=r.reviewed_by_id,
            reviewed_by_name=rev_name,
            reviewed_at=r.reviewed_at,
            admin_remarks=r.admin_remarks,
            created_at=r.created_at
        ))
    return results


@router.get("/approvals/pending-count")
def get_pending_approval_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_hod)
):
    """Returns number of pending approval requests."""
    query = db.query(HODApprovalRequest).filter(HODApprovalRequest.status == ApprovalStatus.PENDING)
    if current_user.role != UserRole.ADMIN:
        query = query.filter(HODApprovalRequest.requested_by_id == current_user.id)
    count = query.count()
    return {"pending_count": count}


@router.post("/approvals/{request_id}/approve")
def approve_request(
    request_id: int,
    review_in: HODApprovalRequestReview,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Admin confirms and executes a pending request submitted by an HOD.
    """
    req = db.query(HODApprovalRequest).filter(HODApprovalRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found")
    if req.status != ApprovalStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Request is already {req.status.value}")

    try:
        payload = json.loads(req.payload_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request payload JSON")

    # Execute underlying database modification
    result = execute_approval_payload(req.request_type, payload, db, admin.id)

    req.status = ApprovalStatus.APPROVED
    req.reviewed_by_id = admin.id
    req.reviewed_at = datetime.now(timezone.utc)
    req.admin_remarks = review_in.remarks or "Approved and applied."
    db.commit()

    log_audit_event(
        db,
        action="ADMIN_APPROVE_HOD_REQUEST",
        entity_type="HODApprovalRequest",
        user_id=admin.id,
        entity_id=req.id,
        details={"request_type": req.request_type.value, "title": req.title, "result": result}
    )

    return {"message": f"Request '{req.title}' successfully approved and applied.", "status": req.status.value}


@router.post("/approvals/{request_id}/reject")
def reject_request(
    request_id: int,
    review_in: HODApprovalRequestReview,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Admin rejects an HOD request with optional feedback remarks.
    """
    req = db.query(HODApprovalRequest).filter(HODApprovalRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found")
    if req.status != ApprovalStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Request is already {req.status.value}")

    req.status = ApprovalStatus.REJECTED
    req.reviewed_by_id = admin.id
    req.reviewed_at = datetime.now(timezone.utc)
    req.admin_remarks = review_in.remarks or "Rejected by administrator."
    db.commit()

    log_audit_event(
        db,
        action="ADMIN_REJECT_HOD_REQUEST",
        entity_type="HODApprovalRequest",
        user_id=admin.id,
        entity_id=req.id,
        details={"request_type": req.request_type.value, "title": req.title, "remarks": req.admin_remarks}
    )

    return {"message": f"Request '{req.title}' has been rejected.", "status": req.status.value}
