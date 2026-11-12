import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Sparkles,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound,
  RotateCcw,
  Scan,
  Building2,
  Check
} from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';

const LoginPage = () => {
  // Mode: 'login' | 'reset'
  const [mode, setMode] = useState('login');

  // Sign In Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  // Reset Password Form States
  const [resetUsername, setResetUsername] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  // Authentication Execution
  const performLogin = async (u, p) => {
    const cleanUser = (u || '').trim();
    const cleanPass = (p || '').trim();
    if (!cleanUser || !cleanPass) {
      setError('Please provide both username/email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await login(cleanUser, cleanPass);
      if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'TEACHER') navigate('/teacher');
      else if (user.role === 'STUDENT') navigate('/student');
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (!err.response || err.response?.status === 503) {
        setError('Backend services are warming up. Please try again in a few moments.');
      } else {
        setError('Invalid credentials. Check your username/password or use password reset.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    await performLogin(username, password);
  };

  const quickLogin = async (u, p) => {
    setUsername(u);
    setPassword(p);
    await performLogin(u, p);
  };

  // Password Reset Execution
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const cleanIdent = (resetUsername || '').trim();
    const cleanNewPwd = (resetNewPassword || '').trim();
    const cleanConfirm = (resetConfirmPassword || '').trim();

    if (!cleanIdent) {
      setResetError('Please enter your registered username or university email.');
      return;
    }
    if (cleanNewPwd.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }
    if (cleanNewPwd !== cleanConfirm) {
      setResetError('New passwords do not match. Please re-enter.');
      return;
    }

    setResetError('');
    setResetSuccess('');
    setResetLoading(true);

    try {
      const res = await api.post('/auth/reset-password', {
        username_or_email: cleanIdent,
        new_password: cleanNewPwd
      });
      setResetSuccess(res.data?.message || 'Password has been successfully updated.');
      setUsername(cleanIdent);
      setPassword('');
      setResetNewPassword('');
      setResetConfirmPassword('');
    } catch (err) {
      setResetError(
        err.response?.data?.detail || 'Unable to reset password. Please verify your credentials or contact IT support.'
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Top Institutional Header Bar */}
      <header className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight font-heading text-slate-900 dark:text-white">
                NeuroFace
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Institutional Edition
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none hidden md:block">
              Departmental Facial Biometrics & Automated Attendance Platform
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Security & System Status Indicators */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">
              256-Bit SSL Encrypted
            </span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Network Online</span>
          </div>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Dual-Column Section */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-10 gap-8 items-center justify-center">
        {/* Left Column: Institutional Value Showcase */}
        <div className="w-full md:w-1/2 space-y-6 lg:pr-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Smart Campus Biometrics</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              Intelligent Facial Recognition & Attendance System
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              Automated high-throughput classroom roll-calls, real-time presentation attack defense, and continuous academic leave auditing.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                <Scan className="w-4 h-4 shrink-0" />
                <span className="font-bold text-xs uppercase tracking-wide text-slate-900 dark:text-white">
                  Multi-Face Roll-Call
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Parallel classroom detection identifies multiple students simultaneously in under 100 milliseconds.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="font-bold text-xs uppercase tracking-wide text-slate-900 dark:text-white">
                  Anti-Spoofing Defense
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Zero-proxy liveness verification rejects photos, mobile screens, and prerecorded video spoofing.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5">
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="font-bold text-xs uppercase tracking-wide text-slate-900 dark:text-white">
                  Automated OCR Leaves
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Extracts physician notes and medical waiver dates automatically to update attendance criteria.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5">
              <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-bold text-xs uppercase tracking-wide text-slate-900 dark:text-white">
                  85% Compliance Tracker
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Dynamic threshold monitoring alerts students and faculty before minimum attendance breaches.
              </p>
            </div>
          </div>

          {/* Compliance & Standards Footer */}
          <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
            <span className="flex items-center">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-1" />
              Role-Based Access
            </span>
            <span className="flex items-center">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-1" />
              Audit Log Tracing
            </span>
            <span className="flex items-center">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-1" />
              High Availability
            </span>
          </div>
        </div>

        {/* Right Column: High-Grade Authentication Card */}
        <div className="w-full md:w-1/2 max-w-md">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-none space-y-6">
            {/* Header Tabs: Sign In / Reset Password */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                  {mode === 'login' ? 'Institutional Sign In' : 'Account Recovery'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {mode === 'login'
                    ? 'Enter your institutional credentials to continue'
                    : 'Reset your password with your registered account identifier'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'reset' : 'login');
                  setError('');
                  setResetError('');
                  setResetSuccess('');
                }}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 transition-colors"
              >
                {mode === 'login' ? 'Reset Password' : 'Back to Sign In'}
              </button>
            </div>

            {/* Error & Success Feedback Banners */}
            {mode === 'login' && error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'reset' && resetError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span>{resetError}</span>
              </div>
            )}

            {mode === 'reset' && resetSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <div className="space-y-1">
                  <p className="font-semibold">{resetSuccess}</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    You may now switch to Sign In and log in with your updated credentials.
                  </p>
                </div>
              </div>
            )}

            {/* 1. SIGN IN FORM */}
            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Username or Institutional Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. admin or faculty@neuroface.edu"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:border-transparent text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('reset');
                        setResetUsername(username);
                        setError('');
                      }}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:border-transparent text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-md shadow-indigo-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 active:scale-[0.99]"
                >
                  <span>{loading ? 'Authenticating User...' : 'Sign In to Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* 2. RESET PASSWORD FORM */
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Registered Username or Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={resetUsername}
                      onChange={(e) => setResetUsername(e.target.value)}
                      placeholder="e.g. admin or your username"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:border-transparent text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:border-transparent text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                    Must be at least 6 characters long
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:border-transparent text-sm transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-md shadow-indigo-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 active:scale-[0.99]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{resetLoading ? 'Resetting Password...' : 'Save New Password'}</span>
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setResetError('');
                      setResetSuccess('');
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                  >
                    &larr; Return to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* Discreet Quick Role Selector for Evaluator Demonstration */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setShowDemo(!showDemo)}
                className="text-xs text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 font-medium transition-colors"
              >
                {showDemo ? 'Hide Quick Demo Logins' : 'Quick Demo Logins ▾'}
              </button>
              {showDemo && (
                <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      quickLogin('admin', 'admin123');
                    }}
                    className="py-2 px-1 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors border border-slate-200 dark:border-slate-700 text-center truncate"
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      quickLogin('hod_mca', 'teacher123');
                    }}
                    className="py-2 px-1 rounded-xl bg-slate-50 hover:bg-amber-50 hover:text-amber-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors border border-slate-200 dark:border-slate-700 text-center truncate"
                  >
                    HOD
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      quickLogin('prof_rahul', 'teacher123');
                    }}
                    className="py-2 px-1 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors border border-slate-200 dark:border-slate-700 text-center truncate"
                  >
                    Faculty
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      quickLogin('student_arun', 'student123');
                    }}
                    className="py-2 px-1 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors border border-slate-200 dark:border-slate-700 text-center truncate"
                  >
                    Student
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global Minimal Footer */}
      <footer className="w-full border-t border-slate-200/80 dark:border-slate-800 py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} NeuroFace Identity & Attendance Systems. All rights reserved.</span>
          <div className="flex items-center space-x-4">
            <span className="hover:text-slate-700 dark:hover:text-slate-300">Privacy Policy</span>
            <span>&bull;</span>
            <span className="hover:text-slate-700 dark:hover:text-slate-300">Terms of Service</span>
            <span>&bull;</span>
            <span className="hover:text-slate-700 dark:hover:text-slate-300">Campus IT Helpdesk</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
