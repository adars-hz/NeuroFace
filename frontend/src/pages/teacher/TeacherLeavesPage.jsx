import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  FileText, CheckCircle, XCircle, Clock, Eye, AlertCircle,
  ExternalLink, Sparkles, Filter, CheckCircle2, UserCheck
} from 'lucide-react';

const TeacherLeavesPage = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'APPROVED', remarks: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadLeaves = async () => {
    try {
      const res = await api.get('/leaves/applications');
      setLeaves(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewModal) return;
    setSubmittingReview(true);
    try {
      await api.put(`/leaves/applications/${reviewModal.id}/review`, reviewForm);
      setReviewModal(null);
      setReviewForm({ status: 'APPROVED', remarks: '' });
      await loadLeaves();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Error updating leave application');
    } finally {
      setSubmittingReview(false);
    }
  };

  const pendingCount = leaves.filter((l) => l.status === 'PENDING').length;
  const approvedCount = leaves.filter((l) => l.status === 'APPROVED').length;
  const rejectedCount = leaves.filter((l) => l.status === 'REJECTED').length;

  const filteredLeaves = leaves.filter((l) => {
    if (statusFilter === 'ALL') return true;
    return l.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">
            Student Leave Applications & OCR Analysis
          </h1>
          <p className="text-slate-600 text-sm">
            Review leave requests, medical certificates, and automated OCR telemetry for your department and advised classes
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold overflow-x-auto max-w-full">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({leaves.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 whitespace-nowrap ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Pending</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-600 text-white">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[700px]">
            <thead className="bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-3.5">Student</th>
                <th className="px-6 py-3.5">Course / Subject</th>
                <th className="px-6 py-3.5">Leave Period</th>
                <th className="px-6 py-3.5">Reason & Document</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-xs text-slate-400">
                    {statusFilter === 'ALL'
                      ? 'No leave applications submitted yet.'
                      : `No ${statusFilter.toLowerCase()} leave applications found.`}
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((l) => {
                  const doc = l.documents && l.documents.length > 0 ? l.documents[0] : null;
                  return (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{l.student_name}</div>
                        <div className="font-mono text-xs text-slate-500">{l.register_number}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                            l.day_type === 'HALF_DAY' || l.subject_id
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {l.day_type === 'HALF_DAY' || l.subject_id ? 'HALF DAY' : 'FULL DAY'}
                          </span>
                          <span>{l.subject_name || 'All Subjects'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 font-medium whitespace-nowrap">
                        {l.start_date} &rarr; {l.end_date}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 max-w-xs">
                        <div className="truncate font-medium">{l.reason}</div>
                        {doc ? (
                          <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-teal-700">
                            <span className="font-semibold truncate max-w-[120px]">📎 {doc.file_name}</span>
                            {doc.ocr_result && (
                              <span className="px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200 font-mono text-[10px]">
                                {Math.round(doc.ocr_result.confidence * 100)}% OCR
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">No doc attached</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              l.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : l.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                            }`}
                          >
                            {l.status}
                          </span>
                          {l.reviewed_by_name && (
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]" title={l.reviewed_by_name}>
                              by {l.reviewed_by_name}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setReviewModal(l);
                            setReviewForm({
                              status: l.status === 'PENDING' ? 'APPROVED' : l.status,
                              remarks: l.review_remarks || ''
                            });
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                        >
                          {l.status === 'PENDING' ? 'Review & OCR \u2192' : 'View Details \u2192'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  Leave Application #{reviewModal.id}
                </h3>
                <p className="text-xs text-slate-500">
                  Status:{' '}
                  <span className="font-bold text-slate-700">{reviewModal.status}</span>
                </p>
              </div>
              <button
                onClick={() => setReviewModal(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-semibold">Student:</span>{' '}
                <span className="font-bold text-slate-800">
                  {reviewModal.student_name} ({reviewModal.register_number})
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Leave Scope:</span>{' '}
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                  reviewModal.day_type === 'HALF_DAY' || reviewModal.subject_id
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-slate-100 text-slate-800'
                }`}>
                  {reviewModal.day_type === 'HALF_DAY' || reviewModal.subject_id ? 'HALF DAY' : 'FULL DAY'}
                </span>
                <span className="ml-2 font-bold text-slate-800">
                  {reviewModal.subject_name || 'All Subjects (Full Day Leave)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Leave Duration:</span>{' '}
                <span className="font-bold text-slate-800">
                  {reviewModal.start_date} &rarr; {reviewModal.end_date}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Stated Reason:</span>{' '}
                <p className="mt-1 text-slate-700 bg-white p-2.5 rounded-xl border">
                  {reviewModal.reason}
                </p>
              </div>
            </div>

            {/* Attached Documents & OCR Telemetry */}
            {reviewModal.documents && reviewModal.documents.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Attached Document & OCR Telemetry</span>
                  <span className="text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full font-semibold">
                    {reviewModal.documents.length} File(s)
                  </span>
                </div>
                {reviewModal.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 bg-slate-900 text-white rounded-2xl text-xs space-y-2.5 shadow"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div
                        className="font-semibold text-slate-200 truncate max-w-[220px]"
                        title={doc.file_name}
                      >
                        📎 {doc.file_name}
                      </div>
                      <div className="flex items-center space-x-2">
                        {doc.ocr_result && (
                          <span className="text-[10px] px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded font-mono">
                            {Math.round(doc.ocr_result.confidence * 100)}% Confidence
                          </span>
                        )}
                        <a
                          href={doc.file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-teal-400 hover:text-teal-300 underline font-semibold flex items-center"
                        >
                          <ExternalLink className="w-3 h-3 mr-0.5" /> View
                        </a>
                      </div>
                    </div>

                    {doc.ocr_result ? (
                      <div className="space-y-1.5 pt-0.5">
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-400">OCR Dates:</span>{' '}
                            <span className="font-semibold text-teal-300">
                              {doc.ocr_result.detected_dates || 'None'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">OCR Reason:</span>{' '}
                            <span className="font-semibold text-teal-300">
                              {doc.ocr_result.detected_reason || 'N/A'}
                            </span>
                          </div>
                        </div>
                        {doc.ocr_result.detected_student_info && (
                          <div className="text-[11px]">
                            <span className="text-slate-400">OCR Student:</span>{' '}
                            <span className="font-semibold text-slate-200">
                              {doc.ocr_result.detected_student_info}
                            </span>
                          </div>
                        )}
                        {doc.ocr_result.detected_day_type && (
                          <div className="text-[11px]">
                            <span className="text-slate-400">OCR Scope:</span>{' '}
                            <span className="font-semibold text-teal-300">
                              {doc.ocr_result.detected_day_type === 'HALF_DAY' ? 'Half Day' : 'Full Day'}
                              {doc.ocr_result.detected_subject ? ` (${doc.ocr_result.detected_subject})` : ''}
                            </span>
                          </div>
                        )}
                        <details className="cursor-pointer text-[10px] text-teal-400 pt-1">
                          <summary className="font-semibold hover:underline">
                            View Raw Extracted Text
                          </summary>
                          <pre className="mt-1 p-2 bg-slate-950 text-slate-300 rounded-lg text-[10px] font-mono whitespace-pre-wrap max-h-24 overflow-y-auto border border-slate-800">
                            {doc.ocr_result.raw_text}
                          </pre>
                        </details>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">
                        No OCR telemetry available for this document.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Review Decision
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, status: 'APPROVED' })}
                    className={`py-2.5 rounded-xl font-bold text-xs border transition-all flex items-center justify-center space-x-1.5 ${
                      reviewForm.status === 'APPROVED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve Leave</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, status: 'REJECTED' })}
                    className={`py-2.5 rounded-xl font-bold text-xs border transition-all flex items-center justify-center space-x-1.5 ${
                      reviewForm.status === 'REJECTED'
                        ? 'bg-rose-600 text-white border-rose-600 shadow'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Leave</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Faculty Review Remarks
                </label>
                <textarea
                  rows="3"
                  value={reviewForm.remarks}
                  onChange={(e) => setReviewForm({ ...reviewForm, remarks: e.target.value })}
                  placeholder="e.g. Verified medical records and approved."
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModal(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 shadow disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherLeavesPage;
