import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Activity, Clock, Shield, User, Filter } from 'lucide-react';

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/admin/audit-logs');
        setLogs(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">System Audit Trail & Compliance</h1>
        <p className="text-slate-600 text-sm">Immutable chronological records of sensitive HOD waivers, attendance sessions, and policy changes</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase">
            <tr>
              <th className="px-6 py-3.5">Timestamp</th>
              <th className="px-6 py-3.5">User</th>
              <th className="px-6 py-3.5">Action Executed</th>
              <th className="px-6 py-3.5">Entity / Target</th>
              <th className="px-6 py-3.5">Audit Payload / Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-xs">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50 font-sans">
                <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap text-xs">
                  {new Date(l.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-3.5 font-semibold text-slate-900">
                  {l.username}
                </td>
                <td className="px-6 py-3.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                    {l.action}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-slate-600 font-medium">
                  {l.entity_type} #{l.entity_id}
                </td>
                <td className="px-6 py-3.5 text-slate-600 max-w-xs truncate font-mono text-[11px]">
                  {l.details || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogsPage;
