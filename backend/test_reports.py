import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi import HTTPException

import app.database.base
from app.api.v1.reports import require_student_report_access
from app.models.user import TeacherDesignation, UserRole
from app.schemas.reports import StudentAttendanceReport
from app.services.report_service import generate_student_report_pdf


class StudentReportTests(unittest.TestCase):
    def setUp(self):
        self.db = MagicMock()
        self.student = SimpleNamespace(id=7, class_id=3, department_id=2)

    def test_teacher_can_access_assigned_class_student(self):
        teacher = SimpleNamespace(
            role=UserRole.TEACHER,
            teacher_profile=SimpleNamespace(id=11, designation=TeacherDesignation.ASSISTANT_PROFESSOR)
        )
        self.db.query.return_value.filter.return_value.first.return_value = (1,)

        require_student_report_access(self.db, teacher, self.student)

    def test_teacher_cannot_access_unassigned_class_student(self):
        teacher = SimpleNamespace(
            role=UserRole.TEACHER,
            teacher_profile=SimpleNamespace(id=11, designation=TeacherDesignation.ASSISTANT_PROFESSOR)
        )
        self.db.query.return_value.filter.return_value.first.return_value = None

        with self.assertRaises(HTTPException) as raised:
            require_student_report_access(self.db, teacher, self.student)
        self.assertEqual(raised.exception.status_code, 403)

    def test_hod_can_access_only_department_students(self):
        hod = SimpleNamespace(
            role=UserRole.TEACHER,
            teacher_profile=SimpleNamespace(
                id=12,
                department_id=2,
                designation=TeacherDesignation.HOD
            )
        )
        require_student_report_access(self.db, hod, self.student)

        other_department_student = SimpleNamespace(id=8, class_id=4, department_id=5)
        with self.assertRaises(HTTPException) as raised:
            require_student_report_access(self.db, hod, other_department_student)
        self.assertEqual(raised.exception.status_code, 403)

    def test_student_can_access_only_own_report(self):
        student_user = SimpleNamespace(
            role=UserRole.STUDENT,
            student_profile=SimpleNamespace(id=7)
        )
        require_student_report_access(self.db, student_user, self.student)

        other_student = SimpleNamespace(id=8, class_id=3, department_id=2)
        with self.assertRaises(HTTPException) as raised:
            require_student_report_access(self.db, student_user, other_student)
        self.assertEqual(raised.exception.status_code, 403)

    def test_pdf_export_returns_pdf_document(self):
        report = StudentAttendanceReport(
            student_id=7,
            register_number="NF-007",
            student_name="A & B Student",
            class_id=3,
            class_name="MCA <S3>",
            department_name="Computer Science",
            overall_attendance_pct=88.5,
            all_subjects_eligible=True,
            subjects=[]
        )

        pdf = generate_student_report_pdf(report)

        self.assertTrue(pdf.startswith(b"%PDF"))
        self.assertGreater(len(pdf), 500)


if __name__ == "__main__":
    unittest.main()
