import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Lock, User, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const performLogin = async (u, p) => {
    const cleanUser = (u || '').trim();
    const cleanPass = (p || '').trim();
    if (!cleanUser || !cleanPass) {
      setError('Please enter both username and password.');
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
        setError('Backend server is starting up. Please wait a few seconds and try again.');
      } else {
        setError('Invalid login credentials. Please try again.');
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

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Left Showcase Banner - Clean & Deploy Ready */}
      <div className="md:w-1/2 p-6 sm:p-8 md:p-12 lg:p-14 flex flex-col justify-between bg-white dark:bg-slate-900 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 transition-colors duration-200">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-heading tracking-tight text-slate-900 dark:text-white">NeuroFace</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Biometric Attendance Portal</p>
            </div>
          </div>
        </div>

        <div className="my-auto py-10 space-y-6 max-w-md">
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-slate-900 dark:text-white leading-tight">
            Fast, Secure & Contactless Attendance.
          </h2>
          
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            Automated facial recognition, anti-spoofing verification, and streamlined attendance records for academic institutions.
          </p>

          <div className="space-y-3 pt-1">
            <div className="flex items-center text-xs text-slate-700 dark:text-slate-300 space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Contactless multi-face recognition in real time</span>
            </div>
            <div className="flex items-center text-xs text-slate-700 dark:text-slate-300 space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Presentation attack defense against photo/screen spoofing</span>
            </div>
            <div className="flex items-center text-xs text-slate-700 dark:text-slate-300 space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Automated medical certificate and leave processing</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4">
          <span>&copy; {new Date().getFullYear()} NeuroFace Systems. All rights reserved.</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            System Operational
          </span>
        </div>
      </div>

      {/* Right Login Form - Clean White Card */}
      <div className="relative md:w-1/2 p-6 sm:p-8 md:p-12 lg:p-14 flex items-center justify-center">
        {/* Floating Theme Toggle */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-7 sm:p-9 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
          <div>
            <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">Sign In</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Enter your credentials to access the portal</p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Username or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-md shadow-indigo-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 active:scale-[0.99]"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Discreet Quick Demo Access for Testing */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={() => setShowDemo(!showDemo)}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
            >
              {showDemo ? 'Hide Quick Demo Logins' : 'Quick Demo Logins ▾'}
            </button>
            {showDemo && (
              <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                <button
                  type="button"
                  onClick={() => quickLogin('admin', 'admin123')}
                  className="py-2 px-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors border border-slate-200 dark:border-slate-700 text-center truncate"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin('hod_mca', 'teacher123')}
                  className="py-2 px-1.5 rounded-xl bg-slate-50 hover:bg-amber-50 hover:text-amber-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors border border-slate-200 dark:border-slate-700 text-center truncate"
                >
                  HOD
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin('prof_rahul', 'teacher123')}
                  className="py-2 px-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors border border-slate-200 dark:border-slate-700 text-center truncate"
                >
                  Faculty
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin('student_arun', 'student123')}
                  className="py-2 px-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors border border-slate-200 dark:border-slate-700 text-center truncate"
                >
                  Student
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
