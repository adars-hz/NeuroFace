import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Award, Users, BookOpen, Clock, Activity, FileText, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const HODOversightPage = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await api.get('/teacher/hod/department-overview');
        setOverview(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading department oversight...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 mb-1">
            <Award className="w-3.5 h-3.5 mr-1" /> HOD Administrative Authority
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">
            Department Oversight & Analytics: {overview?.department_name}
          </h1>
          <p className="text-slate-600 text-sm">Comprehensive cross-class attendance trends and faculty lecture monitoring</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department Classes</div>
          <div className="text-2xl font-extrabold text-slate-900 font-heading mt-2">{overview?.total_classes}</div>
          <div className="text-xs text-slate-500 mt-1">Active semester batches</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department Faculty</div>
          <div className="text-2xl font-extrabold text-teal-700 font-heading mt-2">{overview?.total_teachers}</div>
          <div className="text-xs text-slate-500 mt-1">Teaching staff members</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Enrolled Students</div>
          <div className="text-2xl font-extrabold text-blue-600 font-heading mt-2">{overview?.total_students}</div>
          <div className="text-xs text-slate-500 mt-1">Across all MCA semesters</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending Leaves</div>
          <div className="text-2xl font-extrabold text-amber-600 font-heading mt-2">{overview?.pending_leave_applications}</div>
          <div className="text-xs text-slate-500 mt-1">Awaiting verification</div>
        </div>
      </div>

      <div className="p-6 bg-teal-50/60 rounded-2xl border border-teal-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-teal-900 font-heading text-sm">Student Face Re-Registration Authorizations</h3>
          <p className="text-xs text-teal-800 mt-0.5">
            Students whose facial biometrics are already enrolled require HOD or Admin approval to re-register their template.
          </p>
        </div>
        <Link
          to="/admin/approvals?tab=face"
          className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors shadow-sm whitespace-nowrap text-center"
        >
          Review Face Requests &rarr;
        </Link>
      </div>

      <div className="p-6 bg-amber-50/60 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-amber-900 font-heading text-sm">Need to grant medical attendance waivers?</h3>
          <p className="text-xs text-amber-800 mt-0.5">
            Authorize medical waivers for students with valid medical documentation. Attendance calculations update instantly.
          </p>
        </div>
        <Link
          to="/teacher/medical-waivers"
          className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors shadow-sm whitespace-nowrap text-center"
        >
          Manage Waivers &rarr;
        </Link>
      </div>
    </div>
  );
};

export default HODOversightPage;
