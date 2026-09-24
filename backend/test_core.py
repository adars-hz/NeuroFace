import os
import sys
import numpy as np

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import app.database.base  # Register all models in SQLAlchemy registry
from app.database.session import SessionLocal
from app.models.user import User, UserRole, TeacherDesignation
from app.models.leave import FineRule, MedicalWaiver
from app.services.attendance_calculator import calculate_student_full_report, calculate_student_subject_attendance
from app.ai.detector import face_detector
from app.ai.recognizer import face_recognizer
from app.ai.quality import evaluate_face_quality
from app.core.security import verify_password

def run_tests():
    print("=== RUNNING NEUROFACE BACKEND CORE VERIFICATION TESTS ===")
    db = SessionLocal()

    # Test 1: User credentials & roles
    admin = db.query(User).filter(User.username == "admin").first()
    assert admin is not None, "Admin user should exist"
    assert verify_password("AdminPassword123!", admin.password_hash), "Admin password verification failed"
    print("[PASS] Test 1: Admin credential verification")

    # Test 2: Teacher and HOD distinction
    hod_user = db.query(User).filter(User.username == "hod_mca").first()
    prof_rahul = db.query(User).filter(User.username == "prof_rahul").first()
    assert hod_user.role == UserRole.TEACHER, "HOD must have role TEACHER"
    assert hod_user.teacher_profile.is_hod == True, "HOD must have designation HOD"
    assert prof_rahul.role == UserRole.TEACHER, "Rahul must have role TEACHER"
    assert prof_rahul.teacher_profile.is_hod == False, "Rahul must NOT have designation HOD"
    print("[PASS] Test 2: Teacher and HOD role separation (single TEACHER role, HOD designation)")

    # Test 3: Attendance percentage & eligibility calculations
    # Student 1: Arun (Eligible >= 85%)
    stu_arun = db.query(User).filter(User.username == "student_arun").first().student_profile
    report_arun = calculate_student_full_report(db, stu_arun.id)
    ml_stat_arun = next(s for s in report_arun.subjects if s.subject_code == "MCA301")
    expected_arun_pct = round((ml_stat_arun.present_classes / ml_stat_arun.total_classes) * 100, 2)
    assert ml_stat_arun.raw_attendance_pct == expected_arun_pct, f"Expected {expected_arun_pct}%, got {ml_stat_arun.raw_attendance_pct}"
    assert ml_stat_arun.is_eligible == (ml_stat_arun.effective_attendance_pct >= 85.0), "Arun eligibility mismatch"
    print(f"[PASS] Test 3: Arun attendance = {ml_stat_arun.effective_attendance_pct}% (Eligible: {ml_stat_arun.is_eligible})")

    # Student 2: Priya (Condonation with fine if 75 <= pct < 85)
    stu_priya = db.query(User).filter(User.username == "student_priya").first().student_profile
    report_priya = calculate_student_full_report(db, stu_priya.id)
    ml_stat_priya = next(s for s in report_priya.subjects if s.subject_code == "MCA301")
    expected_priya_pct = round((ml_stat_priya.present_classes / ml_stat_priya.total_classes) * 100, 2)
    assert ml_stat_priya.raw_attendance_pct == expected_priya_pct, f"Expected {expected_priya_pct}%, got {ml_stat_priya.raw_attendance_pct}"
    print(f"[PASS] Test 4: Priya attendance = {ml_stat_priya.effective_attendance_pct}% (Status: {ml_stat_priya.fine_status})")

    # Student 3: Rohit (Detained if < 75%)
    stu_rohit = db.query(User).filter(User.username == "student_rohit").first().student_profile
    report_rohit = calculate_student_full_report(db, stu_rohit.id)
    ml_stat_rohit = next(s for s in report_rohit.subjects if s.subject_code == "MCA301")
    expected_rohit_pct = round((ml_stat_rohit.present_classes / ml_stat_rohit.total_classes) * 100, 2)
    assert ml_stat_rohit.raw_attendance_pct == expected_rohit_pct, f"Expected {expected_rohit_pct}%, got {ml_stat_rohit.raw_attendance_pct}"
    print(f"[PASS] Test 5: Rohit attendance = {ml_stat_rohit.effective_attendance_pct}% (Status: {ml_stat_rohit.fine_status})")

    # Test 6: Medical Waiver Impact
    # Clean up any existing test waivers for Rohit first
    db.query(MedicalWaiver).filter(MedicalWaiver.student_id == stu_rohit.id).delete()
    db.commit()

    # Grant Rohit a medical waiver for 2 classes in MCA301
    waiver = MedicalWaiver(
        student_id=stu_rohit.id,
        subject_id=ml_stat_rohit.subject_id,
        waived_classes_count=2,
        applied_rule="HOD_MEDICAL_WAIVER_ADD_PRESENT",
        approved_by=hod_user.id,
        remarks="Approved 2 medical waiver classes for viral fever"
    )
    db.add(waiver)
    db.commit()

    # Recalculate Rohit's attendance
    report_rohit_after = calculate_student_full_report(db, stu_rohit.id)
    ml_stat_after = next(s for s in report_rohit_after.subjects if s.subject_code == "MCA301")
    expected_waiver_pct = min(100.0, round(((ml_stat_rohit.present_classes + 2) / ml_stat_rohit.total_classes) * 100, 2))
    assert ml_stat_after.effective_attendance_pct == expected_waiver_pct, f"Expected {expected_waiver_pct}% after waiver, got {ml_stat_after.effective_attendance_pct}"
    assert ml_stat_after.is_eligible == (ml_stat_after.effective_attendance_pct >= 85.0), "Rohit eligibility mismatch after waiver"
    print(f"[PASS] Test 6: Rohit attendance after HOD medical waiver = {ml_stat_after.effective_attendance_pct}% (Eligible: {ml_stat_after.is_eligible})")

    # Test 7: AI Facial Quality and Embedding Dimensions
    dummy_face = np.full((112, 112, 3), 120, dtype=np.uint8)
    emb = face_recognizer.extract_embedding(dummy_face)
    assert emb.shape == (512,), f"Embedding vector must be exactly 512-D, got {emb.shape}"
    norm = np.linalg.norm(emb)
    assert abs(norm - 1.0) < 1e-4, f"Embedding must be L2 unit normalized, got norm {norm}"
    print(f"[PASS] Test 7: ArcFace embedding extracted with shape {emb.shape} and unit norm {norm:.4f}")

    db.close()
    print("\n=======================================================")
    print("ALL 7 CORE VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
