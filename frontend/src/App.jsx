import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoleGuard } from './components/common/RoleGuard';
import DashboardLayout from './components/layout/DashboardLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AcademicSetupPage from './pages/admin/AcademicSetupPage';
import TeachersPage from './pages/admin/TeachersPage';
import StudentsPage from './pages/admin/StudentsPage';
import AssignmentsPage from './pages/admin/AssignmentsPage';
import FineRulesPage from './pages/admin/FineRulesPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import DatabaseExplorerPage from './pages/admin/DatabaseExplorerPage';
import ApprovalsPage from './pages/admin/ApprovalsPage';

import TeacherDashboard from './pages/teacher/TeacherDashboard';
import StartSessionPage from './pages/teacher/StartSessionPage';
import LiveAttendancePage from './pages/teacher/LiveAttendancePage';
import TeacherLeavesPage from './pages/teacher/TeacherLeavesPage';
import HODOversightPage from './pages/teacher/HODOversightPage';
import MedicalWaiverPage from './pages/teacher/MedicalWaiverPage';
import HODMyRequestsPage from './pages/teacher/HODMyRequestsPage';

import StudentDashboard from './pages/student/StudentDashboard';
import FaceRegistrationPage from './pages/student/FaceRegistrationPage';
import MyAttendancePage from './pages/student/MyAttendancePage';
import ApplyLeavePage from './pages/student/ApplyLeavePage';
import AttendanceHistoryPage from './pages/student/AttendanceHistoryPage';

const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'TEACHER') return <Navigate to="/teacher" replace />;
  if (user.role === 'STUDENT') return <Navigate to="/student" replace />;
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RootRedirect />} />

          {/* ADMIN & HOD PROTECTED ROUTES */}
          <Route
            path="/admin"
            element={
              <RoleGuard allowedRoles={['ADMIN']} allowHod={true}>
                <DashboardLayout />
              </RoleGuard>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="academic" element={<AcademicSetupPage />} />
            <Route path="teachers" element={<TeachersPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="assignments" element={<AssignmentsPage />} />
            <Route path="fine-rules" element={<Navigate to="/admin" replace />} />
            <Route path="database" element={<DatabaseExplorerPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
          </Route>

          {/* TEACHER & HOD PROTECTED ROUTES */}
          <Route
            path="/teacher"
            element={
              <RoleGuard allowedRoles={['TEACHER']}>
                <DashboardLayout />
              </RoleGuard>
            }
          >
            <Route index element={<TeacherDashboard />} />
            <Route path="start-session" element={<StartSessionPage />} />
            <Route path="live-session/:sessionId" element={<LiveAttendancePage />} />
            <Route path="leaves" element={<TeacherLeavesPage />} />

            {/* HOD-Only Elevated Routes */}
            <Route
              path="hod-overview"
              element={
                <RoleGuard allowedRoles={['TEACHER']} requireHod={true}>
                  <HODOversightPage />
                </RoleGuard>
              }
            />
            <Route
              path="medical-waivers"
              element={
                <RoleGuard allowedRoles={['TEACHER']} requireHod={true}>
                  <MedicalWaiverPage />
                </RoleGuard>
              }
            />
            <Route
              path="my-requests"
              element={
                <RoleGuard allowedRoles={['TEACHER']} requireHod={true}>
                  <HODMyRequestsPage />
                </RoleGuard>
              }
            />
          </Route>

          {/* STUDENT PROTECTED ROUTES */}
          <Route
            path="/student"
            element={
              <RoleGuard allowedRoles={['STUDENT']}>
                <DashboardLayout />
              </RoleGuard>
            }
          >
            <Route index element={<StudentDashboard />} />
            <Route path="register-face" element={<FaceRegistrationPage />} />
            <Route path="my-attendance" element={<MyAttendancePage />} />
            <Route path="apply-leave" element={<ApplyLeavePage />} />
            <Route path="history" element={<AttendanceHistoryPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
