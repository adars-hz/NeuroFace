import os
import sys
from datetime import datetime, date, time, timedelta, timezone

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.session import SessionLocal, engine
from app.database.base import Base
from app.core.security import get_password_hash
from app.models.user import User, Teacher, Student, UserRole, TeacherDesignation
from app.models.academic import Department, Class, Subject, TeacherSubjectClassAssignment, AttendanceSlot
from app.models.attendance import AttendanceSession, AttendanceRecord, AttendanceSessionStatus, AttendanceStatus, VerificationMethod
from app.models.leave import FineRule, LeaveApplication, LeaveStatus

def seed():
    print("[Seed] Synchronizing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if already seeded
    if db.query(User).filter(User.username == "admin").first():
        print("[Seed] Database already seeded with admin account. Skipping.")
        db.close()
        return

    print("[Seed] Creating Institutional Rules...")
    fine_rule = FineRule(
        min_eligible_pct=85.0,
        condonation_min_pct=75.0,
        fine_amount=500.0,
        is_active=True
    )
    db.add(fine_rule)

    print("[Seed] Creating Academic Entities...")
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

    print("[Seed] Creating Timetable Slots...")
    slot1 = AttendanceSlot(name="Slot 1 (09:00 - 10:00)", start_time=time(9, 0), end_time=time(10, 0))
    slot2 = AttendanceSlot(name="Slot 2 (10:00 - 11:00)", start_time=time(10, 0), end_time=time(11, 0))
    slot3 = AttendanceSlot(name="Slot 3 (11:15 - 12:15)", start_time=time(11, 15), end_time=time(12, 15))
    slot4 = AttendanceSlot(name="Slot 4 (13:15 - 14:15)", start_time=time(13, 15), end_time=time(14, 15))
    db.add_all([slot1, slot2, slot3, slot4])
    db.flush()

    print("[Seed] Creating Admin User...")
    admin_user = User(
        username="admin",
        email="admin@neuroface.edu",
        password_hash=get_password_hash("AdminPassword123!"),
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin_user)
    db.flush()

    print("[Seed] Creating Faculty & HOD...")
    # 1. HOD Account (Teacher with HOD designation)
    u_hod = User(
        username="hod_mca",
        email="hod.mca@neuroface.edu",
        password_hash=get_password_hash("HodPassword123!"),
        role=UserRole.TEACHER,
        is_active=True
    )
    db.add(u_hod)
    db.flush()
    t_hod = Teacher(
        user_id=u_hod.id,
        teacher_code="T001",
        full_name="Dr. K. R. Ramanathan",
        department_id=dept_mca.id,
        designation=TeacherDesignation.HOD,
        phone="+91 98470 11223"
    )
    db.add(t_hod)

    # 2. Faculty Rahul Verma
    u_rahul = User(
        username="prof_rahul",
        email="rahul.faculty@neuroface.edu",
        password_hash=get_password_hash("TeacherPassword123!"),
        role=UserRole.TEACHER,
        is_active=True
    )
    db.add(u_rahul)
    db.flush()
    t_rahul = Teacher(
        user_id=u_rahul.id,
        teacher_code="T002",
        full_name="Prof. Rahul Verma",
        department_id=dept_mca.id,
        designation=TeacherDesignation.ASSOCIATE_PROFESSOR,
        phone="+91 98470 22334"
    )
    db.add(t_rahul)

    # 3. Faculty Sarah Thomas
    u_sarah = User(
        username="prof_sarah",
        email="sarah.faculty@neuroface.edu",
        password_hash=get_password_hash("TeacherPassword123!"),
        role=UserRole.TEACHER,
        is_active=True
    )
    db.add(u_sarah)
    db.flush()
    t_sarah = Teacher(
        user_id=u_sarah.id,
        teacher_code="T003",
        full_name="Prof. Sarah Thomas",
        department_id=dept_mca.id,
        designation=TeacherDesignation.ASSISTANT_PROFESSOR,
        phone="+91 98470 33445"
    )
    db.add(t_sarah)
    db.flush()

    print("[Seed] Creating Teacher Subject Assignments...")
    # Rahul -> Machine Learning in MCA S3
    asg_ml = TeacherSubjectClassAssignment(teacher_id=t_rahul.id, subject_id=sub_ml.id, class_id=cls_mca_s3.id)
    # Sarah -> Cloud Computing in MCA S3
    asg_cloud = TeacherSubjectClassAssignment(teacher_id=t_sarah.id, subject_id=sub_cloud.id, class_id=cls_mca_s3.id)
    # HOD Ramanathan -> Advanced Web Tech in MCA S3
    asg_web = TeacherSubjectClassAssignment(teacher_id=t_hod.id, subject_id=sub_web.id, class_id=cls_mca_s3.id)
    # Rahul -> Python in MCA S1
    asg_py = TeacherSubjectClassAssignment(teacher_id=t_rahul.id, subject_id=sub_py.id, class_id=cls_mca_s1.id)
    db.add_all([asg_ml, asg_cloud, asg_web, asg_py])
    db.flush()

    print("[Seed] Creating Students in MCA S3...")
    students_data = [
        ("student_arun", "arun@neuroface.edu", "Arun Kumar", "MCA2024001", cls_mca_s3.id),
        ("student_priya", "priya@neuroface.edu", "Priya Nair", "MCA2024002", cls_mca_s3.id),
        ("student_rohit", "rohit@neuroface.edu", "Rohit Sharma", "MCA2024003", cls_mca_s3.id),
        ("student_ananya", "ananya@neuroface.edu", "Ananya Das", "MCA2024004", cls_mca_s3.id),
    ]

    created_students = []
    for uname, uemail, fname, reg, cid in students_data:
        u = User(
            username=uname,
            email=uemail,
            password_hash=get_password_hash("StudentPassword123!"),
            role=UserRole.STUDENT,
            is_active=True
        )
        db.add(u)
        db.flush()
        stu = Student(
            user_id=u.id,
            register_number=reg,
            full_name=fname,
            department_id=dept_mca.id,
            class_id=cid,
            face_registered=False,
            phone="+91 99950 12345"
        )
        db.add(stu)
        db.flush()
        created_students.append(stu)

    print("[Seed] Creating Initial Demonstration Sessions & Attendance Records...")
    # Create 10 completed lecture sessions for Machine Learning to demonstrate calculation logic
    base_date = date.today() - timedelta(days=15)
    for i in range(10):
        s_date = base_date + timedelta(days=i)
        start_dt = datetime.combine(s_date, time(9, 0), tzinfo=timezone.utc)
        end_dt = datetime.combine(s_date, time(10, 0), tzinfo=timezone.utc)
        sess = AttendanceSession(
            assignment_id=asg_ml.id,
            teacher_id=t_rahul.id,
            slot_id=slot1.id,
            session_date=s_date,
            start_time=start_dt,
            end_time=end_dt,
            status=AttendanceSessionStatus.COMPLETED
        )
        db.add(sess)
        db.flush()

        # Arun: 9 out of 10 (90% - Direct Eligible)
        # Priya: 8 out of 10 (80% - Condonation with Fine)
        # Rohit: 7 out of 10 (70% - Detained)
        # Ananya: 10 out of 10 (100% - Direct Eligible)
        if i < 9:
            db.add(AttendanceRecord(session_id=sess.id, student_id=created_students[0].id, status=AttendanceStatus.PRESENT, verification_method=VerificationMethod.FACE_RECOGNITION))
        else:
            db.add(AttendanceRecord(session_id=sess.id, student_id=created_students[0].id, status=AttendanceStatus.ABSENT, verification_method=VerificationMethod.FACE_RECOGNITION))

        if i < 8:
            db.add(AttendanceRecord(session_id=sess.id, student_id=created_students[1].id, status=AttendanceStatus.PRESENT, verification_method=VerificationMethod.FACE_RECOGNITION))
        else:
            db.add(AttendanceRecord(session_id=sess.id, student_id=created_students[1].id, status=AttendanceStatus.ABSENT, verification_method=VerificationMethod.FACE_RECOGNITION))

        if i < 7:
            db.add(AttendanceRecord(session_id=sess.id, student_id=created_students[2].id, status=AttendanceStatus.PRESENT, verification_method=VerificationMethod.FACE_RECOGNITION))
        else:
            db.add(AttendanceRecord(session_id=sess.id, student_id=created_students[2].id, status=AttendanceStatus.ABSENT, verification_method=VerificationMethod.FACE_RECOGNITION))

        db.add(AttendanceRecord(session_id=sess.id, student_id=created_students[3].id, status=AttendanceStatus.PRESENT, verification_method=VerificationMethod.FACE_RECOGNITION))

    db.commit()
    db.close()
    print("[Seed] Successfully completed database seeding!")

if __name__ == "__main__":
    seed()
