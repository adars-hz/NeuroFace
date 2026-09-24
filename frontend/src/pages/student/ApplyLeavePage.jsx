import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FileText, Upload, Sparkles, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

const ApplyLeavePage = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [documentId, setDocumentId] = useState(null);

  const [formData, setFormData] = useState({
    subject_id: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get('/admin/subjects');
        setSubjects(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSubjects();
  }, []);

  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);
    setUploading(true);
    setOcrData(null);

    const data = new FormData();
    data.append('file', selected);

    try {
      const res = await api.post('/leaves/upload-document', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDocumentId(res.data.document_id);
      setOcrData(res.data.ocr);

      // Pre-fill reason if OCR detected sickness keywords
      if (res.data.ocr?.detected_reason) {
        setFormData((prev) => ({
          ...prev,
          reason: prev.reason || res.data.ocr.detected_reason
        }));
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to upload document or perform OCR.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/leaves/apply', {
        subject_id: formData.subject_id ? parseInt(formData.subject_id) : null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason,
        document_id: documentId
      });
      setMsg('Leave application successfully submitted for faculty and HOD review!');
      setFormData({ subject_id: '', start_date: '', end_date: '', reason: '' });
      setOcrData(null);
      setFile(null);
      setDocumentId(null);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error submitting leave application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Submit Leave Application</h1>
        <p className="text-slate-600 text-sm">
          Upload medical certificates or leave letters. Our automated OCR parser will assist with text extraction.
        </p>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{msg}</span>
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
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
                {file ? file.name : 'Click to upload certificate (PNG, JPG, PDF)'}
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
          <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-teal-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>OCR Extracted Telemetry</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono">
                {Math.round(ocrData.confidence * 100)}% Confidence
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Detected Dates:</span>{' '}
                <span className="font-semibold text-white">{ocrData.detected_dates || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-400">Detected Reason:</span>{' '}
                <span className="font-semibold text-white">{ocrData.detected_reason || 'Medical / Sickness'}</span>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                Raw Extracted OCR Text:
              </div>
              <pre className="p-2.5 rounded-xl bg-slate-950 text-[11px] font-mono text-slate-300 max-h-24 overflow-y-auto whitespace-pre-wrap border border-slate-800">
                {ocrData.raw_text}
              </pre>
            </div>
          </div>
        )}

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Applicable Course (Optional)</label>
            <select
              value={formData.subject_id}
              onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl"
            >
              <option value="">All Subjects (Full Day Leave)</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl"
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
              placeholder="e.g. Severe viral fever and hospitalized. Doctor advised 3 days bed rest."
              className="w-full px-3 py-2 border rounded-xl text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting Application...' : 'Submit Leave Application'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ApplyLeavePage;
