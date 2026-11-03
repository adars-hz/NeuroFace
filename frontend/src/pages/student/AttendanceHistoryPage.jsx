import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { History, Calendar, CheckCircle2, Clock, Shield } from 'lucide-react';

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
        <h1 className="text-2xl font-bold text-black font-heading">Individual Lecture Attendance History</h1>
        <p className="text-neutral-600 text-sm">Chronological record of individual classroom sessions and recognition timestamps</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-500 uppercase">
              <tr>
                <th className="px-6 py-3.5">Session Date</th>
                <th className="px-6 py-3.5">Subject</th>
                <th className="px-6 py-3.5">Faculty</th>
                <th className="px-6 py-3.5">Recognition Time</th>
                <th className="px-6 py-3.5">Verification Method</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-xs text-neutral-400">
                    No attendance entries recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-xs font-semibold text-black">
                      {h.date}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-black">{h.subject_name}</div>
                      <div className="font-mono text-xs text-neutral-500">{h.subject_code}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-600">
                      {h.teacher_name}
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-500 font-mono">
                      {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-300">
                        {h.verification_method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-black border border-neutral-300">
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
                    <div className="font-mono text-xs text-neutral-500">{h.subject_code}</div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-neutral-100 text-black border border-neutral-300">
                    {h.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-600 pt-1 border-t border-neutral-100">
                  <span>{h.date}</span>
                  <span className="font-mono text-[11px] text-neutral-500">
                    {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
