import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Clock,
  Camera, FileText, CheckSquare, Settings, Activity,
  FileCheck2, ShieldAlert, Sliders, History, Database
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();
  const role = user?.role;
  const isHod = user?.is_hod;

  const linkClass = ({ isActive }) =>
    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* ADMIN NAVIGATION */}
        {role === 'ADMIN' && (
          <div>
            <div className="px-3 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              System Administration
            </div>
            <nav className="space-y-1">
              <NavLink to="/admin" end className={linkClass}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </NavLink>
              <NavLink to="/admin/academic" className={linkClass}>
                <BookOpen className="w-4 h-4" />
                <span>Academic Setup</span>
              </NavLink>
              <NavLink to="/admin/teachers" className={linkClass}>
                <Users className="w-4 h-4" />
                <span>Teachers & HODs</span>
              </NavLink>
              <NavLink to="/admin/students" className={linkClass}>
                <GraduationCap className="w-4 h-4" />
                <span>Manage Students</span>
              </NavLink>
              <NavLink to="/admin/assignments" className={linkClass}>
                <CheckSquare className="w-4 h-4" />
                <span>Teacher Assignments</span>
              </NavLink>
              <NavLink to="/admin/fine-rules" className={linkClass}>
                <Sliders className="w-4 h-4" />
                <span>Fine & 85% Rules</span>
              </NavLink>
              <NavLink to="/admin/database" className={linkClass}>
                <Database className="w-4 h-4" />
                <span>Database Explorer</span>
              </NavLink>
              <NavLink to="/admin/audit-logs" className={linkClass}>
                <Activity className="w-4 h-4" />
                <span>Audit Logs</span>
              </NavLink>
            </nav>
          </div>
        )}

        {/* TEACHER NAVIGATION */}
        {role === 'TEACHER' && (
          <div>
            <div className="px-3 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Faculty Portal
            </div>
            <nav className="space-y-1">
              <NavLink to="/teacher" end className={linkClass}>
                <LayoutDashboard className="w-4 h-4" />
                <span>My Dashboard</span>
              </NavLink>
              <NavLink to="/teacher/start-session" className={linkClass}>
                <Camera className="w-4 h-4" />
                <span>Start Live Attendance</span>
              </NavLink>
              <NavLink to="/teacher/leaves" className={linkClass}>
                <FileText className="w-4 h-4" />
                <span>Review Leaves & OCR</span>
              </NavLink>
            </nav>

            {/* HOD CONDITIONAL ELEVATION SECTION */}
            {isHod && (
              <div className="mt-6 pt-5 border-t border-slate-200">
                <div className="px-3 flex items-center space-x-2 text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>HOD Department Tools</span>
                </div>
                <nav className="space-y-1">
                  <NavLink to="/teacher/hod-overview" className={linkClass}>
                    <Activity className="w-4 h-4" />
                    <span>Dept Oversight</span>
                  </NavLink>
                  <NavLink to="/teacher/medical-waivers" className={linkClass}>
                    <FileCheck2 className="w-4 h-4" />
                    <span>Approve Medical Waivers</span>
                  </NavLink>
                </nav>
              </div>
            )}
          </div>
        )}

        {/* STUDENT NAVIGATION */}
        {role === 'STUDENT' && (
          <div>
            <div className="px-3 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Student Portal
            </div>
            <nav className="space-y-1">
              <NavLink to="/student" end className={linkClass}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Overview</span>
              </NavLink>
              <NavLink to="/student/register-face" className={linkClass}>
                <Camera className="w-4 h-4 text-teal-600" />
                <span>Face Biometric Setup</span>
              </NavLink>
              <NavLink to="/student/my-attendance" className={linkClass}>
                <CheckSquare className="w-4 h-4" />
                <span>Subject Attendance (85%)</span>
              </NavLink>
              <NavLink to="/student/apply-leave" className={linkClass}>
                <FileText className="w-4 h-4" />
                <span>Submit Leave & OCR</span>
              </NavLink>
              <NavLink to="/student/history" className={linkClass}>
                <History className="w-4 h-4" />
                <span>Attendance History</span>
              </NavLink>
            </nav>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
        <div className="font-semibold text-slate-700">NeuroFace System</div>
        <div>Model: MTCNN + ArcFace 512-D</div>
        <div className="text-[10px] text-teal-600 font-medium mt-1">Status: Neural Engine Online</div>
      </div>
    </aside>
  );
};

export default Sidebar;
