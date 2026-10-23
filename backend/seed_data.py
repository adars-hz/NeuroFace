"""Fill the database with the NeuroFace demo data.

Run it with:  python seed_data.py

The same `seed()` function is used by the test suite, so the tests always run
against exactly the data a fresh install would have.
"""

import os
import sys
from datetime import datetime, date, time, timedelta, timezone

# Make sure the backend folder is on the import path.
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session

from app.database.session import SessionLocal, engine
from app.database.base import Base
from app.core.security import get_password_hash
from app.models.user import User, Teacher, Student, UserRole, TeacherDesignation
from app.models.academic import Department, Class, Subject, TeacherSubjectClassAssignment, AttendanceSlot
from app.models.attendance import AttendanceSession, AttendanceRecord, AttendanceSessionStatus, AttendanceStatus, VerificationMethod
from app.models.leave import FineRule

# Passwords used by the demo accounts.
ADMIN_PASSWORD = "AdminPassword123!"
HOD_PASSWORD = "HodPassword123!"
TEACHER_PASSWORD = "TeacherPassword123!"
STUDENT_PASSWORD = "StudentPassword123!"


def seed(db: Session) -> None:
    """Create departments, users, classes and demo attendance in one go."""
    fine_rule = FineRule(
        min_eligible_pct=85.0,
        condonation_min_pct=75.0,
        fine_amount=500.0,
        is_active=True
    )
    db.add(fine_rule)

    # -- Departments, classes and subjects ----------------------------
    dept_mca = Department(code="MCA", name="Master of Computer Applications")
    db.add(dept_mca)
    db.flush()

    cls_mca_s3 = Class(name="MCA S3 (2025-2026)", department_id=dept_mca.id, semester=3, academic_year="2025-2026")
    cls_mca_s1 = Class(name="MCA S1 (2025-2026)", department_id=dept_mca.id, semester=1, academic_year="2025-2026")
    db.add_all([cls_mca_s3, cls_mca_s1])
    db.flush()

    sub_ml = Subject(code="MCA301", name="Machine Learning", department_id=dept_mca.id, semester=3, total_credits=4)
    sub_cloud = Subject(code="MCA302", name="Cloud Computing & DevOps", department_id=dept_mca.id, semester=3, total_credits=4)
    sub_web = Subject(code="MCA303", name="Advanced Web Technologies", department_id=dept_mca.id, semester=3, total_credits=4)
    sub_py = Subject(code="MCA101", name="Python & Data Structures", department_id=dept_mca.id, semester=1, total_credits=4)
    db.add_all([sub_ml, sub_cloud, sub_web, sub_py])
    db.flush()

    # -- Timetable slots ----------------------------------------------
    slot1 = AttendanceSlot(name="Slot 1 (09:00 - 10:00)", start_time=time(9, 0), end_time=time(10, 0))
    slot2 = AttendanceSlot(name="Slot 2 (10:00 - 11:00)", start_time=time(10, 0), end_time=time(11, 0))
    slot3 = AttendanceSlot(name="Slot 3 (11:15 - 12:15)", start_time=time(11, 15), end_time=time(12, 15))
    slot4 = AttendanceSlot(name="Slot 4 (13:15 - 14:15)", start_time=time(13, 15), end_time=time(14, 15))
    db.add_all([slot1, slot2, slot3, slot4])
    db.flush()

    # -- Users ---------------------------------------------------------
    admin_user = User(
        username="admin",
        email="admin@neuroface.edu",
        password_hash=get_password_hash(ADMIN_PASSWORD),
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin_user)
    db.flush()

    hod_user = User(
        username="hod_mca",
        email="hod.mca@neuroface.edu",
        password_hash=get_password_hash(HOD_PASSWORD),
        role=UserRole.TEACHER,
        is_active=True
    )
    db.add(hod_user)
    db.flush()
    teacher_hod = Teacher(
        user_id=hod_user.id,
        teacher_code="T001",
        full_name="Dr. K. R. Ramanathan",
        department_id=dept_mca.id,
        designation=TeacherDesignation.HOD,
        phone="+91 98470 11223"
    )
    db.add(teacher_hod)

    rahul_user = User(
        username="prof_rahul",
        email="rahul.faculty@neuroface.edu",
        password_hash=get_password_hash(TEACHER_PASSWORD),
        role=UserRole.TEACHER,
        is_active=True
    )
    db.add(rahul_user)
    db.flush()
    teacher_rahul = Teacher(
        user_id=rahul_user.id,
        teacher_code="T002",
        full_name="Prof. Rahul Verma",
        department_id=dept_mca.id,
        designation=TeacherDesignation.ASSOCIATE_PROFESSOR,
        phone="+91 98470 22334"
    )
    db.add(teacher_rahul)

    sarah_user = User(
        username="prof_sarah",
        email="sarah.faculty@neuroface.edu",
        password_hash=get_password_hash(TEACHER_PASSWORD),
        role=UserRole.TEACHER,
        is_active=True
    )
    db.add(sarah_user)
    db.flush()
    teacher_sarah = Teacher(
        user_id=sarah_user.id,
        teacher_code="T003",
        full_name="Prof. Sarah Thomas",
        department_id=dept_mca.id,
        designation=TeacherDesignation.ASSISTANT_PROFESSOR,
        phone="+91 98470 33445"
    )
    db.add(teacher_sarah)
    db.flush()

    # -- Which teacher teaches what ------------------------------------
    asg_ml = TeacherSubjectClassAssignment(teacher_id=teacher_rahul.id, subject_id=sub_ml.id, class_id=cls_mca_s3.id)
    asg_cloud = TeacherSubjectClassAssignment(teacher_id=teacher_sarah.id, subject_id=sub_cloud.id, class_id=cls_mca_s3.id)
    asg_web = TeacherSubjectClassAssignment(teacher_id=teacher_hod.id, subject_id=sub_web.id, class_id=cls_mca_s3.id)
    asg_py = TeacherSubjectClassAssignment(teacher_id=teacher_rahul.id, subject_id=sub_py.id, class_id=cls_mca_s1.id)
    db.add_all([asg_ml, asg_cloud, asg_web, asg_py])
    db.flush()

    # -- Students -------------------------------------------------------
    students_data = [
        ("student_arun", "arun@neuroface.edu", "Arun Kumar", "MCA2024001", cls_mca_s3.id),
        ("student_priya", "priya@neuroface.edu", "Priya Nair", "MCA2024002", cls_mca_s3.id),
        ("student_rohit", "rohit@neuroface.edu", "Rohit Sharma", "MCA2024003", cls_mca_s3.id),
        ("student_ananya", "ananya@neuroface.edu", "Ananya Das", "MCA2024004", cls_mca_s3.id),
    ]

    students = []
    for username, email, full_name, register_number, class_id in students_data:
        user = User(
            username=username,
            email=email,
            password_hash=get_password_hash(STUDENT_PASSWORD),
            role=UserRole.STUDENT,
            is_active=True
        )
        db.add(user)
        db.flush()
        student = Student(
            user_id=user.id,
            register_number=register_number,
            full_name=full_name,
            department_id=dept_mca.id,
            class_id=class_id,
            face_registered=False,
            phone="+91 99950 12345"
        )
        db.add(student)
        db.flush()
        students.append(student)

    # -- 10 finished Machine Learning lectures with known attendance ----
    # Arun 9/10 (90% - eligible), Priya 8/10 (80% - fine),
    # Rohit 7/10 (70% - detained), Ananya 10/10 (100% - eligible).
    present_counts = [9, 8, 7, 10]
    base_date = date.today() - timedelta(days=15)

    for lecture in range(10):
        lecture_date = base_date + timedelta(days=lecture)
        session = AttendanceSession(
            assignment_id=asg_ml.id,
            teacher_id=teacher_rahul.id,
            slot_id=slot1.id,
            session_date=lecture_date,
            start_time=datetime.combine(lecture_date, time(9, 0), tzinfo=timezone.utc),
            end_time=datetime.combine(lecture_date, time(10, 0), tzinfo=timezone.utc),
            status=AttendanceSessionStatus.COMPLETED
        )
        db.add(session)
        db.flush()

        for index, student in enumerate(students):
            was_present = lecture < present_counts[index]
            db.add(AttendanceRecord(
                session_id=session.id,
                student_id=student.id,
                status=AttendanceStatus.PRESENT if was_present else AttendanceStatus.ABSENT,
                verification_method=VerificationMethod.FACE_RECOGNITION
            ))

    db.commit()


def main() -> None:
    """Create the tables (if needed) and fill them with the demo data."""
    print("[Seed] Synchronizing database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if db.query(User).filter(User.username == "admin").first():
            print("[Seed] Database already seeded with admin account. Skipping.")
            return

        print("[Seed] Creating demo data...")
        seed(db)
        print("[Seed] Successfully completed database seeding!")
    finally:
        db.close()


if __name__ == "__main__":
    main()
