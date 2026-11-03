import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon, Shield, Sparkles, Award, Menu, X } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

const Navbar = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-neutral-200 sticky top-0 z-30 px-3 sm:px-6 flex items-center justify-between shadow-sm">
      {/* Brand & Mobile Hamburger Toggle */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Mobile Sidebar Hamburger Toggle Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="p-2 -ml-1 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-xl md:hidden transition-colors"
        >
          {isSidebarOpen ? <X className="w-5 h-5 text-black" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black border border-neutral-800 flex items-center justify-center text-white shadow-sm shrink-0">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-lg sm:text-xl font-bold font-heading text-black tracking-tight truncate">
              NeuroFace
            </span>
            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-black font-semibold border border-neutral-300 shrink-0">
              AI Biometrics
            </span>
          </div>
          <p className="hidden md:block text-[11px] text-neutral-500 font-medium leading-none truncate">
            Automated Face Recognition Attendance System
          </p>
        </div>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {user?.is_hod && (
          <span className="hidden lg:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-black border border-neutral-300 shrink-0">
            <Award className="w-3.5 h-3.5 mr-1 text-black" />
            HOD Access
          </span>
        )}
        {user?.is_class_advisor && !user?.is_hod && (
          <span className="hidden lg:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-black border border-neutral-300 shrink-0">
            <Award className="w-3.5 h-3.5 mr-1 text-black" />
            Class Advisor: {user.advised_class_names?.[0] || 'Active'}
          </span>
        )}

        {/* Dark / Light Theme Toggle Button */}
        <ThemeToggle />

        <div className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-3 border-l border-neutral-200">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black border border-neutral-800 flex items-center justify-center text-white font-semibold text-xs sm:text-sm shrink-0">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden md:block text-left max-w-[140px] lg:max-w-[180px]">
            <div className="text-xs sm:text-sm font-semibold text-neutral-900 leading-tight truncate">
              {user?.full_name || user?.username}
            </div>
            <div className="text-[11px] text-neutral-500 flex items-center space-x-1 truncate">
              <Shield className="w-3 h-3 text-black inline shrink-0" />
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
          className="p-1.5 sm:p-2 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors shrink-0"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
