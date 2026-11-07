import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Clock,
  Camera, FileText, CheckSquare, Settings, Activity,
  FileCheck2, ShieldAlert, Sliders, History, Database, Award,
  Sparkles, X
} from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const role = user?.role;
  const isHod = user?.is_hod;
  const isAdvisor = user?.is_class_advisor;
  const advisedClasses = user?.advised_class_names || [];
  const [pendingCounts, setPendingCounts] = useState({ pending_hod: 0, pending_face: 0, total: 0 });
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);

  useEffect(() => {
    if (isHod || role === 'ADMIN') {
      api.get('/admin/approvals/pending-count')
        .then(res => setPendingCounts({
          pending_hod: res.data.pending_hod_count || 0,
          pending_face: res.data.pending_face_count || 0,
          total: res.data.total_pending || (res.data.pending_count || 0)
        }))
        .catch(() => {});
    }
    if (role === 'TEACHER' || role === 'ADMIN') {
      api.get('/leaves/pending-count')
        .then(res => setPendingLeavesCount(res.data.pending_count || 0))
        .catch(() => {});
    }
  }, [isHod, role]);

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  const linkClass = ({ isActive }) =>
    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-semibold'
        : 'text-slate-600 dark:text-slate-400 hover:bg-indigo-50/70 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400'
    }`;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar - Clean White Background */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-72 md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
          flex flex-col justify-between p-4
          min-h-screen md:min-h-[calc(100vh-4rem)]
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
          overflow-y-auto
        `}
      >
        <div className="space-y-6">
          {/* Mobile Drawer Header */}
          <div className="pb-3 mb-2 border-b border-slate-200 dark:border-slate-800 md:hidden space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold font-heading text-slate-900 dark:text-white text-base">NeuroFace</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* User Profile Pill in Mobile Drawer */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.full_name || user?.username}</div>
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold truncate">
                  {user?.role === 'TEACHER' && user?.is_hod
                    ? 'HOD / Faculty Member'
                    : user?.role === 'TEACHER' && user?.is_class_advisor
                    ? `Class Advisor (${user.advised_class_names?.[0] || 'Active'})`
                    : user?.role}
                </div>
              </div>
            </div>
          </div>

          {/* ADMIN NAVIGATION */}
          {role === 'ADMIN' && (
            <div>
              <div className="px-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                System Administration
              </div>
              <nav className="space-y-1">
                <NavLink to="/admin" end className={linkClass} onClick={handleLinkClick}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Admin Dashboard</span>
                </NavLink>
                <NavLink to="/admin/academic" className={linkClass} onClick={handleLinkClick}>
                  <BookOpen className="w-4 h-4" />
                  <span>Academic Setup</span>
                </NavLink>
                <NavLink to="/admin/teachers" className={linkClass} onClick={handleLinkClick}>
                  <Users className="w-4 h-4" />
                  <span>Teachers & HODs</span>
                </NavLink>
                <NavLink to="/admin/students" className={linkClass} onClick={handleLinkClick}>
                  <GraduationCap className="w-4 h-4" />
                  <span>Manage Students</span>
                </NavLink>
                <NavLink to="/admin/assignments" className={linkClass} onClick={handleLinkClick}>
                  <CheckSquare className="w-4 h-4" />
                  <span>Teacher Assignments</span>
                </NavLink>
                <NavLink to="/admin/fine-rules" className={linkClass} onClick={handleLinkClick}>
                  <Sliders className="w-4 h-4" />
                  <span>Fine & 85% Rules</span>
                </NavLink>
                <NavLink to="/admin/database" className={linkClass} onClick={handleLinkClick}>
                  <Database className="w-4 h-4" />
                  <span>Database Explorer</span>
                </NavLink>
                <NavLink to="/admin/audit-logs" className={linkClass} onClick={handleLinkClick}>
                  <Activity className="w-4 h-4" />
                  <span>Audit Logs</span>
                </NavLink>
                <NavLink to="/admin/approvals" className={linkClass} onClick={handleLinkClick}>
                  <ShieldAlert className="w-4 h-4" />
                  <span className="flex-1">Approvals Queue</span>
                  {pendingCounts.total > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                      {pendingCounts.total}
                    </span>
                  )}
                </NavLink>
              </nav>
            </div>
          )}

          {/* TEACHER NAVIGATION */}
          {role === 'TEACHER' && (
            <div>
              <div className="px-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Faculty Portal
              </div>
              <nav className="space-y-1">
                <NavLink to="/teacher" end className={linkClass} onClick={handleLinkClick}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span>My Dashboard</span>
                </NavLink>
                <NavLink to="/teacher/start-session" className={linkClass} onClick={handleLinkClick}>
                  <Camera className="w-4 h-4" />
                  <span>Start Live Attendance</span>
                </NavLink>
                <NavLink to="/teacher/leaves" className={linkClass} onClick={handleLinkClick}>
                  <FileText className="w-4 h-4" />
                  <span className="flex-1">Review Leaves & OCR</span>
                  {pendingLeavesCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                      {pendingLeavesCount}
                    </span>
                  )}
                </NavLink>
                <NavLink to="/teacher/student-reports" className={linkClass} onClick={handleLinkClick}>
                  <FileCheck2 className="w-4 h-4" />
                  <span>Student Reports</span>
                </NavLink>
              </nav>

              {/* CLASS ADVISOR ELEVATED TOOLS */}
              {isAdvisor && !isHod && (
                <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                  <div className="px-3 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    <div className="flex items-center space-x-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Class Advisor</span>
                    </div>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded-md font-semibold truncate max-w-[100px]" title={advisedClasses.join(', ')}>
                      {advisedClasses[0] || 'Advisor'}
                    </span>
                  </div>
                  <nav className="space-y-1">
                    <NavLink to="/teacher/assignments" className={linkClass} onClick={handleLinkClick}>
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                      <span>Assign Teachers & Slots</span>
                    </NavLink>
                    <NavLink to="/teacher/student-reports" className={linkClass} onClick={handleLinkClick}>
                      <FileCheck2 className="w-4 h-4 text-indigo-600" />
                      <span>Download Class Reports</span>
                    </NavLink>
                  </nav>
                </div>
              )}

              {/* HOD CONDITIONAL ELEVATION SECTION */}
              {isHod && (
                <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                  <div className="px-3 flex items-center space-x-2 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    <span>HOD Department Tools</span>
                  </div>
                  <nav className="space-y-1">
                    <NavLink to="/teacher/hod-overview" className={linkClass} onClick={handleLinkClick}>
                      <Activity className="w-4 h-4" />
                      <span>Dept Oversight</span>
                    </NavLink>
                    <NavLink to="/teacher/medical-waivers" className={linkClass} onClick={handleLinkClick}>
                      <FileCheck2 className="w-4 h-4" />
                      <span>Approve Medical Waivers</span>
                    </NavLink>
                    <NavLink to="/admin/teachers" className={linkClass} onClick={handleLinkClick}>
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>Manage Teachers</span>
                    </NavLink>
                    <NavLink to="/admin/students" className={linkClass} onClick={handleLinkClick}>
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <span>Manage Students</span>
                    </NavLink>
                    <NavLink to="/admin/academic" className={linkClass} onClick={handleLinkClick}>
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      <span>Academic Setup</span>
                    </NavLink>
                    <NavLink to="/admin/assignments" className={linkClass} onClick={handleLinkClick}>
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                      <span>Teacher Assignments</span>
                    </NavLink>
                  </nav>
                </div>
              )}
            </div>
          )}

          {/* STUDENT NAVIGATION */}
          {role === 'STUDENT' && (
            <div>
              <div className="px-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Student Portal
              </div>
              <nav className="space-y-1">
                <NavLink to="/student" end className={linkClass} onClick={handleLinkClick}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Overview</span>
                </NavLink>
                <NavLink to="/student/register-face" className={linkClass} onClick={handleLinkClick}>
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>Face Biometric Setup</span>
                </NavLink>
                <NavLink to="/student/my-attendance" className={linkClass} onClick={handleLinkClick}>
                  <CheckSquare className="w-4 h-4" />
                  <span>Subject Attendance (85%)</span>
                </NavLink>
                <NavLink to="/student/apply-leave" className={linkClass} onClick={handleLinkClick}>
                  <FileText className="w-4 h-4" />
                  <span>Submit Leave & OCR</span>
                </NavLink>
                <NavLink to="/student/history" className={linkClass} onClick={handleLinkClick}>
                  <History className="w-4 h-4" />
                  <span>Attendance History</span>
                </NavLink>
              </nav>
            </div>
          )}
        </div>

        {/* Footer Info & Appearance Switch */}
        <div className="space-y-3 mt-6">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-600 dark:text-slate-400">
            <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Attendance Engine</span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">ACTIVE</span>
            </div>
            <div className="truncate text-[11px] text-slate-500 dark:text-slate-400 mt-1">MTCNN + ArcFace 512-D</div>
            <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium mt-1.5 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Zero-Proxy Verification Ready</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-1 py-0.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Theme</span>
            <ThemeToggle showLabel={true} />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
