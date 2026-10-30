import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon, Shield, Sparkles, Award, Menu, X } from 'lucide-react';

const Navbar = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-3 sm:px-6 flex items-center justify-between shadow-sm">
      {/* Brand & Mobile Hamburger Toggle */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Mobile Sidebar Hamburger Toggle Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl md:hidden transition-colors"
        >
          {isSidebarOpen ? <X className="w-5 h-5 text-teal-600" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20 shrink-0">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-lg sm:text-xl font-bold font-heading bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent truncate">
              NeuroFace
            </span>
            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold border border-teal-200 shrink-0">
              AI Biometrics
            </span>
          </div>
          <p className="hidden md:block text-[11px] text-slate-500 font-medium leading-none truncate">
            Automated Face Recognition Attendance System
          </p>
        </div>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {user?.is_hod && (
          <span className="hidden lg:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
            <Award className="w-3.5 h-3.5 mr-1 text-amber-600" />
            HOD Access
          </span>
        )}
        {user?.is_class_advisor && !user?.is_hod && (
          <span className="hidden lg:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
            <Award className="w-3.5 h-3.5 mr-1 text-teal-600" />
            Class Advisor: {user.advised_class_names?.[0] || 'Active'}
          </span>
        )}

        <div className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-4 border-l border-slate-200">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-semibold text-xs sm:text-sm shrink-0">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden md:block text-left max-w-[140px] lg:max-w-[180px]">
            <div className="text-xs sm:text-sm font-semibold text-slate-800 leading-tight truncate">
              {user?.full_name || user?.username}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center space-x-1 truncate">
              <Shield className="w-3 h-3 text-teal-600 inline shrink-0" />
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
          className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
