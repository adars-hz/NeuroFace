import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { History, Calendar, CheckCircle2, Clock, Shield } from 'lucide-react';
import { formatLocalTime } from '../../utils/dateUtils';

const AttendanceHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/student/attendance-history');
        setHistory(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">Individual Lecture Attendance History</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">Chronological record of individual classroom sessions and recognition timestamps</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
              <tr>
                <th className="px-6 py-3.5">Session Date</th>
                <th className="px-6 py-3.5">Subject</th>
                <th className="px-6 py-3.5">Faculty</th>
                <th className="px-6 py-3.5">Recognition Time</th>
                <th className="px-6 py-3.5">Verification Method</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-xs text-neutral-400">
                    No attendance entries recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-4 text-xs font-semibold text-slate-900 dark:text-white">
                      {h.date}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{h.subject_name}</div>
                      <div className="font-mono text-xs text-slate-500 dark:text-slate-400">{h.subject_code}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                      {h.teacher_name}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {formatLocalTime(h.timestamp)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        {h.verification_method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Responsive Cards */}
        <div className="md:hidden divide-y divide-neutral-100">
          {history.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-400">
              No attendance entries recorded yet.
            </div>
          ) : (
            history.map((h) => (
              <div key={h.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-black text-sm">{h.subject_name}</div>
                    <div className="font-mono text-xs text-slate-500 dark:text-slate-400">{h.subject_code}</div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                    {h.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-neutral-100">
                  <span>{h.date}</span>
                  <span className="font-mono text-[11px] text-neutral-500">
                    {formatLocalTime(h.timestamp, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span>Faculty: {h.teacher_name}</span>
                  <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 text-[10px] border border-neutral-200">
                    {h.verification_method}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceHistoryPage;
