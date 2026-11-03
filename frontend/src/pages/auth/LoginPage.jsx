import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Lock, User, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username, password);
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

  const quickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-white transition-colors duration-200">
      {/* Left Showcase Banner */}
      <div className="md:w-1/2 p-6 sm:p-8 md:p-14 flex flex-col justify-between bg-neutral-100 dark:bg-black border-b md:border-b-0 md:border-r border-neutral-200 dark:border-neutral-800 transition-colors duration-200">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-black dark:bg-neutral-900 border border-neutral-800 dark:border-neutral-700 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading tracking-tight text-neutral-900 dark:text-white">NeuroFace</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium tracking-wide uppercase">Deep Learning Attendance Platform</p>
          </div>
        </div>

        <div className="my-6 sm:my-8 md:my-12 space-y-4 sm:space-y-6">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 shadow-sm">
            <ShieldCheck className="w-4 h-4 mr-1.5 text-black dark:text-white" /> MTCNN + ArcFace 512-D Architecture
          </div>
          <h2 className="text-2xl sm:3xl md:text-4xl font-extrabold font-heading text-neutral-900 dark:text-white leading-tight">
            Next-Generation Facial Biometric Attendance for Higher Education.
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm md:text-base leading-relaxed max-w-lg">
            High-speed multi-student classroom detection, real-time unknown face rejection, OCR leave document analysis, and comprehensive attendance analytics.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="text-xl font-bold text-neutral-900 dark:text-white font-heading">512-D</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Normalized ArcFace Embeddings</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="text-xl font-bold text-neutral-900 dark:text-white font-heading">Multi-Face</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Real-time Simultaneous Capture</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-neutral-500">
          MCA Final Year Project &bull; Production-Grade Full-Stack Implementation
        </div>
      </div>

      {/* Right Login Form */}
      <div className="relative md:w-1/2 p-6 sm:p-8 md:p-14 flex items-center justify-center bg-white dark:bg-[#09090b] transition-colors duration-200">
        {/* Floating Theme Toggle Switch */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md space-y-8">
          <div>
            <h3 className="text-2xl font-bold font-heading text-neutral-900 dark:text-white">Sign in to your account</h3>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">Select your designated academic role or enter credentials</p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-200 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-black dark:text-white" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
                Username or University Email
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or arun@neuroface.edu"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-extrabold text-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 shadow-md flex items-center justify-center space-x-2 transition-all disabled:opacity-50 active:scale-[0.99]"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins for Examiner / Viva Presentation */}
          <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
            <div className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
              One-Click Demonstration Logins:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => quickLogin('admin', 'AdminPassword123!')}
                className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-left transition-colors"
              >
                <div className="font-semibold text-neutral-900 dark:text-white">Admin Account</div>
                <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">System Superuser</div>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('hod_mca', 'HodPassword123!')}
                className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-left transition-colors"
              >
                <div className="font-semibold text-neutral-900 dark:text-white">HOD Account</div>
                <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">Dr. Ramanathan</div>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('prof_rahul', 'TeacherPassword123!')}
                className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-left transition-colors"
              >
                <div className="font-semibold text-neutral-900 dark:text-white">Faculty Account</div>
                <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">Prof. Rahul (ML)</div>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('student_arun', 'StudentPassword123!')}
                className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-left transition-colors"
              >
                <div className="font-semibold text-neutral-900 dark:text-white">Student Account</div>
                <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">Arun Kumar (MCA)</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
