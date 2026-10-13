import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Camera, Clock, BookOpen, AlertCircle, Play } from 'lucide-react';

const StartSessionPage = () => {
  const [assignments, setAssignments] = useState([]);
  const [slots, setSlots] = useState([]);
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get('assignment') || '';

  const [formData, setFormData] = useState({
    assignment_id: preselected,
    slot_id: '',
    duration_minutes: 60
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadAssignmentsAndSlots = async () => {
      try {
        const [aRes, sRes] = await Promise.all([
          api.get('/teacher/my-assignments'),
          api.get('/teacher/available-slots')
        ]);
        setAssignments(aRes.data);
        setSlots(sRes.data);
        if (preselected) {
          setFormData((prev) => ({ ...prev, assignment_id: preselected }));
        } else if (aRes.data.length > 0) {
          setFormData((prev) => ({ ...prev, assignment_id: aRes.data[0].id.toString() }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadAssignmentsAndSlots();
  }, [preselected]);

  const [activeSessionId, setActiveSessionId] = useState(null);

  const handleStart = async (e) => {
    e.preventDefault();
    setError('');
    setActiveSessionId(null);
    setLoading(true);
    try {
      const res = await api.post('/attendance/sessions/start', {
        assignment_id: parseInt(formData.assignment_id),
        slot_id: formData.slot_id ? parseInt(formData.slot_id) : null,
        duration_minutes: parseInt(formData.duration_minutes)
      });
      navigate(`/teacher/live-session/${res.data.id}`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'object' && detail !== null) {
        setError(detail.message || 'Session overlap detected.');
        if (detail.active_session_id) {
          setActiveSessionId(detail.active_session_id);
        }
      } else {
        setError(detail || 'Failed to start attendance session');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Start Live Attendance Session</h1>
        <p className="text-slate-600 text-sm">Select your authorized course assignment and activate classroom camera recognition</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          {activeSessionId && (
            <button
              type="button"
              onClick={() => navigate(`/teacher/live-session/${activeSessionId}`)}
              className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-700 transition flex items-center space-x-1 shrink-0 self-start sm:self-auto"
            >
              <Camera className="w-3.5 h-3.5 mr-1" />
              <span>Resume Live Camera &rarr;</span>
            </button>
          )}
        </div>
      )}

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleStart} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Authorized Course & Class
            </label>
            <select
              required
              value={formData.assignment_id}
              onChange={(e) => setFormData({ ...formData, assignment_id: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select an assigned course</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.subject_name} ({a.subject_code}) &mdash; Class: {a.class_name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Note: Unassigned courses are strictly hidden in compliance with institutional access rules.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Timetable Slot (Optional)
              </label>
              <select
                value={formData.slot_id}
                onChange={(e) => setFormData({ ...formData, slot_id: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm"
              >
                <option value="">On-Demand (Custom Duration)</option>
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Session Duration (Minutes)
              </label>
              <input
                type="number"
                min="10"
                max="180"
                required
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 space-y-1">
            <div className="font-bold flex items-center space-x-1.5">
              <Camera className="w-4 h-4 text-teal-600" />
              <span>Camera Multi-Student Recognition Pipeline</span>
            </div>
            <p>
              Once started, your webcam will detect all faces in the frame. Deep learning ArcFace embeddings will match registered students and ignore unknown visitors.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || assignments.length === 0}
            className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl font-bold flex items-center justify-center space-x-2 shadow-md shadow-teal-600/20 transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>{loading ? 'Initializing AI Camera...' : 'Launch Live Camera Attendance'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default StartSessionPage;
