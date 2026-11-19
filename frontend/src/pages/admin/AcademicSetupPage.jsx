import React, { useState, useEffect } from 'react';
import api, { assignClassAdvisor } from '../../services/api';
import {
  BookOpen, Layers, Clock, Plus, Building2, Award, UserCheck, X,
  Pencil, Trash2, Calendar, AlertCircle, Check
} from 'lucide-react';

const AcademicSetupPage = () => {
  const [activeTab, setActiveTab] = useState('classes');
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [slots, setSlots] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Creation Forms
  const [deptForm, setDeptForm] = useState({ code: '', name: '' });
  const [classForm, setClassForm] = useState({ name: '', department_id: '', semester: 1, academic_year: '2025-2026' });
  const [subForm, setSubForm] = useState({ code: '', name: '', department_id: '', semester: 1, total_credits: 4 });
  const [slotForm, setSlotForm] = useState({ name: '', start_time: '09:00', end_time: '10:00', day_of_week: '' });

  // Edit Modals State
  const [editDeptModal, setEditDeptModal] = useState(null);
  const [editClassModal, setEditClassModal] = useState(null);
  const [editSubjectModal, setEditSubjectModal] = useState(null);
  const [editSlotModal, setEditSlotModal] = useState(null);

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
      console.error('Failed to load academic setup data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ----------------- DEPARTMENT HANDLERS -----------------
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

  const handleSaveEditDept = async (e) => {
    e.preventDefault();
    if (!editDeptModal) return;
    try {
      await api.put(`/admin/departments/${editDeptModal.id}`, {
        code: editDeptModal.code,
        name: editDeptModal.name
      });
      setEditDeptModal(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const handleDeleteDept = async (dept) => {
    const confirmMsg = `Are you sure you want to delete department "${dept.name}" (${dept.code})?\n\nWarning: All classes and subjects under this department will be removed, and teachers/students will be unlinked.`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.delete(`/admin/departments/${dept.id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  // ----------------- CLASS HANDLERS -----------------
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

  const handleSaveEditClass = async (e) => {
    e.preventDefault();
    if (!editClassModal) return;
    try {
      await api.put(`/admin/classes/${editClassModal.id}`, {
        name: editClassModal.name,
        department_id: parseInt(editClassModal.department_id),
        semester: parseInt(editClassModal.semester),
        academic_year: editClassModal.academic_year,
        class_advisor_id: editClassModal.class_advisor_id ? parseInt(editClassModal.class_advisor_id) : 0
      });
      setEditClassModal(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const handleDeleteClass = async (cls) => {
    const confirmMsg = `Are you sure you want to delete class/batch "${cls.name}"?\n\nEnrolled students will be unassigned and timetable assignments for this class will be cleared.`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.delete(`/admin/classes/${cls.id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  // ----------------- SUBJECT HANDLERS -----------------
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

  const handleSaveEditSubject = async (e) => {
    e.preventDefault();
    if (!editSubjectModal) return;
    try {
      await api.put(`/admin/subjects/${editSubjectModal.id}`, {
        code: editSubjectModal.code,
        name: editSubjectModal.name,
        department_id: parseInt(editSubjectModal.department_id),
        semester: parseInt(editSubjectModal.semester),
        total_credits: parseInt(editSubjectModal.total_credits)
      });
      setEditSubjectModal(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const handleDeleteSubject = async (sub) => {
    const confirmMsg = `Are you sure you want to delete course "${sub.name}" (${sub.code})?\n\nWarning: All faculty assignments, sessions, and records associated with this course will be removed across the system.`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.delete(`/admin/subjects/${sub.id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  // ----------------- TIMETABLE SLOT HANDLERS -----------------
  const handleAddSlot = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/slots', {
        name: slotForm.name,
        start_time: slotForm.start_time,
        end_time: slotForm.end_time,
        day_of_week: slotForm.day_of_week || null
      });
      setSlotForm({ name: '', start_time: '09:00', end_time: '10:00', day_of_week: '' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const handleSaveEditSlot = async (e) => {
    e.preventDefault();
    if (!editSlotModal) return;
    try {
      await api.put(`/admin/slots/${editSlotModal.id}`, {
        name: editSlotModal.name,
        start_time: editSlotModal.start_time,
        end_time: editSlotModal.end_time,
        day_of_week: editSlotModal.day_of_week || null
      });
      setEditSlotModal(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const handleDeleteSlot = async (slot) => {
    if (!window.confirm(`Delete timetable slot "${slot.name}" (${slot.start_time} - ${slot.end_time})?`)) return;
    try {
      await api.delete(`/admin/slots/${slot.id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">Academic Curriculum & Scheduling</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Create, edit, and manage departments, classes/batches, curriculum courses, and timetable lecture periods
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-semibold overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('classes')}
          className={`pb-3 border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'classes' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Classes & Batches ({classes.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`pb-3 border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'subjects' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Subjects / Courses ({subjects.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-3 border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'departments' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Departments ({departments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('slots')}
          className={`pb-3 border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'slots' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Timetable Slots ({slots.length})</span>
        </button>
      </div>

      {/* ==================== TAB: CLASSES & BATCHES ==================== */}
      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" />
                Active Class Batches
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">{classes.length} registered</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                  <tr>
                    <th className="px-5 py-3">Class Name</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-3 py-3">Semester</th>
                    <th className="px-3 py-3">Students</th>
                    <th className="px-4 py-3">Class Advisor</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">
                        No classes found. Create your first class on the right.
                      </td>
                    </tr>
                  ) : (
                    classes.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">{c.name}</td>
                        <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-400">{c.department_name}</td>
                        <td className="px-3 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300">Sem {c.semester}</td>
                        <td className="px-3 py-4 text-xs font-bold text-teal-600">{c.student_count} Enrolled</td>
                        <td className="px-4 py-4">
                          {c.class_advisor_name ? (
                            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                              <Award className="w-3 h-3 mr-1 text-teal-600" />
                              <span>{c.class_advisor_name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">None</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => {
                                setAdvisorModalClass(c);
                                setSelectedAdvisorId(c.class_advisor_id ? String(c.class_advisor_id) : '');
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-700 dark:hover:text-teal-300 transition"
                              title="Assign/Change Class Advisor"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditClassModal({
                                id: c.id,
                                name: c.name,
                                department_id: c.department_id,
                                semester: c.semester,
                                academic_year: c.academic_year,
                                class_advisor_id: c.class_advisor_id || ''
                              })}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 transition"
                              title="Edit Class Details"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClass(c)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-400 transition"
                              title="Delete Class"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Class Form */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white font-heading flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-600" />
              Add New Class Batch
            </h3>
            <form onSubmit={handleAddClass} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Class / Batch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MCA S3 Batch A"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Department *</label>
                <select
                  required
                  value={classForm.department_id}
                  onChange={(e) => setClassForm({ ...classForm, department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Semester *</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    required
                    value={classForm.semester}
                    onChange={(e) => setClassForm({ ...classForm, semester: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Academic Year *</label>
                  <input
                    type="text"
                    required
                    value={classForm.academic_year}
                    onChange={(e) => setClassForm({ ...classForm, academic_year: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition shadow-md shadow-teal-600/20"
              >
                Create Class Batch
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== TAB: SUBJECTS / COURSES ==================== */}
      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-600" />
                Curriculum Courses & Subjects
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">{subjects.length} courses</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                  <tr>
                    <th className="px-5 py-3">Course Code</th>
                    <th className="px-5 py-3">Subject Name</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-3 py-3">Semester</th>
                    <th className="px-3 py-3">Credits</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {subjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">
                        No subjects registered. Add course details using the form on the right.
                      </td>
                    </tr>
                  ) : (
                    subjects.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-xs text-slate-700 dark:text-slate-300">{s.code}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">{s.name}</td>
                        <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-400">{s.department_name}</td>
                        <td className="px-3 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300">Sem {s.semester}</td>
                        <td className="px-3 py-4 text-xs font-bold text-teal-600">{s.total_credits} Credits</td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => setEditSubjectModal({
                                id: s.id,
                                code: s.code,
                                name: s.name,
                                department_id: s.department_id,
                                semester: s.semester,
                                total_credits: s.total_credits
                              })}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 transition"
                              title="Edit Course Details"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubject(s)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-400 transition"
                              title="Delete Course"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Subject Form */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white font-heading flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-600" />
              Add Course Subject
            </h3>
            <form onSubmit={handleAddSubject} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Subject Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MCA304"
                  value={subForm.code}
                  onChange={(e) => setSubForm({ ...subForm, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deep Learning & Computer Vision"
                  value={subForm.name}
                  onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Department *</label>
                <select
                  required
                  value={subForm.department_id}
                  onChange={(e) => setSubForm({ ...subForm, department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Semester *</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    required
                    value={subForm.semester}
                    onChange={(e) => setSubForm({ ...subForm, semester: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Credits *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={subForm.total_credits}
                    onChange={(e) => setSubForm({ ...subForm, total_credits: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition shadow-md shadow-teal-600/20"
              >
                Create Subject
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== TAB: DEPARTMENTS ==================== */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                Academic Departments
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">{departments.length} departments</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[500px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                  <tr>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Department Name</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {departments.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">
                        No departments found. Create your primary academic department on the right.
                      </td>
                    </tr>
                  ) : (
                    departments.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-xs text-slate-700 dark:text-slate-300">{d.code}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{d.name}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center space-x-2">
                            <button
                              onClick={() => setEditDeptModal({ id: d.id, code: d.code, name: d.name })}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 transition"
                              title="Edit Department"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteDept(d)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-400 transition"
                              title="Delete Department"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Department Form */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white font-heading flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-600" />
              Add Department
            </h3>
            <form onSubmit={handleAddDept} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MCA or CSE"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master of Computer Applications"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition shadow-md shadow-teal-600/20"
              >
                Create Department
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== TAB: TIMETABLE SLOTS ==================== */}
      {activeTab === 'slots' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                Institutional Lecture Slots
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">{slots.length} periods defined</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[550px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                  <tr>
                    <th className="px-6 py-3">Slot Title</th>
                    <th className="px-6 py-3">Start Time</th>
                    <th className="px-6 py-3">End Time</th>
                    <th className="px-6 py-3">Day / Recurrence</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {slots.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">
                        No timetable lecture periods configured. Add slots using the panel on the right.
                      </td>
                    </tr>
                  ) : (
                    slots.map((sl) => (
                      <tr key={sl.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{sl.name}</td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400 font-semibold">{sl.start_time}</td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400 font-semibold">{sl.end_time}</td>
                        <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                          {sl.day_of_week ? (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                              {sl.day_of_week}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 italic">Daily Recurring</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center space-x-2">
                            <button
                              onClick={() => setEditSlotModal({
                                id: sl.id,
                                name: sl.name,
                                start_time: sl.start_time,
                                end_time: sl.end_time,
                                day_of_week: sl.day_of_week || ''
                              })}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 transition"
                              title="Edit Slot Period"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSlot(sl)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-400 transition"
                              title="Delete Slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Slot Form */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white font-heading flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-600" />
              Add Timetable Slot
            </h3>
            <form onSubmit={handleAddSlot} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Slot Name / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Period 1 (09:00 - 10:00)"
                  value={slotForm.name}
                  onChange={(e) => setSlotForm({ ...slotForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={slotForm.start_time}
                    onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={slotForm.end_time}
                    onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Day / Recurrence</label>
                <select
                  value={slotForm.day_of_week}
                  onChange={(e) => setSlotForm({ ...slotForm, day_of_week: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Daily Recurring (Mon - Sat)</option>
                  <option value="Monday">Monday Only</option>
                  <option value="Tuesday">Tuesday Only</option>
                  <option value="Wednesday">Wednesday Only</option>
                  <option value="Thursday">Thursday Only</option>
                  <option value="Friday">Friday Only</option>
                  <option value="Saturday">Saturday Only</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition shadow-md shadow-teal-600/20"
              >
                Create Timetable Slot
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODALS ==================== */}

      {/* EDIT DEPARTMENT MODAL */}
      {editDeptModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white font-heading flex items-center gap-2">
                <Pencil className="w-4 h-4 text-teal-600" />
                Edit Department
              </h3>
              <button
                onClick={() => setEditDeptModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditDept} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  value={editDeptModal.code}
                  onChange={(e) => setEditDeptModal({ ...editDeptModal, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={editDeptModal.name}
                  onChange={(e) => setEditDeptModal({ ...editDeptModal, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditDeptModal(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLASS MODAL */}
      {editClassModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white font-heading flex items-center gap-2">
                <Pencil className="w-4 h-4 text-teal-600" />
                Edit Class / Batch
              </h3>
              <button
                onClick={() => setEditClassModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditClass} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Class / Batch Name *</label>
                <input
                  type="text"
                  required
                  value={editClassModal.name}
                  onChange={(e) => setEditClassModal({ ...editClassModal, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Department *</label>
                <select
                  required
                  value={editClassModal.department_id}
                  onChange={(e) => setEditClassModal({ ...editClassModal, department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Semester *</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    required
                    value={editClassModal.semester}
                    onChange={(e) => setEditClassModal({ ...editClassModal, semester: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Academic Year *</label>
                  <input
                    type="text"
                    required
                    value={editClassModal.academic_year}
                    onChange={(e) => setEditClassModal({ ...editClassModal, academic_year: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Class Advisor</label>
                <select
                  value={editClassModal.class_advisor_id || ''}
                  onChange={(e) => setEditClassModal({ ...editClassModal, class_advisor_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- No Advisor Assigned --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.teacher_code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditClassModal(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SUBJECT MODAL */}
      {editSubjectModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white font-heading flex items-center gap-2">
                <Pencil className="w-4 h-4 text-teal-600" />
                Edit Course / Subject
              </h3>
              <button
                onClick={() => setEditSubjectModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditSubject} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  value={editSubjectModal.code}
                  onChange={(e) => setEditSubjectModal({ ...editSubjectModal, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={editSubjectModal.name}
                  onChange={(e) => setEditSubjectModal({ ...editSubjectModal, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Department *</label>
                <select
                  required
                  value={editSubjectModal.department_id}
                  onChange={(e) => setEditSubjectModal({ ...editSubjectModal, department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Semester *</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    required
                    value={editSubjectModal.semester}
                    onChange={(e) => setEditSubjectModal({ ...editSubjectModal, semester: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Credits *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={editSubjectModal.total_credits}
                    onChange={(e) => setEditSubjectModal({ ...editSubjectModal, total_credits: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditSubjectModal(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TIMETABLE SLOT MODAL */}
      {editSlotModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white font-heading flex items-center gap-2">
                <Pencil className="w-4 h-4 text-teal-600" />
                Edit Timetable Slot
              </h3>
              <button
                onClick={() => setEditSlotModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditSlot} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Slot Name / Title *</label>
                <input
                  type="text"
                  required
                  value={editSlotModal.name}
                  onChange={(e) => setEditSlotModal({ ...editSlotModal, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={editSlotModal.start_time.slice(0, 5)}
                    onChange={(e) => setEditSlotModal({ ...editSlotModal, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={editSlotModal.end_time.slice(0, 5)}
                    onChange={(e) => setEditSlotModal({ ...editSlotModal, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Day / Recurrence</label>
                <select
                  value={editSlotModal.day_of_week || ''}
                  onChange={(e) => setEditSlotModal({ ...editSlotModal, day_of_week: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Daily Recurring (Mon - Sat)</option>
                  <option value="Monday">Monday Only</option>
                  <option value="Tuesday">Tuesday Only</option>
                  <option value="Wednesday">Wednesday Only</option>
                  <option value="Thursday">Thursday Only</option>
                  <option value="Friday">Friday Only</option>
                  <option value="Saturday">Saturday Only</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditSlotModal(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLASS ADVISOR ASSIGNMENT MODAL */}
      {advisorModalClass && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 dark:text-white font-heading">Assign Class Advisor</h3>
              </div>
              <button
                onClick={() => setAdvisorModalClass(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="font-bold text-slate-800 dark:text-white text-sm">{advisorModalClass.name}</div>
                <div className="text-slate-500 dark:text-slate-400 mt-0.5">{advisorModalClass.department_name} • Semester {advisorModalClass.semester}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Faculty Member
                </label>
                <select
                  value={selectedAdvisorId}
                  onChange={(e) => setSelectedAdvisorId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500"
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
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
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
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow disabled:opacity-50 transition"
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
