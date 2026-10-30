import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  FileText, Upload, Sparkles, CheckCircle2, AlertCircle,
  Calendar, ExternalLink, Clock, ShieldCheck, ArrowRight,
  BookOpen, Check
} from 'lucide-react';

const ApplyLeavePage = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [documentId, setDocumentId] = useState(null);

  const [formData, setFormData] = useState({
    day_type: 'FULL_DAY', // 'FULL_DAY' or 'HALF_DAY'
    subject_id: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/admin/subjects');
      setSubjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyLeaves = async () => {
    try {
      const res = await api.get('/leaves/applications');
      setMyLeaves(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchMyLeaves();
  }, []);

  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);
    setUploading(true);
    setOcrData(null);
    setMsg('');

    const data = new FormData();
    data.append('file', selected);

    try {
      const res = await api.post('/leaves/upload-document', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDocumentId(res.data.document_id);
      const ocr = res.data.ocr;
      setOcrData(ocr);

      // Determine day_type from OCR
      const detectedDayType = ocr?.detected_day_type === 'HALF_DAY' ? 'HALF_DAY' : 'FULL_DAY';

      // Pre-fill form fields
      setFormData((prev) => {
        let matchedSubId = prev.subject_id;
        if (detectedDayType === 'HALF_DAY') {
          if (ocr?.detected_subject_id) {
            matchedSubId = ocr.detected_subject_id.toString();
          }
        } else {
          matchedSubId = ''; // Full Day applies to all subjects
        }

        return {
          ...prev,
          day_type: detectedDayType,
          subject_id: matchedSubId,
          reason: prev.reason || ocr?.detected_reason || '',
          start_date: prev.start_date || ocr?.start_date || '',
          end_date: prev.end_date || ocr?.end_date || ''
        };
      });
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to upload document or perform OCR.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.start_date || !formData.end_date || !formData.reason) {
      alert('Please provide start date, end date, and reason for leave.');
      return;
    }

    if (formData.day_type === 'HALF_DAY' && !formData.subject_id) {
      alert('Please select the applicable course/subject for your half-day leave.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/leaves/apply', {
        subject_id: formData.day_type === 'FULL_DAY' ? null : (formData.subject_id ? parseInt(formData.subject_id) : null),
        day_type: formData.day_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason,
        document_id: documentId
      });
      setMsg('Leave application successfully submitted! Your Class Advisor and HOD can now review it.');
      setFormData({
        day_type: 'FULL_DAY',
        subject_id: '',
        start_date: '',
        end_date: '',
        reason: ''
      });
      setOcrData(null);
      setFile(null);
      setDocumentId(null);
      await fetchMyLeaves();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error submitting leave application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Submit Leave Application</h1>
        <p className="text-slate-600 text-sm">
          Upload medical certificates or leave letters. Automated OCR detects dates, reasons, and whether the leave is for a <strong>Full Day</strong> or <strong>Half Day</strong>.
        </p>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        {/* Document Upload Zone with OCR trigger */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Upload Leave Document / Medical Certificate
          </label>
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-teal-500 transition-colors bg-slate-50/50">
            <input
              type="file"
              id="file-upload"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer space-y-2 block">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-xs font-semibold text-slate-700">
                {file ? file.name : 'Click to select certificate or letter (PNG, JPG, PDF)'}
              </div>
              <div className="text-[11px] text-slate-400">
                Automated OCR text extraction runs immediately upon selection
              </div>
            </label>
          </div>
        </div>

        {uploading && (
          <div className="p-4 bg-teal-50 text-teal-800 border border-teal-200 rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-pulse">
            <Sparkles className="w-4 h-4" />
            <span>Scanning document with OCR neural engine...</span>
          </div>
        )}

        {/* OCR Extracted Text Preview Card */}
        {ocrData && (
          <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 space-y-3.5 shadow-lg border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-teal-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>OCR Extracted Telemetry</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  ocrData.detected_day_type === 'HALF_DAY'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                }`}>
                  {ocrData.detected_day_type === 'HALF_DAY' ? 'Half Day Detected' : 'Full Day Detected'}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-teal-300 font-mono">
                  {Math.round(ocrData.confidence * 100)}%
                </span>
              </div>
            </div>

            {/* Scope Explanation Callout */}
            <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">
                  {ocrData.detected_scope_note || 'Document parsed successfully'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  The form fields below have been pre-filled according to the detected duration and subject. You can edit them if needed before submitting.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Detected Dates:</span>{' '}
                <span className="font-semibold text-white">{ocrData.detected_dates || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-400">Detected Reason:</span>{' '}
                <span className="font-semibold text-white">{ocrData.detected_reason || 'Medical / Personal'}</span>
              </div>
              {ocrData.detected_subject_name && (
                <div className="col-span-2">
                  <span className="text-slate-400">Detected Subject:</span>{' '}
                  <span className="font-bold text-teal-300">
                    {ocrData.detected_subject_name} {ocrData.detected_subject_code ? `(${ocrData.detected_subject_code})` : ''}
                  </span>
                </div>
              )}
            </div>

            {ocrData.detected_student_info && (
              <div className="text-xs">
                <span className="text-slate-400">Detected Student:</span>{' '}
                <span className="font-semibold text-teal-300">{ocrData.detected_student_info}</span>
              </div>
            )}

            <div className="pt-1">
              <details className="cursor-pointer text-xs text-teal-400">
                <summary className="font-semibold hover:underline">View Raw Extracted Text</summary>
                <pre className="mt-2 p-2.5 rounded-xl bg-slate-950 text-[11px] font-mono text-slate-300 max-h-24 overflow-y-auto whitespace-pre-wrap border border-slate-800">
                  {ocrData.raw_text}
                </pre>
              </details>
            </div>
          </div>
        )}

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-sm">
          {/* LEAVE DURATION / SCOPE SELECTOR */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Leave Duration Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, day_type: 'FULL_DAY', subject_id: '' })}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start space-x-3 ${
                  formData.day_type === 'FULL_DAY'
                    ? 'border-teal-500 bg-teal-50/60 shadow-sm ring-1 ring-teal-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${
                  formData.day_type === 'FULL_DAY' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center space-x-1.5">
                    <span>Full Day Leave</span>
                    {formData.day_type === 'FULL_DAY' && <Check className="w-3.5 h-3.5 text-teal-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Applies to all scheduled subjects for the day
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, day_type: 'HALF_DAY' })}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start space-x-3 ${
                  formData.day_type === 'HALF_DAY'
                    ? 'border-purple-500 bg-purple-50/60 shadow-sm ring-1 ring-purple-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${
                  formData.day_type === 'HALF_DAY' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center space-x-1.5">
                    <span>Half Day / Subject Leave</span>
                    {formData.day_type === 'HALF_DAY' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Applies to a specific class or half-day session
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* APPLICABLE COURSE / SUBJECT */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {formData.day_type === 'HALF_DAY' ? (
                  <span className="text-purple-700 font-bold">
                    Applicable Course / Subject (Required for Half Day) *
                  </span>
                ) : (
                  <span>Applicable Course (Full Day applies to All Subjects)</span>
                )}
              </label>
              {formData.day_type === 'HALF_DAY' && !formData.subject_id && (
                <span className="text-[11px] text-amber-600 font-semibold animate-pulse">
                  Please select course
                </span>
              )}
            </div>

            {formData.day_type === 'FULL_DAY' ? (
              <div className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-semibold text-slate-600 flex items-center justify-between">
                <span>All Subjects (Full Day Leave)</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                  All Classes Covered
                </span>
              </div>
            ) : (
              <select
                required
                value={formData.subject_id}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-purple-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
              >
                <option value="">-- Choose Applicable Subject for Half Day --</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Reason for Leave</label>
            <textarea
              rows="3"
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g. Severe viral fever and hospitalized. Doctor advised bed rest."
              className="w-full px-3 py-2 border rounded-xl text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <span>
              {submitting
                ? 'Submitting Application to Advisor & HOD...'
                : formData.day_type === 'HALF_DAY'
                ? 'Submit Half Day Leave Application'
                : 'Submit Full Day Leave Application'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* MY SUBMITTED APPLICATIONS HISTORY */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">
              My Submitted Leave Applications
            </h3>
            <p className="text-xs text-slate-500">Track approval status from your Class Advisor and HOD</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
            {myLeaves.length} Submitted
          </span>
        </div>

        {myLeaves.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            You haven't submitted any leave applications yet.
          </div>
        ) : (
          <div className="space-y-3">
            {myLeaves.map((l) => (
              <div
                key={l.id}
                className="p-4 rounded-2xl border border-slate-200 hover:border-teal-200 transition-all space-y-2.5 bg-slate-50/50"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                      l.day_type === 'HALF_DAY' || l.subject_id
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}>
                      {l.day_type === 'HALF_DAY' || l.subject_id ? 'HALF DAY' : 'FULL DAY'}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {l.subject_name || 'All Subjects'}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-medium text-slate-600 flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {l.start_date} &rarr; {l.end_date}
                    </span>
                  </div>
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
                </div>

                <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                  {l.reason}
                </p>

                {l.documents && l.documents.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {l.documents.map((d) => (
                      <a
                        key={d.id}
                        href={d.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-[11px] px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-teal-700 hover:bg-teal-50 font-semibold"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        {d.file_name}
                        {d.ocr_result && (
                          <span className="ml-1.5 text-[10px] text-teal-600 font-mono">
                            ({Math.round(d.ocr_result.confidence * 100)}% OCR)
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                )}

                {l.reviewed_by_name && (
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
                    <span>
                      Reviewed by: <strong className="text-slate-700">{l.reviewed_by_name}</strong>
                    </span>
                    {l.review_remarks && (
                      <span className="italic text-slate-600">"{l.review_remarks}"</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplyLeavePage;
