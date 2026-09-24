import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, GraduationCap, BookOpen, Clock, Camera, ShieldCheck, Activity, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading system telemetry...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Institutional Administration</h1>
          <p className="text-slate-600 text-sm">System oversight, faculty assignments, and biometric status monitoring</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
            All AI Services Operational
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Students</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-heading mt-3">{stats?.total_students || 0}</div>
          <div className="text-xs text-slate-600 mt-1">Enrolled in active batches</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Face Biometric Status</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <Camera className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-teal-600 font-heading mt-3">{stats?.face_registered_students || 0}</div>
          <div className="text-xs text-slate-600 mt-1">{stats?.face_registration_pct}% registration completion</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-teal-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats?.face_registration_pct || 0}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Faculty Members</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-heading mt-3">{stats?.total_teachers || 0}</div>
          <div className="text-xs text-slate-600 mt-1">Teachers & HODs assigned</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Attendance Marked</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-heading mt-3">{stats?.total_records_marked || 0}</div>
          <div className="text-xs text-slate-600 mt-1">Across {stats?.total_attendance_sessions || 0} lecture sessions</div>
        </div>
      </div>

      {/* Quick Action Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="font-bold text-slate-900 font-heading flex items-center space-x-2">
            <Users className="w-5 h-5 text-teal-600" />
            <span>Teacher & HOD Governance</span>
          </div>
          <p className="text-xs text-slate-600">
            Manage teacher profiles, assign subjects/classes, and designate Head of Department permissions.
          </p>
          <div className="pt-2">
            <Link
              to="/admin/teachers"
              className="inline-flex items-center text-xs font-bold text-teal-600 hover:text-teal-700"
            >
              Manage Teachers &rarr;
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="font-bold text-slate-900 font-heading flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>Academic Curriculum</span>
          </div>
          <p className="text-xs text-slate-600">
            Define departments, classes/batches, course subjects, and timetable lecture periods.
          </p>
          <div className="pt-2">
            <Link
              to="/admin/academic"
              className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Configure Curriculum &rarr;
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="font-bold text-slate-900 font-heading flex items-center space-x-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <span>Institutional Policies & Logs</span>
          </div>
          <p className="text-xs text-slate-600">
            Configure the 85% attendance eligibility rule, 75% condonation fine fees, and inspect audit trails.
          </p>
          <div className="pt-2">
            <Link
              to="/admin/fine-rules"
              className="inline-flex items-center text-xs font-bold text-purple-600 hover:text-purple-700"
            >
              Edit Policies &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
