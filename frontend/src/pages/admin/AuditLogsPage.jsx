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
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[640px]">
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

        {/* Mobile View Responsive Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {logs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No audit logs recorded yet.
            </div>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                    {l.action}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(l.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-900">
                  User: <span className="text-teal-700 font-bold">{l.username}</span>
                </div>

                <div className="text-xs text-slate-600 font-medium">
                  Target: {l.entity_type} #{l.entity_id}
                </div>

                {l.details && (
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600 break-words">
                    {l.details}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogsPage;
