import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CheckSquare, Plus, Trash2, Shield, BookOpen, Award } from 'lucide-react';

const AssignmentsPage = () => {
  const { user } = useAuth();
  const isAdvisor = user?.is_class_advisor && !user?.is_hod && user?.role !== 'ADMIN';
  const advisedClasses = user?.advised_class_names || [];
  const advisedClassIds = user?.advised_class_ids || [];

  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState({
    teacher_id: '',
    subject_id: '',
    class_id: ''
  });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [aRes, tRes, sRes, cRes] = await Promise.all([
        api.get('/admin/assignments'),
        api.get('/admin/teachers'),
        api.get('/admin/subjects'),
        api.get('/admin/classes')
      ]);
      setAssignments(aRes.data);
      setTeachers(tRes.data);
      setSubjects(sRes.data);

      const availableClasses = isAdvisor
        ? cRes.data.filter((c) => advisedClassIds.includes(c.id))
        : cRes.data;
      setClasses(availableClasses);

      if (isAdvisor && advisedClassIds.length > 0 && !formData.class_id) {
        setFormData((prev) => ({ ...prev, class_id: String(advisedClassIds[0]) }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/assignments', formData);
      setFormData({
        teacher_id: '',
        subject_id: '',
        class_id: isAdvisor && advisedClassIds.length > 0 ? String(advisedClassIds[0]) : ''
      });
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Revoke this subject assignment from the faculty member?')) return;
    try {
      await api.delete(`/admin/assignments/${id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center space-x-2">
          {isAdvisor && <Award className="w-6 h-6 text-teal-600" />}
          <h1 className="text-2xl font-bold text-slate-900 font-heading">
            {isAdvisor ? `Class Advisor: Assign Teachers & Slots` : `Teacher Subject & Class Assignments`}
          </h1>
        </div>
        <p className="text-slate-600 text-sm mt-1">
          {isAdvisor
            ? `Assign faculty members to subject courses and timetable slots for your advised class (${advisedClasses.join(', ') || 'Class'}).`
            : `Strictly configure which courses faculty members can conduct attendance sessions for.`}
        </p>
      </div>

      {isAdvisor && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center space-x-3 text-sm text-teal-900">
          <Award className="w-5 h-5 text-teal-600 flex-shrink-0" />
          <div>
            <span className="font-bold">Privileged Teacher Access:</span> As Class Advisor for{' '}
            <span className="font-semibold underline">{advisedClasses.join(', ')}</span>, you have elevated authority to assign teachers for each subject and slot without requiring approval.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assignments Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-3.5">Faculty Member</th>
                <th className="px-6 py-3.5">Assigned Subject</th>
                <th className="px-6 py-3.5">Target Class</th>
                <th className="px-6 py-3.5 text-right">Revoke</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    <div>{a.teacher_name}</div>
                    <div className="text-xs font-mono text-slate-500">{a.teacher_code}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-teal-700">{a.subject_name}</div>
                    <div className="text-xs font-mono text-slate-500">{a.subject_code}</div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-700">
                    {a.class_name}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Revoke Assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Create Assignment Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-4">
          <h3 className="font-bold text-slate-900 font-heading">Assign Teacher to Class Course</h3>
          <form onSubmit={handleAssign} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Faculty Member</label>
              <select
                required
                value={formData.teacher_id}
                onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl"
              >
                <option value="">Select Faculty</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name} ({t.teacher_code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Subject / Course</label>
              <select
                required
                value={formData.subject_id}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl"
              >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Class / Batch</label>
              <select
                required
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 shadow-sm transition-colors"
            >
              Authorize Assignment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssignmentsPage;
