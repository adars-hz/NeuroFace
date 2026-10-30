import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Clock, CheckCircle2, XCircle, AlertCircle, ShieldAlert,
  User, Check, X, ArrowRight, MessageSquare, Filter, Camera, RefreshCw
} from 'lucide-react';

const ApprovalsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isHod = user?.is_hod;
  const canApproveFace = isAdmin || isHod;

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'face' ? 'face' : 'hod';
  const [activeTab, setActiveTab] = useState(initialTab); // 'hod' | 'face'

  // HOD Governance Requests State
  const [hodRequests, setHodRequests] = useState([]);
  const [hodFilter, setHodFilter] = useState('ALL');
  const [hodLoading, setHodLoading] = useState(true);

  // Student Face Re-registration Requests State
  const [faceRequests, setFaceRequests] = useState([]);
  const [faceFilter, setFaceFilter] = useState('ALL');
  const [faceLoading, setFaceLoading] = useState(true);

  // Review Modals
  // { type: 'hod'|'face', request: obj, action: 'approve'|'reject' }
  const [reviewModal, setReviewModal] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  // Counts
  const [pendingCounts, setPendingCounts] = useState({ pending_hod_count: 0, pending_face_count: 0 });

  const loadHodRequests = useCallback(async () => {
    setHodLoading(true);
    try {
      const param = hodFilter !== 'ALL' ? `?status_filter=${hodFilter}` : '';
      const res = await api.get(`/admin/approvals${param}`);
      setHodRequests(res.data);
    } catch (err) {
      console.error('Failed to load HOD approval requests', err);
    } finally {
      setHodLoading(false);
    }
  }, [hodFilter]);

  const loadFaceRequests = useCallback(async () => {
    setFaceLoading(true);
    try {
      const param = faceFilter !== 'ALL' ? `?status_filter=${faceFilter}` : '';
      const res = await api.get(`/admin/face-re-registrations${param}`);
      setFaceRequests(res.data);
    } catch (err) {
      console.error('Failed to load face re-registration requests', err);
    } finally {
      setFaceLoading(false);
    }
  }, [faceFilter]);

  const loadCounts = useCallback(async () => {
    try {
      const res = await api.get('/admin/approvals/pending-count');
      setPendingCounts({
        pending_hod_count: res.data.pending_hod_count || 0,
        pending_face_count: res.data.pending_face_count || 0
      });
    } catch (err) {
      // Silently continue
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    if (activeTab === 'hod') {
      loadHodRequests();
    } else {
      loadFaceRequests();
    }
  }, [activeTab, loadHodRequests, loadFaceRequests]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'face' ? { tab: 'face' } : {});
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!reviewModal) return;
    setSubmitting(true);
    try {
      if (reviewModal.type === 'hod') {
        const endpoint = reviewModal.action === 'approve'
          ? `/admin/approvals/${reviewModal.request.id}/approve`
          : `/admin/approvals/${reviewModal.request.id}/reject`;

        const res = await api.post(endpoint, { remarks });
        setMsg(res.data.message);
        loadHodRequests();
      } else {
        const endpoint = reviewModal.action === 'approve'
          ? `/admin/face-re-registrations/${reviewModal.request.id}/approve`
          : `/admin/face-re-registrations/${reviewModal.request.id}/reject`;

        const res = await api.post(endpoint, { remarks });
        setMsg(res.data.message);
        loadFaceRequests();
      }

      setReviewModal(null);
      setRemarks('');
      loadCounts();
      setTimeout(() => setMsg(''), 4500);
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
            Pending Approval
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Approved & Authorized
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
              Institutional Governance
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading mt-1">
            Approvals & Authorization Queue
          </h1>
          <p className="text-slate-600 text-sm">
            Review and grant approvals for HOD administrative requests and student face re-registrations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 overflow-x-auto max-w-full">
          <button
            onClick={() => handleTabChange('hod')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'hod'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-teal-600" />
            <span>HOD Governance</span>
            {pendingCounts.pending_hod_count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
                {pendingCounts.pending_hod_count}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('face')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'face'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-amber-600" />
            <span>Face Re-Registrations</span>
            {pendingCounts.pending_face_count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
                {pendingCounts.pending_face_count}
              </span>
            )}
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-sm font-semibold flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: HOD GOVERNANCE REQUESTS (Faculty, Student Records, Academic Setup) */}
      {/* ========================================================================= */}
      {activeTab === 'hod' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-slate-500">
              {isAdmin
                ? 'Review member and curriculum setup requests submitted by Department HODs.'
                : 'Status of institutional setup requests submitted by you to Administrator.'}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
                <button
                  key={f}
                  onClick={() => setHodFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    hodFilter === f
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {hodLoading ? (
              <div className="p-8 text-center text-slate-500 font-medium">Loading approval queue...</div>
            ) : hodRequests.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="font-bold text-slate-700">No governance requests found</div>
                <p className="text-xs text-slate-500">
                  {hodFilter === 'PENDING'
                    ? 'All HOD requests have been processed.'
                    : 'No administrative requests match this filter.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700 min-w-[700px]">
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
                  {hodRequests.map((r) => (
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
                                  setReviewModal({ type: 'hod', request: r, action: 'approve' });
                                  setRemarks('Approved and confirmed by Administrator.');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 shadow-sm transition"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve & Apply</span>
                              </button>
                              <button
                                onClick={() => {
                                  setReviewModal({ type: 'hod', request: r, action: 'reject' });
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STUDENT FACE RE-REGISTRATION APPROVALS (Admin & HOD Authority)     */}
      {/* ========================================================================= */}
      {activeTab === 'face' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-slate-500">
              Students whose face is already registered require <b>Admin or HOD acceptance</b> before re-enrollment.
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFaceFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    faceFilter === f
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {faceLoading ? (
              <div className="p-8 text-center text-slate-500 font-medium">Loading face re-registration requests...</div>
            ) : faceRequests.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="font-bold text-slate-700">No face re-registration requests found</div>
                <p className="text-xs text-slate-500">
                  {faceFilter === 'PENDING'
                    ? 'All student face re-registration requests have been processed.'
                    : 'No requests match this filter.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700 min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Student Details</th>
                    <th className="px-6 py-3.5">Department & Class</th>
                    <th className="px-6 py-3.5">Reason for Re-Registration</th>
                    <th className="px-6 py-3.5">Submitted On</th>
                    <th className="px-6 py-3.5">Status & Usage</th>
                    <th className="px-6 py-3.5">Reviewer Remarks</th>
                    {canApproveFace && <th className="px-6 py-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {faceRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{r.student_name}</div>
                        <div className="text-xs font-mono text-teal-700 font-semibold mt-0.5">
                          {r.register_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="font-semibold text-slate-800">{r.department_name || 'Department'}</div>
                        <div className="text-slate-500">{r.class_name || 'Class Batch'}</div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="max-w-xs p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 italic">
                          "{r.reason || 'Facial recalibration'}"
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap space-y-1">
                        <div>{getStatusBadge(r.status)}</div>
                        {r.status === 'APPROVED' && (
                          <div className="text-[11px] font-semibold">
                            {r.is_used ? (
                              <span className="text-slate-500 flex items-center">
                                <CheckCircle2 className="w-3 h-3 mr-1 text-slate-400" /> Biometrics Updated
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-bold flex items-center animate-pulse">
                                <Sparkles className="w-3 h-3 mr-1 text-emerald-600" /> Awaiting Student Capture
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {r.reviewed_by_name ? (
                          <div className="space-y-0.5">
                            <div className="text-[11px] text-slate-500 font-medium">
                              Reviewed by: <span className="font-bold text-slate-800">{r.reviewed_by_name}</span>
                            </div>
                            {r.admin_remarks && (
                              <div className="text-slate-700 italic bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                                {r.admin_remarks}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Awaiting review</span>
                        )}
                      </td>
                      {canApproveFace && (
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {r.status === 'PENDING' ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setReviewModal({ type: 'face', request: r, action: 'approve' });
                                  setRemarks(`Approved by ${isHod && !isAdmin ? 'HOD' : 'Admin'} for face re-registration.`);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 shadow-sm transition"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Accept / Approve</span>
                              </button>
                              <button
                                onClick={() => {
                                  setReviewModal({ type: 'face', request: r, action: 'reject' });
                                  setRemarks('Please consult department advisor in person before re-enrolling.');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs flex items-center space-x-1 transition"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">Processed</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Confirmation Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-xl space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 font-heading flex items-center space-x-2">
                {reviewModal.action === 'approve' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>
                      {reviewModal.type === 'face' ? 'Authorize Face Re-Registration' : 'Confirm & Apply Request'}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span>Reject Request</span>
                  </>
                )}
              </h3>
              <button onClick={() => setReviewModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {reviewModal.type === 'face' ? (
                <>
                  <div className="font-bold text-slate-900 text-sm">
                    {reviewModal.request.student_name} ({reviewModal.request.register_number})
                  </div>
                  <div>Department: <span className="font-semibold">{reviewModal.request.department_name}</span></div>
                  <div>Reason: <span className="italic">"{reviewModal.request.reason}"</span></div>
                </>
              ) : (
                <>
                  <div className="font-bold text-slate-900">{reviewModal.request.title}</div>
                  <div>Submitted by: <span className="font-semibold">{reviewModal.request.requested_by_name}</span></div>
                </>
              )}
            </div>

            <form onSubmit={handleReview} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {reviewModal.action === 'approve' ? 'Approval Remarks (Optional)' : 'Rejection Reason / Feedback *'}
                </label>
                <textarea
                  rows="3"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks or feedback..."
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required={reviewModal.action === 'reject'}
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
                    ? 'Confirm Acceptance'
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
