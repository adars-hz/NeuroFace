import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Camera, CheckCircle2, AlertTriangle, BookOpen,
  Calendar, FileText, ArrowRight, ShieldCheck
} from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudentData = async () => {
      try {
        const [pRes, rRes] = await Promise.all([
          api.get('/student/profile'),
          api.get('/student/my-attendance')
        ]);
        setProfile(pRes.data);
        setReport(rRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadStudentData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Student Greeting Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
            Student Academic Portal
          </span>
          <h1 className="text-3xl font-extrabold font-heading text-white">
            Hello, {user?.full_name || 'Student'}!
          </h1>
          <p className="text-slate-300 text-sm">
            <b>Class:</b> {profile?.class_name || 'MCA S3'} &bull; <b>Register No:</b> {profile?.register_number}
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/student/my-attendance"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition-colors shadow"
            >
              View Subject-wise Attendance &rarr;
            </Link>
            <Link
              to="/student/register-face"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
              Biometric Setup
            </Link>
          </div>
        </div>
      </div>

      {/* Face Registration Status Callout */}
      {!profile?.face_registered ? (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-sm">Facial Biometric Template Not Registered</h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Your face has not been enrolled into the ArcFace neural recognition engine. The classroom camera will flag you as unknown until registration is completed.
              </p>
            </div>
          </div>
          <Link
            to="/student/register-face"
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-sm transition-colors text-center"
          >
            Launch Webcam Setup &rarr;
          </Link>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-xs text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span><b>Biometrics Enrolled:</b> Your 512-D ArcFace template is active and ready for automatic attendance marking.</span>
          </div>
          <Link
            to="/student/register-face"
            className="text-xs font-bold text-emerald-700 hover:underline whitespace-nowrap"
          >
            Recalibrate
          </Link>
        </div>
      )}

      {/* Attendance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Attendance</div>
          <div className="text-3xl font-extrabold text-slate-900 font-heading mt-2">
            {report?.overall_attendance_pct || 0}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Across all registered subjects</div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className={`h-2 rounded-full ${
                (report?.overall_attendance_pct || 0) >= 85
                  ? 'bg-emerald-500'
                  : (report?.overall_attendance_pct || 0) >= 75
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, report?.overall_attendance_pct || 0)}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered Courses</div>
          <div className="text-3xl font-extrabold text-slate-900 font-heading mt-2">
            {report?.subjects?.length || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Active curriculum subjects</div>
          <div className="mt-2">
            <Link to="/student/my-attendance" className="text-xs font-bold text-teal-600 hover:text-teal-700">
              View Attendance Breakdown &rarr;
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Leave Applications</div>
          <div className="text-3xl font-extrabold text-slate-900 font-heading mt-2">
            <FileText className="w-8 h-8 text-teal-600 inline" />
          </div>
          <div className="text-xs text-slate-500 mt-1">Medical leaves & waivers</div>
          <div className="mt-2">
            <Link to="/student/apply-leave" className="text-xs font-bold text-teal-600 hover:text-teal-700">
              Submit Leave Certificate &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
