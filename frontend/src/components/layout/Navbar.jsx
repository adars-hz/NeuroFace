import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon, Shield, Sparkles, Award, Menu, X, ShieldCheck } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

const Navbar = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 px-3 sm:px-6 flex items-center justify-between shadow-xs transition-colors duration-200">
      {/* Brand & Mobile Hamburger Toggle */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Mobile Sidebar Hamburger Toggle Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl md:hidden transition-colors"
        >
          {isSidebarOpen ? <X className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-lg sm:text-xl font-bold font-heading text-slate-900 dark:text-white tracking-tight truncate">
              NeuroFace
            </span>
            <span className="hidden sm:inline-block text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800 shrink-0">
              Attendance Portal
            </span>
          </div>
          <p className="hidden md:block text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none truncate mt-0.5">
            Automated Biometric Attendance & Leave Management
          </p>
        </div>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {user?.is_hod && (
          <span className="hidden lg:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
            <Award className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
            HOD Access
          </span>
        )}
        {user?.is_class_advisor && !user?.is_hod && (
          <span className="hidden lg:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
            <Award className="w-3.5 h-3.5 mr-1 text-indigo-600 dark:text-indigo-400" />
            Class Advisor: {user.advised_class_names?.[0] || 'Active'}
          </span>
        )}

        {/* Dark / Light Theme Toggle Button */}
        <ThemeToggle />

        <div className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden md:block text-left max-w-[140px] lg:max-w-[180px]">
            <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-white leading-tight truncate">
              {user?.full_name || user?.username}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 truncate mt-0.5">
              <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400 inline shrink-0" />
              <span className="truncate font-medium">
                {user?.role === 'TEACHER' && user?.is_hod
                  ? 'HOD / Teacher'
                  : user?.role === 'TEACHER' && user?.is_class_advisor
                  ? `Advisor (${user.advised_class_names?.[0] || 'Active'})`
                  : user?.role}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign Out"
          className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors shrink-0"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
