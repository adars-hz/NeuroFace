import React, { useState, useEffect } from 'react';
import api, { assignClassAdvisor } from '../../services/api';
import { BookOpen, Layers, Clock, Plus, Building2, Award, UserCheck, X } from 'lucide-react';

const AcademicSetupPage = () => {
  const [activeTab, setActiveTab] = useState('classes');
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [slots, setSlots] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [deptForm, setDeptForm] = useState({ code: '', name: '' });
  const [classForm, setClassForm] = useState({ name: '', department_id: '', semester: 1, academic_year: '2025-2026' });
  const [subForm, setSubForm] = useState({ code: '', name: '', department_id: '', semester: 1, total_credits: 4 });

  // Class Advisor Modal
  const [advisorModalClass, setAdvisorModalClass] = useState(null);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState('');
  const [advisorSaving, setAdvisorSaving] = useState(false);

  const loadData = async () => {
    try {
      const [dRes, cRes, sRes, slRes, tRes] = await Promise.all([
        api.get('/admin/departments'),
        api.get('/admin/classes'),
        api.get('/admin/subjects'),
        api.get('/admin/slots'),
        api.get('/admin/teachers')
      ]);
      setDepartments(dRes.data);
      setClasses(cRes.data);
      setSubjects(sRes.data);
      setSlots(slRes.data);
      setTeachers(tRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddDept = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/departments', deptForm);
      setDeptForm({ code: '', name: '' });
      if (res.data?.status === 'PENDING_APPROVAL') {
        alert(res.data.message || 'Department creation submitted for Admin approval.');
      }
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/classes', classForm);
      setClassForm({ name: '', department_id: '', semester: 1, academic_year: '2025-2026' });
      if (res.data?.status === 'PENDING_APPROVAL') {
        alert(res.data.message || 'Class creation submitted for Admin approval.');
      }
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/subjects', subForm);
      setSubForm({ code: '', name: '', department_id: '', semester: 1, total_credits: 4 });
      if (res.data?.status === 'PENDING_APPROVAL') {
        alert(res.data.message || 'Subject creation submitted for Admin approval.');
      }
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Academic Curriculum & Classes</h1>
        <p className="text-slate-600 text-sm">Define departments, classes/batches, subjects, and timetable lecture periods</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('classes')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'classes' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Classes & Batches ({classes.length})
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'subjects' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Subjects / Courses ({subjects.length})
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'departments' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Departments ({departments.length})
        </button>
        <button
          onClick={() => setActiveTab('slots')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'slots' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Timetable Slots ({slots.length})
        </button>
      </div>

      {/* TAB: CLASSES */}
      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[640px]">
              <thead className="bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3">Class Name</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Semester</th>
                  <th className="px-6 py-3">Students</th>
                  <th className="px-6 py-3">Class Advisor</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-900">{c.name}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{c.department_name}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">Semester {c.semester}</td>
                    <td className="px-6 py-4 text-xs font-bold text-teal-600">{c.student_count} Enrolled</td>
                    <td className="px-6 py-4">
                      {c.class_advisor_name ? (
                        <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                          <Award className="w-3.5 h-3.5 mr-1 text-teal-600" />
                          <span>{c.class_advisor_name}</span>
                          <span className="ml-1 text-[10px] text-teal-600 font-mono">({c.class_advisor_code})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No advisor assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setAdvisorModalClass(c);
                          setSelectedAdvisorId(c.class_advisor_id ? String(c.class_advisor_id) : '');
                        }}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-colors border border-slate-200"
                        title="Designate faculty member as Class Advisor"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1 text-teal-600" />
                        {c.class_advisor_id ? 'Change' : 'Assign Advisor'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-4">
            <h3 className="font-bold text-slate-900 font-heading">Add New Class Batch</h3>
            <form onSubmit={handleAddClass} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Class / Batch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MCA S4 (2026)"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
                <select
                  required
                  value={classForm.department_id}
                  onChange={(e) => setClassForm({ ...classForm, department_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Semester</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={classForm.semester}
                    onChange={(e) => setClassForm({ ...classForm, semester: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Year</label>
                  <input
                    type="text"
                    value={classForm.academic_year}
                    onChange={(e) => setClassForm({ ...classForm, academic_year: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700"
              >
                Create Class
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB: SUBJECTS */}
      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[640px]">
              <thead className="bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Subject Name</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Credits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-slate-700">{s.code}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{s.name}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{s.department_name}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">{s.total_credits} Credits</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-4">
            <h3 className="font-bold text-slate-900 font-heading">Add Course Subject</h3>
            <form onSubmit={handleAddSubject} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Subject Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MCA304"
                  value={subForm.code}
                  onChange={(e) => setSubForm({ ...subForm, code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deep Learning & Computer Vision"
                  value={subForm.name}
                  onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
                <select
                  required
                  value={subForm.department_id}
                  onChange={(e) => setSubForm({ ...subForm, department_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Semester</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={subForm.semester}
                    onChange={(e) => setSubForm({ ...subForm, semester: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={subForm.total_credits}
                    onChange={(e) => setSubForm({ ...subForm, total_credits: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700"
              >
                Create Subject
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[640px]">
              <thead className="bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Department Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-slate-700">{d.code}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{d.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-4">
            <h3 className="font-bold text-slate-900 font-heading">Add Department</h3>
            <form onSubmit={handleAddDept} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MCA or CSE"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Applications"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700"
              >
                Create Department
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB: TIMETABLE SLOTS */}
      {activeTab === 'slots' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[400px]">
            <thead className="bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-3">Slot Title</th>
                <th className="px-6 py-3">Start Time</th>
                <th className="px-6 py-3">End Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {slots.map((sl) => (
                <tr key={sl.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-900">{sl.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">{sl.start_time}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">{sl.end_time}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Class Advisor Assignment Modal */}
      {advisorModalClass && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 font-heading">Assign Class Advisor</h3>
              </div>
              <button
                onClick={() => setAdvisorModalClass(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="font-bold text-slate-800 text-sm">{advisorModalClass.name}</div>
                <div className="text-slate-500 mt-0.5">{advisorModalClass.department_name} • Semester {advisorModalClass.semester}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Faculty Member
                </label>
                <select
                  value={selectedAdvisorId}
                  onChange={(e) => setSelectedAdvisorId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- No Advisor (Unassign) --</option>
                  {teachers
                    .filter((t) => !advisorModalClass.department_id || t.department_id === advisorModalClass.department_id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.teacher_code}) - {t.designation.replace('_', ' ')}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-2">
                  The designated Class Advisor can download class attendance reports and assign faculty to timetable slots.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdvisorModalClass(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={advisorSaving}
                  onClick={async () => {
                    setAdvisorSaving(true);
                    try {
                      await assignClassAdvisor(
                        advisorModalClass.id,
                        selectedAdvisorId ? parseInt(selectedAdvisorId) : null
                      );
                      setAdvisorModalClass(null);
                      loadData();
                    } catch (err) {
                      alert(err.response?.data?.detail || err.message);
                    } finally {
                      setAdvisorSaving(false);
                    }
                  }}
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {advisorSaving ? 'Saving...' : 'Save Advisor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicSetupPage;
