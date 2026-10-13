import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
  Clock, CheckCircle2, XCircle, ShieldAlert,
  AlertCircle, RefreshCw, FileText, ChevronDown, ChevronUp
} from 'lucide-react';

const HODMyRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const param = filter !== 'ALL' ? '?status_filter=' + filter : '';
      const res = await api.get('/admin/approvals' + param);
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to load approval requests', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const getStatusBadge = (status) => {
    if (status === 'PENDING') return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
        <Clock className="w-3.5 h-3.5 mr-1 text-amber-600 animate-pulse" />
        Pending Admin Approval
      </span>
    );
    if (status === 'APPROVED') return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
        Approved and Applied
      </span>
    );
    if (status === 'REJECTED') return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
        <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
        Rejected
      </span>
    );
    return <span>{status}</span>;
  };

  const getRequestTypeLabel = (type) => {
    const labels = {
      CREATE_TEACHER: 'Add Faculty Member',
      UPDATE_TEACHER: 'Update Faculty Member',
      DELETE_TEACHER: 'Remove Faculty Member',
      CREATE_STUDENT: 'Enroll New Student',
      UPDATE_STUDENT: 'Update Student Record',
      DELETE_STUDENT: 'Remove Student',
      CREATE_DEPARTMENT: 'Create Department',
      CREATE_CLASS: 'Create Academic Class',
      CREATE_SUBJECT: 'Create Subject',
      CREATE_ASSIGNMENT: 'Assign Teacher to Subject',
      DELETE_ASSIGNMENT: 'Remove Assignment',
    };
    return labels[type] || type;
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 mb-2">
            <ShieldAlert className="w-3.5 h-3.5 mr-1" /> HOD Approval Requests
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">My Administrative Requests</h1>
          <p className="text-slate-500 text-sm mt-1">
            Track the status of requests you submitted for institutional Admin approval.
          </p>
        </div>
        <button
          onClick={loadRequests}
          className="inline-flex items-center px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <div className="text-2xl font-extrabold text-amber-700 font-heading">{pendingCount}</div>
          <div className="text-xs font-semibold text-amber-600 mt-1">Awaiting Admin Review</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <div className="text-2xl font-extrabold text-emerald-700 font-heading">{approvedCount}</div>
          <div className="text-xs font-semibold text-emerald-600 mt-1">Approved and Applied</div>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
          <div className="text-2xl font-extrabold text-rose-700 font-heading">{rejectedCount}</div>
          <div className="text-xs font-semibold text-rose-600 mt-1">Rejected by Admin</div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <span className="font-bold">How HOD Approval Works: </span>
          When you add, edit, or remove teachers and students through the HOD Admin Tools,
          the request is queued here with Pending status. The system administrator reviews and either
          Approves (the action is immediately applied) or Rejects (with feedback remarks) your request.
        </div>
      </div>

      <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl w-fit">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-10 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 text-slate-400 animate-spin" />
            Loading your requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <div className="font-bold text-slate-700">No requests found</div>
            <p className="text-xs text-slate-500 mt-1">
              {filter === 'ALL' ? 'You have not submitted any administrative requests yet.' : 'No requests with status ' + filter + '.'}
            </p>
          </div>
        ) : (
          requests.map((r) => (
            <div
              key={r.id}
              className={'bg-white rounded-2xl border shadow-sm transition-all ' + (r.status === 'PENDING' ? 'border-amber-200' : r.status === 'APPROVED' ? 'border-emerald-200' : 'border-rose-200')}
            >
              <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 text-sm">{r.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {getRequestTypeLabel(r.request_type)} &bull; Submitted {new Date(r.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  {r.admin_remarks && (
                    <div className={'mt-2 text-xs p-2.5 rounded-xl border font-medium flex items-start space-x-2 ' + (r.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800')}>
                      <span className="font-bold shrink-0">Admin Feedback:</span>
                      <span>{r.admin_remarks}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-3 shrink-0">
                  {getStatusBadge(r.status)}
                  <button
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    {expandedId === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {expandedId === r.id && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Request Payload</div>
                  <pre className="p-3 bg-slate-900 text-teal-300 rounded-xl text-[11px] font-mono overflow-x-auto">
                    {JSON.stringify(r.payload, null, 2)}
                  </pre>
                  {r.reviewed_by_name && (
                    <div className="text-xs text-slate-500 mt-2">
                      Reviewed by <span className="font-semibold text-slate-700">{r.reviewed_by_name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HODMyRequestsPage;