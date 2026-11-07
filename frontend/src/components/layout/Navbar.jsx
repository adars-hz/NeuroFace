import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon, Shield, Sparkles, Award, Menu, X } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

const Navbar = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 px-3 sm:px-6 flex items-center justify-between shadow-sm transition-colors duration-200">
      {/* Brand & Mobile Hamburger Toggle */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Mobile Sidebar Hamburger Toggle Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl md:hidden transition-colors"
        >
          {isSidebarOpen ? <X className="w-5 h-5 text-teal-600 dark:text-teal-400" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20 shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-lg sm:text-xl font-bold font-heading bg-gradient-to-r from-slate-900 via-teal-900 to-slate-800 dark:from-white dark:to-teal-200 bg-clip-text text-transparent tracking-tight truncate">
              NeuroFace
            </span>
            <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 font-semibold border border-teal-200 dark:border-teal-800 shrink-0">
              AI Deep Learning
            </span>
          </div>
          <p className="hidden md:block text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none truncate mt-0.5">
            Automated Face Recognition Attendance System
          </p>
        </div>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {user?.is_hod && (
          <span className="hidden lg:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
            <Award className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
            HOD Elevated Access
          </span>
        )}
        {user?.is_class_advisor && !user?.is_hod && (
          <span className="hidden lg:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shrink-0">
            <Award className="w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400" />
            Class Advisor: {user.advised_class_names?.[0] || 'Active'}
          </span>
        )}

        {/* Dark / Light Theme Toggle Button */}
        <ThemeToggle />

        <div className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm shrink-0">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden md:block text-left max-w-[140px] lg:max-w-[180px]">
            <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-white leading-tight truncate">
              {user?.full_name || user?.username}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 truncate mt-0.5">
              <Shield className="w-3 h-3 text-teal-600 dark:text-teal-400 inline shrink-0" />
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
          className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors shrink-0"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
