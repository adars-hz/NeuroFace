import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Plus, CheckCircle, XCircle, Mail, Hash, X, Edit2, Trash2, RefreshCw, AlertTriangle, Clock } from 'lucide-react';

const StudentsPage = () => {
  const { user } = useAuth();
  const isHod = user?.is_hod && user?.role !== 'ADMIN';
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    register_number: '',
    department_id: '',
    class_id: '',
    phone: ''
  });

  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    register_number: '',
    department_id: '',
    class_id: '',
    phone: '',
    password: '',
    is_active: true,
    reset_face: false
  });

  const loadData = async () => {
    try {
      const [sRes, dRes, cRes] = await Promise.all([
        api.get('/admin/students'),
        api.get('/admin/departments'),
        api.get('/admin/classes')
      ]);
      setStudents(sRes.data);
      setDepartments(dRes.data);
      setClasses(cRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEditModal = (s) => {
    setEditStudent(s);
    setEditFormData({
      full_name: s.full_name,
      email: s.email,
      register_number: s.register_number,
      department_id: s.department_id || '',
      class_id: s.class_id || '',
      phone: s.phone || '',
      password: '',
      is_active: s.is_active !== undefined ? s.is_active : true,
      reset_face: false
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        full_name: editFormData.full_name,
        email: editFormData.email,
        register_number: editFormData.register_number,
        department_id: editFormData.department_id ? parseInt(editFormData.department_id) : null,
        class_id: editFormData.class_id ? parseInt(editFormData.class_id) : null,
        phone: editFormData.phone,
        is_active: editFormData.is_active,
        reset_face: editFormData.reset_face
      };
      if (editFormData.password.trim()) {
        payload.password = editFormData.password.trim();
      }
      const res = await api.put(`/admin/students/${editStudent.id}`, payload);
      setEditStudent(null);
      if (res.data?.status === 'PENDING_APPROVAL') {
        setMsg(res.data.message || 'Update request submitted for Admin approval.');
      } else {
        setMsg(`Student '${editFormData.full_name}' updated successfully.`);
      }
      loadData();
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      alert('Error updating student: ' + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetFace = async (student) => {
    if (!window.confirm(`Are you sure you want to clear the facial biometric template for '${student.full_name}' (${student.register_number})? The student will need to re-register their face.`)) {
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/admin/students/${student.id}/reset-face`);
      setMsg(`Biometric template for '${student.full_name}' has been reset.`);
      loadData();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      alert('Error resetting face: ' + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const res = await api.delete(`/admin/students/${deleteTarget.id}`);
      setDeleteTarget(null);
      if (res.data?.status === 'PENDING_APPROVAL') {
        setMsg(res.data.message || 'Deletion request submitted for Admin approval.');
      } else {
        setMsg(`Student '${deleteTarget.full_name}' deleted successfully.`);
      }
      loadData();
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      alert('Error deleting student: ' + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/students', formData);
      setShowModal(false);
      setFormData({
        username: '', email: '', password: '', full_name: '',
        register_number: '', department_id: '', class_id: '', phone: ''
      });
      if (res.data?.status === 'PENDING_APPROVAL') {
        setMsg(res.data.message || 'Enrollment submitted for Admin approval.');
      } else {
        setMsg('Student enrolled successfully.');
      }
      loadData();
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      alert('Error creating student: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Student Directory</h1>
          <p className="text-slate-600 text-sm">Enroll students, view academic batches, and check biometric status</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Enroll New Student
        </button>
      </div>

      {isHod && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3">
          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <span className="font-bold">HOD Mode — Admin Approval Required: </span>
            Any changes you make (enroll, edit, or remove students) will be submitted as a pending request
            and must be approved by the System Administrator before taking effect.
            Track your requests under <strong>My Approval Requests</strong> in the sidebar.
          </div>
        </div>
      )}

      {msg && (
        <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold">
          {msg}
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3.5">Student Details</th>
              <th className="px-6 py-3.5">Register Number</th>
              <th className="px-6 py-3.5">Class / Batch</th>
              <th className="px-6 py-3.5">Department</th>
              <th className="px-6 py-3.5 text-center">Face Biometric Status</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900">{s.full_name}</div>
                  <div className="text-xs text-slate-600 flex items-center space-x-1.5 mt-0.5">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{s.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">
                  {s.register_number}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-700">
                  {s.class_name || 'Unassigned'}
                </td>
                <td className="px-6 py-4 text-xs text-slate-600">
                  {s.department_name || 'Unassigned'}
                </td>
                <td className="px-6 py-4 text-center">
                  {s.face_registered ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Face Registered
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      <XCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      Pending Capture
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-1.5">
                    {s.face_registered && (
                      <button
                        onClick={() => handleResetFace(s)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-all flex items-center space-x-1"
                        title="Reset Biometric Face Template"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reset Face</span>
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(s)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-teal-700 hover:bg-teal-50 border border-slate-200 transition-colors"
                      title="Edit Student Profile"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(s)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition-colors"
                      title="Delete Student"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Enroll Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Enroll Student</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Register Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MCA2024005"
                    value={formData.register_number}
                    onChange={(e) => setFormData({ ...formData, register_number: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
                  <select
                    required
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
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
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700"
                >
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">Edit Student Profile</h3>
                <p className="text-xs text-slate-500">Student ID: <span className="font-mono font-bold text-slate-700">{editStudent.register_number}</span></p>
              </div>
              <button onClick={() => setEditStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editFormData.full_name}
                    onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Register Number</label>
                  <input
                    type="text"
                    required
                    value={editFormData.register_number}
                    onChange={(e) => setEditFormData({ ...editFormData, register_number: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98470 12345"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
                  <select
                    value={editFormData.department_id}
                    onChange={(e) => setEditFormData({ ...editFormData, department_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="">No Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Class / Batch</label>
                  <select
                    value={editFormData.class_id}
                    onChange={(e) => setEditFormData({ ...editFormData, class_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="">No Class Assigned</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Reset Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Leave blank to keep existing password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="space-y-2 pt-1 border-t">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="student_active"
                    checked={editFormData.is_active}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor="student_active" className="text-xs text-slate-700 font-medium">Account Active</label>
                </div>

                {editStudent.face_registered && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="reset_face"
                      checked={editFormData.reset_face}
                      onChange={(e) => setEditFormData({ ...editFormData, reset_face: e.target.checked })}
                      className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                    />
                    <label htmlFor="reset_face" className="text-xs text-rose-700 font-semibold">
                      Clear registered face biometric template (Allows student to re-enroll face)
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-3 flex justify-end space-x-3 border-t">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setEditStudent(null)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-rose-200">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Delete Student?</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to delete <strong className="text-slate-900">{deleteTarget.full_name}</strong> (<span className="font-mono">{deleteTarget.register_number}</span>)?
                  This permanently removes their biometric facial template, lecture attendance logs, and student portal account.
                </p>
              </div>
            </div>

            <div className="pt-3 flex justify-end space-x-3 border-t">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Yes, Delete Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsPage;
