import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon, Shield, Sparkles, Award } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-6 flex items-center justify-between shadow-sm">
      {/* Brand Title */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold font-heading bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              NeuroFace
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold border border-teal-200">
              AI Deep Learning
            </span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium leading-none">
            Automated Face Recognition Attendance System
          </p>
        </div>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center space-x-4">
        {user?.is_hod && (
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Award className="w-3.5 h-3.5 mr-1 text-amber-600" />
            HOD Elevated Access
          </span>
        )}
        {user?.is_class_advisor && !user?.is_hod && (
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
            <Award className="w-3.5 h-3.5 mr-1 text-teal-600" />
            Class Advisor: {user.advised_class_names?.[0] || 'Active'}
          </span>
        )}

        <div className="flex items-center space-x-3 pl-4 border-l border-slate-200">
          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-600 font-semibold">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-sm font-semibold text-slate-800 leading-tight">
              {user?.full_name || user?.username}
            </div>
            <div className="text-xs text-slate-600 flex items-center space-x-1">
              <Shield className="w-3 h-3 text-teal-600 inline" />
              <span className="font-medium">
                {user?.role === 'TEACHER' && user?.is_hod
                  ? 'HOD / Teacher'
                  : user?.role === 'TEACHER' && user?.is_class_advisor
                  ? `Class Advisor (${user.advised_class_names?.[0] || 'Active'})`
                  : user?.role}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign Out"
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
