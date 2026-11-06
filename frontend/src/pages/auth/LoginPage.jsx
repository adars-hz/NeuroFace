import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Lock, User, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2, Clock, FileText } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Left Showcase Banner - Academic Theme */}
      <div className="md:w-1/2 p-6 sm:p-8 md:p-12 lg:p-14 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white border-b md:border-b-0 md:border-r border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading tracking-tight text-white">NeuroFace</h1>
              <p className="text-[11px] text-blue-300 font-semibold tracking-wider uppercase">University Attendance & SIS Portal</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 my-8 sm:my-10 space-y-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 mr-1.5 text-blue-400" /> Automated Facial Roll-Call & Leave Engine
          </div>
          
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white leading-tight">
            Institutional Biometric Attendance & Academic Governance System.
          </h2>
          
          <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-lg">
            High-speed multi-face classroom recognition, presentation attack defense, automated OCR medical leave processing, and dynamic 75% condonation compliance.
          </p>

          {/* Key Academic Capabilities */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center text-xs text-slate-300 space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><b>Real-Time Verification:</b> MTCNN landmark alignment + ArcFace 512-D metric matching in &lt;100ms.</span>
            </div>
            <div className="flex items-center text-xs text-slate-300 space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><b>Zero-Proxy Protection:</b> Moiré subpixel FFT & chassis edge detection prevents buddy punching.</span>
            </div>
            <div className="flex items-center text-xs text-slate-300 space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><b>OCR Leave Processing:</b> Tesseract parses doctor certificates with automated condonation waiver recalculation.</span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-lg font-extrabold text-blue-400 font-heading">98.85%</div>
              <div className="text-[10px] text-slate-400">Accuracy</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-lg font-extrabold text-emerald-400 font-heading">&lt; 100ms</div>
              <div className="text-[10px] text-slate-400">CPU Latency</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-lg font-extrabold text-purple-400 font-heading">512-D</div>
              <div className="text-[10px] text-slate-400">ArcFace Vectors</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-lg font-extrabold text-teal-400 font-heading">&lt; 0.01%</div>
              <div className="text-[10px] text-slate-400">False Accepts</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between">
          <span>MCA Final Year Project &bull; Academic Year 2025–2026</span>
          <span className="text-emerald-400 font-semibold flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
            System Online
          </span>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="relative md:w-1/2 p-6 sm:p-8 md:p-12 lg:p-14 flex items-center justify-center bg-white dark:bg-slate-900 transition-colors duration-200">
        {/* Floating Theme Toggle Switch */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md space-y-7">
          <div>
            <div className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-2">
              Secure Institutional Gateway
            </div>
            <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">Sign in to your account</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Select your designated academic role or enter credentials</p>
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
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent text-sm transition-all"
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
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 active:scale-[0.99]"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins for Examiner / Viva Presentation */}
          <div className="pt-5 border-t border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
              One-Click Demonstration Logins (Examiner Quick Access):
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => quickLogin('admin', 'admin123')}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left transition-colors group"
              >
                <div className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">Admin Account</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">System Superuser</div>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('hod_mca', 'teacher123')}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left transition-colors group"
              >
                <div className="font-semibold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">HOD Account</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">Dr. Ramanathan</div>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('prof_rahul', 'teacher123')}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left transition-colors group"
              >
                <div className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Faculty Account</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">Prof. Rahul (ML)</div>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('student_arun', 'student123')}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left transition-colors group"
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
