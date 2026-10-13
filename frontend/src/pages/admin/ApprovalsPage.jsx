import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Clock, CheckCircle2, XCircle, AlertCircle, ShieldAlert,
  User, Check, X, ArrowRight, MessageSquare, Filter
} from 'lucide-react';

const ApprovalsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null); // { request, action: 'approve'|'reject' }
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const loadRequests = async () => {
    try {
      const param = filter !== 'ALL' ? `?status_filter=${filter}` : '';
      const res = await api.get(`/admin/approvals${param}`);
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to load approval requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const handleReview = async (e) => {
    e.preventDefault();
    if (!reviewModal) return;
    setSubmitting(true);
    try {
      const endpoint = reviewModal.action === 'approve'
        ? `/admin/approvals/${reviewModal.request.id}/approve`
        : `/admin/approvals/${reviewModal.request.id}/reject`;

      const res = await api.post(endpoint, { remarks });
      setMsg(res.data.message);
      setReviewModal(null);
      setRemarks('');
      loadRequests();
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
            <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
            Pending Admin Approval
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Approved & Confirmed
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
            Rejected
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
              Governance & Oversight
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading mt-1">
            HOD Administrative Approval Queue
          </h1>
          <p className="text-slate-600 text-sm">
            {isAdmin
              ? 'Review, verify, and approve member additions and updates submitted by Department Heads.'
              : 'Track the status of your administrative requests awaiting institutional Admin confirmation.'}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === f
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-sm font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Loading approval queue...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-bold text-slate-700">No requests found</div>
            <p className="text-xs text-slate-500">
              {filter === 'PENDING'
                ? 'All HOD requests have been processed.'
                : 'No administrative requests match this filter.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Request Type & Title</th>
                <th className="px-6 py-3.5">Requested By</th>
                <th className="px-6 py-3.5">Submitted On</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Payload / Remarks</th>
                {isAdmin && <th className="px-6 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{r.title}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      Type: {r.request_type}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <div className="font-semibold text-slate-800">{r.requested_by_name}</div>
                    <div className="text-slate-400">User ID #{r.requested_by_id}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(r.status)}
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {r.admin_remarks && (
                      <div className="mb-1 text-slate-700 font-medium bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-900">Admin Remarks:</span> {r.admin_remarks}
                      </div>
                    )}
                    <details className="cursor-pointer text-[11px] text-teal-600 font-semibold">
                      <summary>View Request Details</summary>
                      <pre className="mt-1 p-2 bg-slate-900 text-teal-300 rounded-lg overflow-x-auto text-[10px] font-mono">
                        {JSON.stringify(r.payload, null, 2)}
                      </pre>
                    </details>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {r.status === 'PENDING' ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setReviewModal({ request: r, action: 'approve' });
                              setRemarks('Approved and confirmed by Administrator.');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 shadow-sm transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve & Apply</span>
                          </button>
                          <button
                            onClick={() => {
                              setReviewModal({ request: r, action: 'reject' });
                              setRemarks('Rejected after administrative review.');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs flex items-center space-x-1 transition"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Completed</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 font-heading flex items-center space-x-2">
                {reviewModal.action === 'approve' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Confirm & Apply Request</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span>Reject HOD Request</span>
                  </>
                )}
              </h3>
              <button onClick={() => setReviewModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="font-bold text-slate-900">{reviewModal.request.title}</div>
              <div>Submitted by: <span className="font-semibold">{reviewModal.request.requested_by_name}</span></div>
            </div>

            <form onSubmit={handleReview} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Administrative Remarks / Feedback
                </label>
                <textarea
                  rows="3"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks or approval notes..."
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModal(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition shadow-sm ${
                    reviewModal.action === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting
                    ? 'Processing...'
                    : reviewModal.action === 'approve'
                    ? 'Confirm Approval'
                    : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalsPage;
