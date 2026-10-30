import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Users, Plus, Award, Check, X, ShieldAlert, Phone, Mail, Hash, Edit2, Trash2, AlertTriangle, Clock } from 'lucide-react';

const TeachersPage = () => {
  const { user } = useAuth();
  const isHod = user?.is_hod && user?.role !== 'ADMIN';
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTeacher, setEditTeacher] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    teacher_code: '',
    department_id: '',
    designation: 'ASSISTANT_PROFESSOR',
    phone: ''
  });

  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    department_id: '',
    designation: 'ASSISTANT_PROFESSOR',
    phone: '',
    password: '',
    is_active: true
  });

  const [msg, setMsg] = useState('');

  const loadData = async () => {
    try {
      const [tRes, dRes] = await Promise.all([
        api.get('/admin/teachers'),
        api.get('/admin/departments')
      ]);
      setTeachers(tRes.data);
      setDepartments(dRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEditModal = (t) => {
    setEditTeacher(t);
    setEditFormData({
      full_name: t.full_name,
      email: t.email,
      department_id: t.department_id || '',
      designation: t.designation || 'ASSISTANT_PROFESSOR',
      phone: t.phone || '',
      password: '',
      is_active: t.is_active !== undefined ? t.is_active : true
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        full_name: editFormData.full_name,
        email: editFormData.email,
        department_id: editFormData.department_id ? parseInt(editFormData.department_id) : null,
        designation: editFormData.designation,
        phone: editFormData.phone,
        is_active: editFormData.is_active
      };
      if (editFormData.password.trim()) {
        payload.password = editFormData.password.trim();
      }
      const res = await api.put(`/admin/teachers/${editTeacher.id}`, payload);
      setEditTeacher(null);
      if (res.data?.status === 'PENDING_APPROVAL') {
        setMsg(res.data.message || 'Update request submitted for Admin approval.');
      } else {
        setMsg(`Faculty member '${editFormData.full_name}' updated successfully.`);
      }
      loadData();
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      alert('Error updating teacher: ' + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const res = await api.delete(`/admin/teachers/${deleteTarget.id}`);
      setDeleteTarget(null);
      if (res.data?.status === 'PENDING_APPROVAL') {
        setMsg(res.data.message || 'Deletion request submitted for Admin approval.');
      } else {
        setMsg(`Faculty member '${deleteTarget.full_name}' deleted successfully.`);
      }
      loadData();
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      alert('Error deleting teacher: ' + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleHOD = async (teacherId, currentIsHod) => {
    try {
      await api.put('/admin/teachers/toggle-hod', {
        teacher_id: teacherId,
        is_hod: !currentIsHod
      });
      setMsg(`HOD designation updated successfully.`);
      loadData();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      alert('Failed to update HOD designation: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/teachers', formData);
      setShowModal(false);
      setFormData({
        username: '', email: '', password: '', full_name: '',
        teacher_code: '', department_id: '', designation: 'ASSISTANT_PROFESSOR', phone: ''
      });
      if (res.data.status === 'PENDING_APPROVAL') {
        setMsg(res.data.message || 'Request submitted for Admin approval.');
      } else {
        setMsg('Faculty member created successfully.');
      }
      loadData();
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      alert('Error creating teacher: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Teachers & HOD Management</h1>
          <p className="text-slate-600 text-sm">Designate department heads and manage faculty credentials</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Faculty Member
        </button>
      </div>

      {isHod && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3">
          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <span className="font-bold">HOD Mode — Admin Approval Required: </span>
            Any changes you make (add, edit, or remove faculty members) will be submitted as a pending request
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

      {/* Teachers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 min-w-[700px]">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3.5">Faculty Member</th>
              <th className="px-6 py-3.5">Faculty Code</th>
              <th className="px-6 py-3.5">Department</th>
              <th className="px-6 py-3.5">Designation</th>
              <th className="px-6 py-3.5">HOD Status</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teachers.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900">{t.full_name}</div>
                  <div className="text-xs text-slate-600 flex items-center space-x-2 mt-0.5">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{t.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-600">
                  {t.teacher_code}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600">
                  {t.department_name || 'Unassigned'}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    {t.designation.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1 items-start">
                    {t.is_hod ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <Award className="w-3.5 h-3.5 mr-1 text-amber-600" />
                        Head of Dept (HOD)
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600 font-medium">Faculty</span>
                    )}
                    {t.is_class_advisor && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200" title={t.advised_classes?.join(', ')}>
                        <Award className="w-3 h-3 mr-1 text-teal-600" />
                        Advisor: {t.advised_classes?.[0]}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-1.5">
                    <button
                      onClick={() => handleToggleHOD(t.id, t.is_hod)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        t.is_hod
                          ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                      title={t.is_hod ? 'Demote from HOD' : 'Designate as HOD'}
                    >
                      {t.is_hod ? 'Remove HOD' : 'Assign HOD'}
                    </button>
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-teal-700 hover:bg-teal-50 border border-slate-200 transition-colors"
                      title="Edit Faculty Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition-colors"
                      title="Delete Faculty Member"
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
      </div>

      {/* Modal to Add Teacher */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-xl space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Register Faculty Member</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Teacher Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. T004"
                    value={formData.teacher_code}
                    onChange={(e) => setFormData({ ...formData, teacher_code: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Designation</label>
                  <select
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="ASSISTANT_PROFESSOR">Assistant Professor</option>
                    <option value="ASSOCIATE_PROFESSOR">Associate Professor</option>
                    <option value="PROFESSOR">Professor</option>
                    <option value="HOD">Head of Department (HOD)</option>
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
                  Create Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal to Edit Teacher */}
      {editTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-xl space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">Edit Faculty Details</h3>
                <p className="text-xs text-slate-500">Teacher Code: <span className="font-mono font-bold text-slate-700">{editTeacher.teacher_code}</span></p>
              </div>
              <button onClick={() => setEditTeacher(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Designation</label>
                  <select
                    value={editFormData.designation}
                    onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="ASSISTANT_PROFESSOR">Assistant Professor</option>
                    <option value="ASSOCIATE_PROFESSOR">Associate Professor</option>
                    <option value="PROFESSOR">Professor</option>
                    <option value="HOD">Head of Department (HOD)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Reset Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current"
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="teacher_active"
                  checked={editFormData.is_active}
                  onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="teacher_active" className="text-xs text-slate-700 font-medium">Account Active</label>
              </div>

              <div className="pt-3 flex justify-end space-x-3 border-t">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setEditTeacher(null)}
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
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-xl space-y-4 border border-rose-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Delete Faculty Member?</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-slate-900">{deleteTarget.full_name}</strong> ({deleteTarget.teacher_code})?
                  This action will also remove their user account, subject assignments, and login access.
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
                {actionLoading ? 'Deleting...' : 'Yes, Delete Faculty'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeachersPage;
