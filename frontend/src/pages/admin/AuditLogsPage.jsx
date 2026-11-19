import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Activity, Clock, Shield, User, Filter } from 'lucide-react';
import { formatLocalDateTime } from '../../utils/dateUtils';

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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">System Audit Trail & Compliance</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">Immutable chronological records of sensitive HOD waivers, attendance sessions, and policy changes</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[640px]">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Action Executed</th>
                <th className="px-6 py-3.5">Entity / Target</th>
                <th className="px-6 py-3.5">Audit Payload / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 font-sans">
                  <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                    {formatLocalDateTime(l.timestamp)}
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-white">
                    {l.username}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                    {l.entity_type} #{l.entity_id}
                  </td>
                  <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400 max-w-xs truncate font-mono text-[11px]">
                    {l.details || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View Responsive Cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {logs.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-400">
              No audit logs recorded yet.
            </div>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                    {l.action}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {formatLocalDateTime(l.timestamp, { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  User: <span className="font-bold">{l.username}</span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Target: {l.entity_type} #{l.entity_id}
                </div>

                {l.details && (
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-700 dark:text-slate-300 break-words">
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
