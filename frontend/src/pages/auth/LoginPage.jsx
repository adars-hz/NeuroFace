import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Lock, User, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2, Clock, Users, GraduationCap } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-indigo-50/70 via-slate-50 to-blue-50/60 text-slate-800 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Left Showcase Banner - Clean White & Friendly Indigo */}
      <div className="md:w-1/2 p-6 sm:p-8 md:p-12 lg:p-14 flex flex-col justify-between bg-white/70 dark:bg-slate-900/80 backdrop-blur-md border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 transition-colors duration-200">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold font-heading tracking-tight text-slate-900 dark:text-white">NeuroFace</h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                  Attendance Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                AI Facial Recognition & Leave Management
              </p>
            </div>
          </div>
        </div>

        <div className="my-8 sm:my-10 space-y-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 shadow-xs">
            <ShieldCheck className="w-4 h-4 mr-1.5 text-indigo-600 dark:text-indigo-400" />
            MTCNN + ArcFace 512-D Architecture
          </div>
          
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-slate-900 dark:text-white leading-tight">
            Simple, Fast & Secure Classroom Attendance.
          </h2>
          
          <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed max-w-lg">
            Effortless multi-student facial roll-calls, real-time presentation attack defense, automated OCR medical leave processing, and dynamic 85% attendance compliance.
          </p>

          {/* User-Friendly Value Badges */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center text-xs text-slate-700 dark:text-slate-300 space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span><b>Real-Time Verification:</b> Fast, contactless recognition in under 100 milliseconds.</span>
            </div>
            <div className="flex items-center text-xs text-slate-700 dark:text-slate-300 space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span><b>Zero-Proxy Anti-Spoofing:</b> Rejects photos, phone screens, and video replay attacks.</span>
            </div>
            <div className="flex items-center text-xs text-slate-700 dark:text-slate-300 space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span><b>OCR Medical Waivers:</b> Automatically scans doctor letters and updates attendance records.</span>
            </div>
          </div>

          {/* Clean White Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-heading">98.85%</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Accuracy</div>
            </div>
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-heading">&lt; 100ms</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Inference Speed</div>
            </div>
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400 font-heading">512-D</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Biometrics</div>
            </div>
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="text-lg font-extrabold text-teal-600 dark:text-teal-400 font-heading">100%</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Zero Proxies</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4">
          <span>MCA Final Year Project &bull; Academic Year 2025–2026</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            System Online
          </span>
        </div>
      </div>

      {/* Right Login Form - Crisp White Card */}
      <div className="relative md:w-1/2 p-6 sm:p-8 md:p-12 lg:p-14 flex items-center justify-center">
        {/* Floating Theme Toggle Switch */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-7 sm:p-9 border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-none space-y-7">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-2">
              Welcome Back
            </span>
            <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">Sign in to your account</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Select your academic role or enter your credentials</p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Username or University Email
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or arun@neuroface.edu"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-md shadow-indigo-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 active:scale-[0.99]"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins for Examiner / Viva Presentation */}
          <div className="pt-5 border-t border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
              One-Click Demonstration Logins:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => quickLogin('admin', 'admin123')}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left transition-colors group"
              >
                <div className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Admin Account</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">System Superuser</div>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('hod_mca', 'teacher123')}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left transition-colors group"
              >
                <div className="font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">HOD Account</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">Dr. Ramanathan</div>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('prof_rahul', 'teacher123')}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left transition-colors group"
              >
                <div className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">Faculty Account</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">Prof. Rahul (ML)</div>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('student_arun', 'student123')}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left transition-colors group"
              >
                <div className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Student Account</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">Arun Kumar (MCA)</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
