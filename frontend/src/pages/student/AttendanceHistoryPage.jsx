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
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Individual Lecture Attendance History</h1>
        <p className="text-slate-600 text-sm">Chronological record of individual classroom sessions and recognition timestamps</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase">
            <tr>
              <th className="px-6 py-3.5">Session Date</th>
              <th className="px-6 py-3.5">Subject</th>
              <th className="px-6 py-3.5">Faculty</th>
              <th className="px-6 py-3.5">Recognition Time</th>
              <th className="px-6 py-3.5">Verification Method</th>
              <th className="px-6 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-xs text-slate-400">
                  No attendance entries recorded yet.
                </td>
              </tr>
            ) : (
              history.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-xs font-semibold text-slate-900">
                    {h.date}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{h.subject_name}</div>
                    <div className="font-mono text-xs text-slate-500">{h.subject_code}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">
                    {h.teacher_name}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                    {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                      {h.verification_method}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      h.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {h.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceHistoryPage;
