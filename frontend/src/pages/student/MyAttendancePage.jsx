import React, { useState, useEffect } from 'react';
import api, { downloadStudentReportPdf } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  CheckCircle2, AlertTriangle, FileDown, Download,
  BookOpen, Shield, Award, Info
} from 'lucide-react';

const MyAttendancePage = () => {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await api.get('/student/my-attendance');
        setReport(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  const handleDownloadPDF = async () => {
    if (!report) return;
    try {
      await downloadStudentReportPdf(report.student_id);
    } catch (err) {
      console.error(err);
      window.alert('Unable to download the attendance PDF. Please try again.');
    }
  };

  const handleDownloadCSV = () => {
    if (!report) return;
    window.open(`http://127.0.0.1:8000/api/v1/reports/student/${report.student_id}/export-csv`, '_blank');
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">Calculating subject percentages...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">Subject-Wise Attendance</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Real-time attendance calculations and session summary across all registered courses</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 text-xs font-bold flex items-center space-x-1.5 shadow transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download Official PDF</span>
          </button>
        </div>
      </div>

      {/* Overall Score Banner */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overall Composite Score</span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading">
            {report?.overall_attendance_pct}%
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Student: <b>{report?.student_name}</b> ({report?.register_number}) &bull; Class: {report?.class_name}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-slate-900 dark:text-white" />
            <span>Enrolled: {report?.class_name || 'Active'}</span>
          </div>
        </div>
      </div>

      {/* Subject Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {report?.subjects.map((sub) => {
          return (
            <div
              key={sub.subject_id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 shadow-sm space-y-4 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 uppercase px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
                    {sub.subject_code}
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-white font-heading text-base mt-2">
                    {sub.subject_name}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold font-heading text-slate-900 dark:text-white">
                    {sub.total_classes === 0 ? '0%' : `${sub.effective_attendance_pct}%`}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Effective %</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative pt-2">
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full transition-all duration-500 bg-indigo-600"
                    style={{ width: `${sub.total_classes === 0 ? 0 : Math.min(100, sub.effective_attendance_pct)}%` }}
                  ></div>
                </div>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs border-t border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="font-bold text-slate-900 dark:text-white">{sub.total_classes}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Held</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="font-bold text-slate-900 dark:text-white">{sub.present_classes}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Present</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="font-bold text-slate-900 dark:text-white">{sub.absent_classes}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Absent</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="font-bold text-slate-900 dark:text-white">{sub.waived_classes}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Waived</div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Attendance:</span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  {sub.present_classes} / {sub.total_classes} Classes Present
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyAttendancePage;
