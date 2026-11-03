import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Camera, CheckCircle2, UserCheck, AlertTriangle, Clock,
  StopCircle, Users, Sparkles, Shield, UserX, X, RotateCcw,
  SwitchCamera
} from 'lucide-react';

const LiveAttendancePage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const processingRef = useRef(false);

  const [sessionStats, setSessionStats] = useState(null);
  const [telemetry, setTelemetry] = useState({
    total_detected: 0,
    recognized_count: 0,
    unknown_count: 0,
    present_count: 0
  });

  const [presentRecords, setPresentRecords] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [facingMode, setFacingMode] = useState('user'); // Default to 'user' (front selfie camera) for student passing
  const [lastMarkedStudent, setLastMarkedStudent] = useState(null);
  const [aiServerStatus, setAiServerStatus] = useState('connected');

  // 1. Fetch initial session statistics & prior records
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await api.get(`/attendance/sessions/${sessionId}/live-stats`);
        setSessionStats(res.data);
        setTimeRemaining(res.data.time_remaining_seconds);
        setTelemetry((prev) => ({ ...prev, present_count: res.data.present_count }));

        // Load existing records
        const recRes = await api.get(`/teacher/sessions/${sessionId}/records`);
        setPresentRecords(recRes.data.filter((r) => r.status === 'PRESENT'));
      } catch (err) {
        console.error('Session load error', err);
      }
    };
    fetchSession();
  }, [sessionId]);

  // 2. Countdown timer for remaining session duration
  useEffect(() => {
    if (timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining]);

  // 3. Initialize Webcam with robust fallback and front/back toggle
  const startCamera = async (mode = facingMode) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: { ideal: mode }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        setCameraError('');
      }
    } catch (err) {
      console.warn('Preferred camera mode failed, attempting generic video fallback', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          streamRef.current = fallbackStream;
          setCameraActive(true);
          setCameraError('');
        }
      } catch (fallbackErr) {
        console.error('Camera access error', fallbackErr);
        setCameraError('Unable to access classroom camera. Please ensure camera permissions are allowed in your browser settings.');
      }
    }
  };

  useEffect(() => {
    startCamera(facingMode);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Audio chime and haptic feedback for physical mobile phone passing
  const triggerSuccessFeedback = (student) => {
    setLastMarkedStudent(student);
    setTimeout(() => setLastMarkedStudent(null), 3000);

    // Audio Chime
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.00, now + 0.12); // A5
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      // Audio autoplay restrictions
    }

    // Mobile Phone Vibration
    if (navigator.vibrate) {
      navigator.vibrate([150, 60, 150]);
    }
  };

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // 4. Continuous AI Frame Processing Loop (Every 1.2s)
  useEffect(() => {
    if (!cameraActive) return;

    const interval = setInterval(async () => {
      if (processingRef.current || !videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      processingRef.current = true;

      try {
        // Prepare capture canvas (Optimized max-640px dimension for fast edge inference)
        if (!captureCanvasRef.current) {
          captureCanvasRef.current = document.createElement('canvas');
        }
        const capCanvas = captureCanvasRef.current;
        let targetW = video.videoWidth || 640;
        let targetH = video.videoHeight || 480;
        if (targetW > 640) {
          const ratio = 640 / targetW;
          targetW = 640;
          targetH = Math.round(targetH * ratio);
        }
        capCanvas.width = targetW;
        capCanvas.height = targetH;
        const capCtx = capCanvas.getContext('2d');
        capCtx.drawImage(video, 0, 0, targetW, targetH);

        const base64Image = capCanvas.toDataURL('image/jpeg', 0.82);

        // Transmit frame to AI backend
        const response = await api.post(`/attendance/sessions/${sessionId}/process-frame`, {
          image_base64: base64Image
        });

        const data = response.data;
        setAiServerStatus('connected');

        // Update telemetry counters
        setTelemetry({
          total_detected: data.total_detected,
          recognized_count: data.recognized_count,
          unknown_count: data.unknown_count,
          present_count: data.total_present
        });

        // Draw bounding boxes on the overlay canvas
        const overlayCanvas = canvasRef.current;
        overlayCanvas.width = video.clientWidth;
        overlayCanvas.height = video.clientHeight;
        const ctx = overlayCanvas.getContext('2d');
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        const scaleX = overlayCanvas.width / targetW;
        const scaleY = overlayCanvas.height / targetH;

        data.faces.forEach((f) => {
          const [x1, y1, x2, y2] = f.box;
          const boxX = x1 * scaleX;
          const boxY = y1 * scaleY;
          const boxW = (x2 - x1) * scaleX;
          const boxH = (y2 - y1) * scaleY;

          let strokeColor = '#ef4444'; // Red for unknown / unregistered
          let tagText = 'UNREGISTERED FACE';

          if (f.status === 'MATCHED' || f.status === 'ALREADY_MARKED') {
            strokeColor = '#10b981'; // Green for recognized
            tagText = `${f.student_name} (${f.register_number}) [${Math.round((f.confidence || 0) * 100)}%]`;
          } else if (f.status === 'CONFIRMING') {
            strokeColor = '#f59e0b'; // Amber for verifying
            tagText = `Verifying: ${f.student_name}... [${Math.round((f.confidence || 0) * 100)}%]`;
          } else if (f.status === 'LOW_QUALITY') {
            strokeColor = '#64748b'; // Slate for low quality
            tagText = 'Low Quality / Blur';
          } else if (f.status === 'SPOOF_DETECTED') {
            strokeColor = '#f43f5e'; // Rose-500 for phone/screen/photo spoof
            tagText = f.message || 'PHONE / IMAGE DETECTED - REJECTED';
          } else if (f.status === 'UNKNOWN') {
            strokeColor = '#ef4444';
            tagText = f.confidence > 0
              ? `UNREGISTERED (${Math.round(f.confidence * 100)}%)`
              : 'UNREGISTERED FACE';
          }

          // Draw Box
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 3;
          ctx.strokeRect(boxX, boxY, boxW, boxH);

          // Draw Tag Label
          ctx.fillStyle = strokeColor;
          const labelWidth = ctx.measureText(tagText).width + 16;
          ctx.fillRect(boxX, Math.max(0, boxY - 24), labelWidth, 24);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(tagText, boxX + 8, Math.max(16, boxY - 8));
        });

        // Refresh present records & trigger mobile audio/vibration feedback
        if (data.newly_marked_count > 0) {
          const matched = data.faces.find((f) => f.status === 'MATCHED');
          if (matched) {
            triggerSuccessFeedback({
              name: matched.student_name,
              regNo: matched.register_number
            });
          }
          const recRes = await api.get(`/teacher/sessions/${sessionId}/records`);
          setPresentRecords(recRes.data.filter((r) => r.status === 'PRESENT'));
        }
      } catch (err) {
        console.error('Frame processing failed', err);
        setAiServerStatus('reconnecting');
      } finally {
        processingRef.current = false;
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [cameraActive, sessionId]);

  const handleResetRecord = async (recordId, studentName) => {
    if (!window.confirm(`Revoke / reset attendance for ${studentName}?`)) return;
    try {
      await api.delete(`/attendance/sessions/${sessionId}/records/${recordId}`);
      setPresentRecords((prev) => prev.filter((r) => r.id !== recordId));
      setTelemetry((prev) => ({
        ...prev,
        present_count: Math.max(0, prev.present_count - 1)
      }));
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to reset attendance record');
    }
  };

  const handleFinish = async () => {
    if (!window.confirm('Are you sure you want to complete and finalize this attendance session?')) return;
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      await api.post(`/attendance/sessions/${sessionId}/complete`);
      alert('Attendance session completed and finalized successfully.');
      navigate('/teacher');
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Session Header & Telemetry Summary Banner */}
      <div className="p-4 sm:p-6 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Live Facial Recognition Active
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 mt-1">
            {sessionStats?.subject_name || 'Loading Course...'} ({sessionStats?.subject_code})
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
            <span><b>Class:</b> {sessionStats?.class_name}</span>
            <span>&bull;</span>
            <span><b>Faculty:</b> {sessionStats?.teacher_name}</span>
            <span>&bull;</span>
            <span><b>Enrolled:</b> {sessionStats?.total_enrolled} Students</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2.5 sm:gap-3">
          <div className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-900 text-white rounded-xl sm:rounded-2xl flex items-center space-x-2.5 sm:space-x-3">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400" />
            <div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Remaining</div>
              <div className="text-base sm:text-lg font-mono font-bold leading-none">{formatTimer(timeRemaining)}</div>
            </div>
          </div>

          <button
            onClick={handleFinish}
            className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-600/20 flex items-center space-x-2 transition-colors"
          >
            <StopCircle className="w-4 h-4" />
            <span>Complete Session</span>
          </button>
        </div>
      </div>

      {cameraError && (
        <div className="p-4 sm:p-5 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="font-bold flex items-center space-x-2 text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Camera Access Blocked or Not Found</span>
            </div>
            <p className="text-xs text-rose-700">
              {cameraError} Check your browser's address bar (click the camera/lock icon) and ensure permissions are set to "Allow".
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition shrink-0 self-start sm:self-auto"
          >
            Retry Camera Access
          </button>
        </div>
      )}

      {/* Main Grid: Camera Video Left + Real-time Telemetry Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Camera Preview with Overlay */}
        <div className="lg:col-span-2 bg-slate-950 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xl border border-slate-800 flex flex-col justify-between">
          <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-black flex items-center justify-center min-h-[220px] sm:min-h-[380px]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto max-h-[65vh] object-contain rounded-xl sm:rounded-2xl mx-auto"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* In-Video HUD Status */}
            <div className="absolute top-3 left-3 glass px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-white/20 text-[10px] sm:text-xs font-semibold text-slate-800 flex items-center space-x-1.5 shadow z-10">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>{facingMode === 'user' ? 'Front Camera (Self-Scan)' : 'Back Camera (Classroom)'}</span>
            </div>

            {/* Mobile Handheld Attendance Success Banner */}
            {lastMarkedStudent && (
              <div className="absolute top-12 left-3 right-3 sm:left-6 sm:right-6 bg-emerald-600 text-white p-3.5 rounded-2xl shadow-2xl border-2 border-emerald-300 flex items-center justify-between z-30 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Attendance Recorded!</div>
                    <div className="text-sm font-extrabold">{lastMarkedStudent.name} <span className="text-xs font-normal opacity-90">({lastMarkedStudent.regNo})</span></div>
                  </div>
                </div>
                <div className="text-[11px] font-bold bg-white text-emerald-800 px-2.5 py-1 rounded-xl shrink-0 shadow-sm">
                  Pass Phone ➔
                </div>
              </div>
            )}

            {/* Subtle Mobile Oval Guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-64 sm:w-56 sm:h-72 border-2 border-dashed border-teal-400/40 rounded-[50%] animate-pulse"></div>
            </div>

            {/* Camera Flip Button Overlay for Mobile Phones & Tablets */}
            <button
              type="button"
              onClick={handleToggleFacingMode}
              className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white px-2.5 py-1.5 rounded-xl border border-white/20 text-xs font-semibold flex items-center space-x-1.5 shadow transition-all active:scale-95 z-10"
              title="Flip Front / Back Camera"
            >
              <SwitchCamera className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-[11px] font-bold">
                {facingMode === 'environment' ? 'Back' : 'Front'}
              </span>
            </button>

            {/* Legend at Bottom */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-white/90 pointer-events-none">
              <div className="flex items-center space-x-2.5 bg-black/60 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-white/10">
                <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Matched</span>
                </span>
                <span className="flex items-center space-x-1 text-rose-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span>Unknown</span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span>Sampling: 1.2s Frequency</span>
              {aiServerStatus === 'reconnecting' && (
                <span className="text-amber-400 font-medium animate-pulse ml-2">● Cloud AI Connecting...</span>
              )}
            </span>
            <span>Multi-Face Detection</span>
          </div>
        </div>

        {/* Live Counters & Attendance Feed Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Four Counter Cards */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Detected</div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading mt-0.5">
                {telemetry.total_detected}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Faces in frame</div>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[10px] sm:text-[11px] font-bold text-teal-600 uppercase tracking-wider">Recognized</div>
              <div className="text-xl sm:text-2xl font-extrabold text-teal-600 font-heading mt-0.5">
                {telemetry.recognized_count}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Registered matches</div>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[10px] sm:text-[11px] font-bold text-rose-600 uppercase tracking-wider">Unknown</div>
              <div className="text-xl sm:text-2xl font-extrabold text-rose-600 font-heading mt-0.5">
                {telemetry.unknown_count}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Unregistered</div>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[10px] sm:text-[11px] font-bold text-blue-600 uppercase tracking-wider">Present Count</div>
              <div className="text-xl sm:text-2xl font-extrabold text-blue-600 font-heading mt-0.5">
                {telemetry.present_count}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Confirmed present</div>
            </div>
          </div>

          {/* Real-time Present Roster List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 font-heading text-xs sm:text-sm flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Marked Present ({presentRecords.length})</span>
              </h3>
            </div>

            <div className="max-h-[240px] sm:max-h-[280px] overflow-y-auto space-y-2 pr-1">
              {presentRecords.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Waiting for students to appear in camera view...
                </div>
              ) : (
                presentRecords.map((r) => (
                  <div
                    key={r.id}
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-800 truncate">{r.student_name}</div>
                      <div className="font-mono text-[10px] text-slate-500">{r.register_number}</div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          PRESENT
                        </span>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleResetRecord(r.id, r.student_name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                        title={`Reset / Revoke attendance for ${r.student_name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveAttendancePage;
