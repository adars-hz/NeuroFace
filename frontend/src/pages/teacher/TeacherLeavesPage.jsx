import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FileText, CheckCircle, XCircle, Clock, Eye, AlertCircle } from 'lucide-react';

const TeacherLeavesPage = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'APPROVED', remarks: '' });

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
    try {
      await api.put(`/leaves/applications/${reviewModal.id}/review`, reviewForm);
      setReviewModal(null);
      setReviewForm({ status: 'APPROVED', remarks: '' });
      loadLeaves();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Student Leave Applications & OCR Analysis</h1>
        <p className="text-slate-600 text-sm">Review leave requests assisted by automated OCR document extraction</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase">
            <tr>
              <th className="px-6 py-3.5">Student</th>
              <th className="px-6 py-3.5">Course / Subject</th>
              <th className="px-6 py-3.5">Leave Period</th>
              <th className="px-6 py-3.5">Reason Given</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leaves.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-xs text-slate-400">
                  No leave applications submitted yet.
                </td>
              </tr>
            ) : (
              leaves.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{l.student_name}</div>
                    <div className="font-mono text-xs text-slate-500">{l.register_number}</div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-700">
                    {l.subject_name || 'All Subjects'}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                    {l.start_date} &rarr; {l.end_date}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                    {l.reason}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      l.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      l.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setReviewModal(l)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                    >
                      Review & OCR &rarr;
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Review Leave Application #{reviewModal.id}
              </h3>
              <button onClick={() => setReviewModal(null)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-semibold">Student:</span>{' '}
                <span className="font-bold text-slate-800">{reviewModal.student_name} ({reviewModal.register_number})</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Leave Duration:</span>{' '}
                <span className="font-bold text-slate-800">{reviewModal.start_date} to {reviewModal.end_date}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Stated Reason:</span>{' '}
                <p className="mt-1 text-slate-700 bg-white p-2.5 rounded-xl border">{reviewModal.reason}</p>
              </div>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Review Decision
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, status: 'APPROVED' })}
                    className={`py-2.5 rounded-xl font-bold text-xs border transition-all ${
                      reviewForm.status === 'APPROVED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Approve Leave
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, status: 'REJECTED' })}
                    className={`py-2.5 rounded-xl font-bold text-xs border transition-all ${
                      reviewForm.status === 'REJECTED'
                        ? 'bg-rose-600 text-white border-rose-600 shadow'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Reject Leave
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
                  placeholder="e.g. Medical certificate verified. Approved."
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
                  className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 shadow"
                >
                  Submit Decision
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
