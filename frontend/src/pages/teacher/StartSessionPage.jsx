import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Camera, Clock, BookOpen, AlertCircle, Play, CheckCircle2,
  Users, Zap, RefreshCw, Search, CheckSquare, Square,
  Calendar, ArrowRight, ShieldCheck, UserCheck, UserX, Award
} from 'lucide-react';

const StartSessionPage = () => {
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get('assignment') || '';
  const navigate = useNavigate();

  // Mode: 'consecutive' (No Camera / Multi-Period Quick Entry) or 'live' (Webcam Camera Recognition)
  const [activeTab, setActiveTab] = useState('consecutive');

  // Common metadata
  const [assignments, setAssignments] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(preselected);
  const [error, setError] = useState('');

  // Consecutive Period Mode state
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSlotIds, setSelectedSlotIds] = useState([]);
  const [roster, setRoster] = useState([]);
  const [priorSessions, setPriorSessions] = useState([]);
  const [selectedCloneSessionId, setSelectedCloneSessionId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [submittingPeriods, setSubmittingPeriods] = useState(false);
  const [successResult, setSuccessResult] = useState(null);

  // Live Camera Mode state
  const [liveFormData, setLiveFormData] = useState({
    slot_id: '',
    duration_minutes: 60
  });
  const [loadingLive, setLoadingLive] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // 1. Load teacher's course assignments & timetable slots
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [aRes, sRes] = await Promise.all([
          api.get('/teacher/my-assignments'),
          api.get('/teacher/available-slots')
        ]);
        setAssignments(aRes.data);
        setSlots(sRes.data);

        const initialAssignmentId = preselected || (aRes.data.length > 0 ? aRes.data[0].id.toString() : '');
        if (initialAssignmentId) {
          setSelectedAssignmentId(initialAssignmentId);
        }
      } catch (err) {
        console.error('Failed to load assignments or slots', err);
        setError('Failed to load course assignments. Please ensure you are logged in as a faculty member.');
      }
    };
    loadMetadata();
  }, [preselected]);

  // 2. Fetch class roster & baseline whenever assignment, date, or clone session changes
  const fetchRoster = async (assignmentId, targetDate, cloneId = '') => {
    if (!assignmentId) return;
    setLoadingRoster(true);
    setError('');
    try {
      const params = {
        assignment_id: parseInt(assignmentId),
        session_date: targetDate
      };
      if (cloneId) {
        params.clone_session_id = parseInt(cloneId);
      }
      const res = await api.get('/attendance/roster-baseline', { params });
      setRoster(res.data.students);
      setPriorSessions(res.data.prior_sessions_today || []);
    } catch (err) {
      console.error('Failed to load roster', err);
      setError(err.response?.data?.detail || 'Failed to load class roster baseline.');
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    if (selectedAssignmentId && activeTab === 'consecutive') {
      fetchRoster(selectedAssignmentId, selectedDate, selectedCloneSessionId);
    }
  }, [selectedAssignmentId, selectedDate, selectedCloneSessionId, activeTab]);

  // Handle Slot Selection Toggle (supports multiple consecutive periods)
  const toggleSlotSelection = (slotId) => {
    setSelectedSlotIds((prev) => {
      if (prev.includes(slotId)) {
        return prev.filter((id) => id !== slotId);
      } else {
        return [...prev, slotId].sort((a, b) => a - b);
      }
    });
  };

  // Status modification handlers
  const setStudentStatus = (studentId, newStatus) => {
    setRoster((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status: newStatus } : s))
    );
  };

  const toggleStudentStatus = (studentId) => {
    setRoster((prev) =>
      prev.map((s) => {
        if (s.student_id === studentId) {
          const nextStatus = s.status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );
  };

  const markAll = (status) => {
    setRoster((prev) => prev.map((s) => ({ ...s, status })));
  };

  // Filtered roster for fast search
  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return roster;
    const q = searchQuery.toLowerCase();
    return roster.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.register_number.toLowerCase().includes(q)
    );
  }, [roster, searchQuery]);

  // Live Stats calculations
  const totalEnrolled = roster.length;
  const presentCount = roster.filter((s) => s.status === 'PRESENT').count || roster.filter((s) => s.status === 'PRESENT').length;
  const absentCount = roster.filter((s) => s.status === 'ABSENT').length;
  const lateCount = roster.filter((s) => s.status === 'LATE').length;
  const leaveCount = roster.filter((s) => s.on_leave).length;
  const attendanceRate = totalEnrolled > 0 ? ((presentCount / totalEnrolled) * 100).toFixed(1) : 0;

  // Submit Consecutive Periods
  const handleSubmitConsecutivePeriods = async (e) => {
    e.preventDefault();
    if (selectedSlotIds.length === 0) {
      setError('Please select at least one timetable period/slot before submitting.');
      return;
    }
    if (roster.length === 0) {
      setError('No students enrolled in this class.');
      return;
    }

    setError('');
    setSubmittingPeriods(true);
    try {
      const payload = {
        assignment_id: parseInt(selectedAssignmentId),
        slot_ids: selectedSlotIds,
        session_date: selectedDate,
        records: roster.map((r) => ({
          student_id: r.student_id,
          status: r.status
        }))
      };

      const res = await api.post('/attendance/consecutive-periods', payload);
      setSuccessResult(res.data);
    } catch (err) {
      console.error('Submission failed', err);
      setError(err.response?.data?.detail || 'Failed to submit consecutive period attendance.');
    } finally {
      setSubmittingPeriods(false);
    }
  };

  // Launch Live Camera Attendance (Mode 2)
  const handleStartLiveCamera = async (e) => {
    e.preventDefault();
    setError('');
    setActiveSessionId(null);
    setLoadingLive(true);
    try {
      const res = await api.post('/attendance/sessions/start', {
        assignment_id: parseInt(selectedAssignmentId),
        slot_id: liveFormData.slot_id ? parseInt(liveFormData.slot_id) : null,
        duration_minutes: parseInt(liveFormData.duration_minutes)
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
        setError(detail || 'Failed to start live camera session.');
      }
    } finally {
      setLoadingLive(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white font-heading">
            Classroom Attendance Manager
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Record attendance rapidly across single or consecutive timetable periods without classroom hardware
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto border border-slate-300 dark:border-slate-700">
          <button
            type="button"
            onClick={() => { setActiveTab('consecutive'); setSuccessResult(null); setError(''); }}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'consecutive'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ Consecutive Period (No Camera)</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('live'); setSuccessResult(null); setError(''); }}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'live'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>🎥 AI Live Camera</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
          {activeSessionId && (
            <button
              type="button"
              onClick={() => navigate(`/teacher/live-session/${activeSessionId}`)}
              className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-700 transition flex items-center space-x-1 shrink-0 self-start sm:self-auto"
            >
              <Camera className="w-3.5 h-3.5 mr-1" />
              <span>Resume Active Camera Session &rarr;</span>
            </button>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 1: CONSECUTIVE PERIOD ATTENDANCE (NO CAMERA NEEDED) */}
      {/* ======================================================== */}
      {activeTab === 'consecutive' && (
        <div className="space-y-6">
          {/* Success Banner */}
          {successResult ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
                  {successResult.message}
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  Recorded across {successResult.total_periods_marked} timetable period(s) &bull; {successResult.present_count} Present &bull; {successResult.absent_count} Absent.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setSuccessResult(null); fetchRoster(selectedAssignmentId, selectedDate); }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow"
                >
                  Record Another Session
                </button>
                <Link
                  to="/teacher/student-reports"
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  View Updated Student Reports &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitConsecutivePeriods} className="space-y-6">
              {/* Configuration Card: Assignment & Date */}
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select Assigned Course */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Authorized Course & Class
                    </label>
                    <select
                      required
                      value={selectedAssignmentId}
                      onChange={(e) => {
                        setSelectedAssignmentId(e.target.value);
                        setSelectedCloneSessionId('');
                      }}
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select an assigned course</option>
                      {assignments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.subject_name} ({a.subject_code}) &mdash; Class: {a.class_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Attendance Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Attendance Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        max={new Date().toISOString().split('T')[0]}
                        value={selectedDate}
                        onChange={(e) => {
                          setSelectedDate(e.target.value);
                          setSelectedCloneSessionId('');
                        }}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Consecutive Periods Selector */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Select Timetable Period(s) &bull; Multi-Period Selection Enabled
                    </label>
                    {selectedSlotIds.length > 0 && (
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                        {selectedSlotIds.length} Period{selectedSlotIds.length > 1 ? 's' : ''} Selected ({selectedSlotIds.length} hour{selectedSlotIds.length > 1 ? 's' : ''} credited)
                      </span>
                    )}
                  </div>

                  {slots.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No timetable slots configured in the database.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {slots.map((s) => {
                        const isSelected = selectedSlotIds.includes(s.id);
                        return (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => toggleSlotSelection(s.id)}
                            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-500/30'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-bold text-xs">{s.name}</span>
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-white" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <span className={`text-[11px] mt-1 ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                              {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    💡 <strong>Tip for Double Lectures & Labs:</strong> Select 2 or 3 consecutive periods (e.g. Period 2 & 3). Attendance will be logged for both hours at once!
                  </p>
                </div>

                {/* Smart Baseline & Cloning Option */}
                {priorSessions.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Import Baseline from Earlier Period Today (Optional Clone)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        value={selectedCloneSessionId}
                        onChange={(e) => setSelectedCloneSessionId(e.target.value)}
                        className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800"
                      >
                        <option value="">Default: Fresh Roster (Auto-checks leaves & defaults to Present)</option>
                        {priorSessions.map((ps) => (
                          <option key={ps.id} value={ps.id}>
                            Clone from {ps.slot_name} ({ps.subject_name}) &mdash; {ps.present_count} Present, {ps.absent_count} Absent
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => fetchRoster(selectedAssignmentId, selectedDate, selectedCloneSessionId)}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 flex items-center justify-center space-x-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reload Baseline</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Attendance Counter & Quick Actions Bar */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-700 dark:text-slate-300">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Total Enrolled: {totalEnrolled}</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <div className="flex items-center space-x-1 font-bold text-emerald-600 dark:text-emerald-400">
                    <UserCheck className="w-4 h-4" />
                    <span>Present: {presentCount}</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <div className="flex items-center space-x-1 font-bold text-rose-600 dark:text-rose-400">
                    <UserX className="w-4 h-4" />
                    <span>Absent: {absentCount}</span>
                  </div>
                  {leaveCount > 0 && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-bold">
                        🌴 {leaveCount} on Approved Leave
                      </span>
                    </>
                  )}
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    {attendanceRate}% Rate
                  </span>
                </div>

                {/* Bulk Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => markAll('PRESENT')}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-bold transition"
                  >
                    Mark All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => markAll('ABSENT')}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition"
                  >
                    Mark All Absent
                  </button>
                </div>
              </div>

              {/* Student Roster Grid */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Student Attendance Roster ({filteredRoster.length})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Tap any student card to toggle between Present and Absent in seconds
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search name or USN..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {loadingRoster ? (
                  <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center space-y-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                    <span>Loading verified class roster...</span>
                  </div>
                ) : filteredRoster.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    No students found matching your selection.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[460px] overflow-y-auto">
                    {filteredRoster.map((s, idx) => {
                      const isPresent = s.status === 'PRESENT';
                      const isLate = s.status === 'LATE';
                      return (
                        <div
                          key={s.student_id}
                          onClick={() => toggleStudentStatus(s.student_id)}
                          className={`p-3 sm:px-5 flex items-center justify-between cursor-pointer transition-colors ${
                            isPresent
                              ? 'hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20'
                              : 'bg-rose-50/30 dark:bg-rose-950/20 hover:bg-rose-50/60'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 w-6">
                              #{idx + 1}
                            </span>
                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                              {s.full_name ? s.full_name.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {s.full_name}
                                </span>
                                {s.on_leave && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold shrink-0">
                                    🌴 Leave: {s.leave_reason || 'Approved'}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                {s.register_number}
                              </span>
                            </div>
                          </div>

                          {/* Status Pill Toggle Buttons */}
                          <div
                            className="flex items-center space-x-1.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setStudentStatus(s.student_id, 'PRESENT')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                                isPresent
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Present</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setStudentStatus(s.student_id, 'ABSENT')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                                !isPresent && !isLate
                                  ? 'bg-rose-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-700'
                              }`}
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Absent</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Final Submit Button */}
              <button
                type="submit"
                disabled={submittingPeriods || selectedSlotIds.length === 0 || roster.length === 0}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 text-sm"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  {submittingPeriods
                    ? 'Recording Official Attendance...'
                    : `Record Attendance for ${selectedSlotIds.length || 0} Period(s) (${presentCount} Present)`}
                </span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 2: AI LIVE CAMERA ATTENDANCE STREAM (EXISTING FLOW) */}
      {/* ======================================================== */}
      {activeTab === 'live' && (
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <form onSubmit={handleStartLiveCamera} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Select Authorized Course & Class
              </label>
              <select
                required
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-teal-500"
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Timetable Slot (Optional)
                </label>
                <select
                  value={liveFormData.slot_id}
                  onChange={(e) => setLiveFormData({ ...liveFormData, slot_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">On-Demand (Custom Duration)</option>
                  {slots.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Session Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="10"
                  max="180"
                  required
                  value={liveFormData.duration_minutes}
                  onChange={(e) => setLiveFormData({ ...liveFormData, duration_minutes: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-4 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl text-xs text-teal-800 dark:text-teal-300 space-y-1">
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
              disabled={loadingLive || assignments.length === 0}
              className="w-full py-3.5 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-slate-200 text-white dark:text-black rounded-xl font-bold flex items-center justify-center space-x-2 shadow transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>{loadingLive ? 'Initializing AI Camera...' : 'Launch Live Camera Attendance'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default StartSessionPage;
