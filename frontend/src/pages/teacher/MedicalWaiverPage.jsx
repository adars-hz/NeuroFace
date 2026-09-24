import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Award, FileCheck2, Plus, AlertCircle, CheckCircle2, Shield } from 'lucide-react';

const MedicalWaiverPage = () => {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [msg, setMsg] = useState('');
  const [formData, setFormData] = useState({
    student_id: '',
    subject_id: '',
    waived_classes_count: 2,
    remarks: ''
  });

  const loadData = async () => {
    try {
      const [sRes, subRes] = await Promise.all([
        api.get('/admin/students'),
        api.get('/admin/subjects')
      ]);
      setStudents(sRes.data);
      setSubjects(subRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGrantWaiver = async (e) => {
    e.preventDefault();
    try {
      await api.post('/teacher/hod/grant-medical-waiver', {
        student_id: parseInt(formData.student_id),
        subject_id: parseInt(formData.subject_id),
        waived_classes_count: parseInt(formData.waived_classes_count),
        remarks: formData.remarks
      });
      setShowModal(false);
      setFormData({ student_id: '', subject_id: '', waived_classes_count: 2, remarks: '' });
      setMsg('Official medical attendance waiver granted! Student effective attendance has been recalculated.');
      setTimeout(() => setMsg(''), 4500);
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 mb-1">
            <Award className="w-3.5 h-3.5 mr-1" /> HOD Designated Authority
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Medical Attendance Waivers</h1>
          <p className="text-slate-600 text-sm">Approve official medical certificate waivers to legally compensate missed lectures</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Grant Medical Waiver
        </button>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{msg}</span>
        </div>
      )}

      {/* Information Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="font-bold text-slate-900 font-heading text-sm flex items-center space-x-2">
          <Shield className="w-4 h-4 text-amber-600" />
          <span>University Medical Waiver Policy & Audit Guidelines</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Per institutional regulations, medical waivers do <b>not</b> delete original lecture absences. Instead, approved medical waivers append credit towards the student's effective attendance score:
          <span className="block mt-1 font-mono text-teal-700 font-semibold">
            Effective Attendance % = min(100, (Present Classes + Waived Classes) / Total Sessions Held * 100)
          </span>
          Every medical waiver granted is permanently recorded in the immutable compliance audit log.
        </p>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Grant HOD Medical Waiver
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <form onSubmit={handleGrantWaiver} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Student</label>
                <select
                  required
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  <option value="">Select Student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.register_number})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Course / Subject</label>
                <select
                  required
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Number of Missed Classes to Waive
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  required
                  value={formData.waived_classes_count}
                  onChange={(e) => setFormData({ ...formData, waived_classes_count: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Official Remarks / Certificate Reference
                </label>
                <textarea
                  rows="3"
                  required
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. Verified Govt Hospital certificate for viral fever (Dates: 21-23 Sep)"
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 shadow"
                >
                  Confirm & Apply Waiver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalWaiverPage;
