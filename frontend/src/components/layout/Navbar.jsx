import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon, Shield, GraduationCap, Award, Menu, X, Landmark, ShieldCheck } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

const Navbar = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white dark:bg-[#0e1b2f] border-b border-slate-200 dark:border-[#1e3556] sticky top-0 z-30 px-3 sm:px-6 flex items-center justify-between shadow-sm transition-colors duration-200">
      {/* College Identity & Mobile Navigation Toggle */}
      <div className="flex items-center space-x-2.5 sm:space-x-3.5">
        {/* Mobile Sidebar Hamburger Toggle Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:text-blue-800 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl md:hidden transition-colors"
        >
          {isSidebarOpen ? <X className="w-5 h-5 text-blue-800 dark:text-blue-400" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Collegiate Seal Emblem */}
        <div className="w-10 h-10 rounded-xl bg-blue-900 dark:bg-blue-800 flex items-center justify-center text-white shadow-md shadow-blue-950/20 shrink-0 border border-blue-800 dark:border-blue-700">
          <GraduationCap className="w-5 h-5 text-amber-300" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-lg sm:text-xl font-bold font-heading text-slate-900 dark:text-white tracking-tight truncate">
              NeuroFace
            </span>
            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800/80 uppercase tracking-wide shrink-0">
              Campus ERP • SIS
            </span>
          </div>
          <p className="hidden md:block text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none truncate mt-0.5">
            Department of Computer Applications • Academic Session 2025–2026
          </p>
        </div>
      </div>

      {/* User Info & Academic Credential Badges */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {user?.is_hod && (
          <span className="hidden lg:inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 shadow-xs shrink-0">
            <Award className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
            Head of Department (HOD)
          </span>
        )}
        {user?.is_class_advisor && !user?.is_hod && (
          <span className="hidden lg:inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
            <Award className="w-3.5 h-3.5 mr-1 text-blue-700 dark:text-blue-400" />
            Class Advisor: {user.advised_class_names?.[0] || 'Active'}
          </span>
        )}

        {/* Dark / Light Theme Toggle Button */}
        <ThemeToggle />

        <div className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-900 dark:bg-blue-800 text-amber-300 font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-xs border border-blue-700">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden md:block text-left max-w-[140px] lg:max-w-[180px]">
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
              {user?.full_name || user?.username}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 truncate mt-0.5">
              <ShieldCheck className="w-3 h-3 text-blue-700 dark:text-blue-400 inline shrink-0" />
              <span className="truncate font-semibold">
                {user?.role === 'TEACHER' && user?.is_hod
                  ? 'HOD / Faculty Member'
                  : user?.role === 'TEACHER' && user?.is_class_advisor
                  ? `Advisor (${user.advised_class_names?.[0] || 'Class'})`
                  : user?.role === 'ADMIN'
                  ? 'University Registrar'
                  : user?.role === 'STUDENT'
                  ? 'Enrolled Student'
                  : user?.role}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign Out of Campus Portal"
          className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors shrink-0"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
