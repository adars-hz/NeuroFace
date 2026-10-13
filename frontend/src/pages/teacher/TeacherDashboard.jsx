import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Camera, BookOpen, Clock, Users, CheckCircle2,
  Calendar, ArrowRight, Award, ShieldAlert, FileText
} from 'lucide-react';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeacherData = async () => {
      try {
        const [aRes, sRes] = await Promise.all([
          api.get('/teacher/my-assignments'),
          api.get('/teacher/my-sessions')
        ]);
        setAssignments(aRes.data);
        setSessions(sRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadTeacherData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Teacher Hero Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
              {user?.is_hod ? 'Head of Department (HOD)' : 'Faculty Member'}
            </span>
            {user?.is_hod && (
              <span className="text-xs font-semibold text-amber-300 flex items-center">
                <Award className="w-3.5 h-3.5 mr-1" /> Elevated Privileges Active
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold font-heading text-white">
            Welcome back, {user?.full_name}!
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Ready to conduct AI facial attendance? Launch your classroom camera to detect and register multiple students simultaneously with sub-second accuracy.
          </p>
          <div className="pt-2">
            <Link
              to="/teacher/start-session"
              className="inline-flex items-center px-5 py-3 rounded-xl bg-teal-500 text-slate-950 font-bold text-sm hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20"
            >
              <Camera className="w-4 h-4 mr-2" />
              Start Attendance Session
            </Link>
          </div>
        </div>
      </div>

      {/* Authorized Courses / Assigned Subjects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-heading">My Assigned Courses & Classes</h2>
            <p className="text-xs text-slate-500">Strictly authorized subjects assigned by administration</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg border border-teal-200">
            {assignments.length} Authorized Courses
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assignments.map((a) => (
            <div key={a.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-teal-300 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-teal-700 uppercase px-2 py-0.5 bg-teal-50 rounded border border-teal-200">
                    {a.subject_code}
                  </span>
                  <h3 className="font-bold text-slate-900 font-heading text-base mt-2">{a.subject_name}</h3>
                </div>
                <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 flex items-center">
                  <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  {a.class_name}
                </span>
                <Link
                  to={`/teacher/start-session?assignment=${a.id}`}
                  className="font-bold text-teal-600 hover:text-teal-700 flex items-center"
                >
                  Start Now &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Sessions Table */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 font-heading mb-3">Recent Attendance Sessions</h2>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-3.5">Date & Time</th>
                <th className="px-6 py-3.5">Course / Subject</th>
                <th className="px-6 py-3.5">Class Section</th>
                <th className="px-6 py-3.5">Slot / Duration</th>
                <th className="px-6 py-3.5">Present Count</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.slice(0, 8).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3.5 text-xs text-slate-600 font-medium">
                    {s.session_date} ({new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-slate-900">
                    {s.subject_name}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-600">
                    {s.class_name}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-500 font-mono">
                    {s.slot_name}
                  </td>
                  <td className="px-6 py-3.5 text-xs font-bold text-teal-700">
                    {s.present_count} / {s.total_enrolled} Present
                  </td>
                  <td className="px-6 py-3.5 flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      s.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {s.status}
                    </span>
                    {s.status === 'ACTIVE' && (
                      <Link
                        to={`/teacher/live-session/${s.id}`}
                        className="text-xs font-bold text-teal-600 hover:text-teal-700 underline"
                      >
                        Open Camera &rarr;
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
