import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Camera, BookOpen, Clock, Users, CheckCircle2,
  Calendar, ArrowRight, Award, ShieldAlert, FileText,
  AlertCircle, Sparkles, ExternalLink, CheckCircle, XCircle
} from 'lucide-react';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'APPROVED', remarks: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadTeacherData = async () => {
    try {
      const [aRes, sRes, lRes, cRes] = await Promise.all([
        api.get('/teacher/my-assignments'),
        api.get('/teacher/my-sessions'),
        api.get('/leaves/applications'),
        api.get('/leaves/pending-count')
      ]);
      setAssignments(aRes.data);
      setSessions(sRes.data);
      setLeaves(lRes.data);
      setPendingCount(cRes.data.pending_count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeacherData();
  }, []);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewModal) return;
    setSubmittingReview(true);
    try {
      await api.put(`/leaves/applications/${reviewModal.id}/review`, reviewForm);
      setReviewModal(null);
      setReviewForm({ status: 'APPROVED', remarks: '' });
      await loadTeacherData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Error reviewing leave application');
    } finally {
      setSubmittingReview(false);
    }
  };

  const pendingLeaves = leaves.filter((l) => l.status === 'PENDING');

  return (
    <div className="space-y-8">
      {/* Teacher Hero Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
              {user?.is_hod
                ? 'Head of Department (HOD)'
                : user?.is_class_advisor
                ? `Class Advisor: ${user?.advised_class_names?.join(', ') || 'Assigned'}`
                : 'Faculty Member'}
            </span>
            {user?.is_hod && (
              <span className="text-xs font-semibold text-amber-300 flex items-center">
                <Award className="w-3.5 h-3.5 mr-1" /> Elevated Privileges Active
              </span>
            )}
            {user?.is_class_advisor && !user?.is_hod && (
              <span className="text-xs font-semibold text-teal-300 flex items-center">
                <Award className="w-3.5 h-3.5 mr-1" /> Class Advisor Privileges
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold font-heading text-white">
            Welcome back, {user?.full_name}!
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Conduct multi-face AI attendance sessions, track classroom reports, and review student leave letters with automated OCR verification.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/teacher/start-session"
              className="inline-flex items-center px-5 py-3 rounded-xl bg-teal-500 text-slate-950 font-bold text-sm hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20"
            >
              <Camera className="w-4 h-4 mr-2" />
              Start Attendance Session
            </Link>
            <Link
              to="/teacher/leaves"
              className="inline-flex items-center px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition-colors border border-slate-700"
            >
              <FileText className="w-4 h-4 mr-2 text-teal-400" />
              Review Leaves & OCR
              {pendingCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* STUDENT LEAVES & MEDICAL CERTIFICATES ACTION CENTER */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                Student Leaves & Medical Certificates
              </h2>
              {pendingCount > 0 ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                  {pendingCount} Action Required
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Up to Date
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {user?.is_hod
                ? 'Department-wide leave requests and medical certificates requiring HOD review'
                : user?.is_class_advisor
                ? `Leave letters from students in your advised class (${user?.advised_class_names?.join(', ') || 'Class'})`
                : 'Leave requests for your assigned courses'}
            </p>
          </div>

          <Link
            to="/teacher/leaves"
            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center space-x-1"
          >
            <span>Open Leaves Review Hub ({leaves.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {pendingLeaves.length === 0 ? (
          <div className="py-6 px-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No Pending Leave Applications</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              All leave requests and medical certificates submitted by students have been reviewed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingLeaves.slice(0, 6).map((leave) => {
              const doc = leave.documents && leave.documents.length > 0 ? leave.documents[0] : null;
              return (
                <div
                  key={leave.id}
                  className="p-5 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-white shadow-sm space-y-4 hover:border-amber-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{leave.student_name}</h4>
                        <span className="font-mono text-xs text-slate-500">{leave.register_number}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        PENDING
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center text-slate-600">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-teal-600 shrink-0" />
                        <span className="font-medium">{leave.start_date} &rarr; {leave.end_date}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-600">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                          leave.day_type === 'HALF_DAY' || leave.subject_id
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {leave.day_type === 'HALF_DAY' || leave.subject_id ? 'HALF DAY' : 'FULL DAY'}
                        </span>
                        <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{leave.subject_name || 'All Subjects'}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs italic">
                        "{leave.reason}"
                      </div>
                    </div>

                    {/* Attached OCR Document Telemetry pill */}
                    {doc ? (
                      <div className="p-2.5 rounded-xl bg-slate-900 text-white text-[11px] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold truncate max-w-[150px] text-teal-300" title={doc.file_name}>
                            📎 {doc.file_name}
                          </span>
                          {doc.ocr_result && (
                            <span className="px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-mono text-[10px]">
                              {Math.round(doc.ocr_result.confidence * 100)}% OCR
                            </span>
                          )}
                        </div>
                        {doc.ocr_result?.detected_reason && (
                          <p className="text-[10px] text-slate-300 truncate">
                            <span className="text-slate-400">OCR Detected:</span> {doc.ocr_result.detected_reason}
                          </p>
                        )}
                        <a
                          href={doc.file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-[10px] text-teal-400 hover:text-teal-300 underline font-semibold"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" /> View Uploaded File
                        </a>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">No document attached.</div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Submitted {new Date(leave.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => {
                        setReviewModal(leave);
                        setReviewForm({ status: 'APPROVED', remarks: '' });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-sm"
                    >
                      Review & Decide &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Authorized Courses / Assigned Subjects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-heading">My Assigned Courses & Classes</h2>
            <p className="text-xs text-slate-500">Strictly authorized subjects assigned by administration</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg border border-teal-200">
            {assignments.length} Authorized Courses
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assignments.map((a) => (
            <div key={a.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-teal-300 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-teal-700 uppercase px-2 py-0.5 bg-teal-50 rounded border border-teal-200">
                    {a.subject_code}
                  </span>
                  <h3 className="font-bold text-slate-900 font-heading text-base mt-2">{a.subject_name}</h3>
                </div>
                <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 flex items-center">
                  <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  {a.class_name}
                </span>
                <Link
                  to={`/teacher/start-session?assignment=${a.id}`}
                  className="font-bold text-teal-600 hover:text-teal-700 flex items-center"
                >
                  Start Now &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Sessions Table */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 font-heading mb-3">Recent Attendance Sessions</h2>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[640px]">
              <thead className="bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5">Course / Subject</th>
                  <th className="px-6 py-3.5">Class Section</th>
                  <th className="px-6 py-3.5">Slot / Duration</th>
                  <th className="px-6 py-3.5">Present Count</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.slice(0, 8).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 text-xs text-slate-600 font-medium">
                      {s.session_date} ({new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      {s.subject_name}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-600">
                      {s.class_name}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-500 font-mono">
                      {s.slot_name}
                    </td>
                    <td className="px-6 py-3.5 text-xs font-bold text-teal-700">
                      {s.present_count} / {s.total_enrolled} Present
                    </td>
                    <td className="px-6 py-3.5 flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        s.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {s.status}
                      </span>
                      {s.status === 'ACTIVE' && (
                        <Link
                          to={`/teacher/live-session/${s.id}`}
                          className="text-xs font-bold text-teal-600 hover:text-teal-700 underline"
                        >
                          Open Camera &rarr;
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DASHBOARD REVIEW MODAL */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  Review Leave Application #{reviewModal.id}
                </h3>
                <p className="text-xs text-slate-500">
                  {user?.is_hod ? 'HOD Authorization' : user?.is_class_advisor ? 'Class Advisor Authorization' : 'Faculty Authorization'}
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
                <span className="font-bold text-slate-800">{reviewModal.student_name} ({reviewModal.register_number})</span>
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
                <span className="font-bold text-slate-800">{reviewModal.start_date} &rarr; {reviewModal.end_date}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Stated Reason:</span>{' '}
                <p className="mt-1 text-slate-700 bg-white p-2.5 rounded-xl border">{reviewModal.reason}</p>
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
                  <div key={doc.id} className="p-3.5 bg-slate-900 text-white rounded-2xl text-xs space-y-2.5 shadow">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="font-semibold text-slate-200 truncate max-w-[220px]" title={doc.file_name}>
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
                            <span className="font-semibold text-teal-300">{doc.ocr_result.detected_dates || 'None'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">OCR Reason:</span>{' '}
                            <span className="font-semibold text-teal-300">{doc.ocr_result.detected_reason || 'N/A'}</span>
                          </div>
                        </div>
                        {doc.ocr_result.detected_student_info && (
                          <div className="text-[11px]">
                            <span className="text-slate-400">OCR Student:</span>{' '}
                            <span className="font-semibold text-slate-200">{doc.ocr_result.detected_student_info}</span>
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
                          <summary className="font-semibold hover:underline">View Raw Extracted Text</summary>
                          <pre className="mt-1 p-2 bg-slate-950 text-slate-300 rounded-lg text-[10px] font-mono whitespace-pre-wrap max-h-24 overflow-y-auto border border-slate-800">
                            {doc.ocr_result.raw_text}
                          </pre>
                        </details>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">No OCR telemetry available for this document.</div>
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
                  placeholder="e.g. Leave letter and medical record verified. Approved."
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

export default TeacherDashboard;
