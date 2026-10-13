import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Camera, CheckCircle2, UserCheck, AlertTriangle, Clock,
  StopCircle, Users, Sparkles, Shield, UserX
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

  // 3. Initialize Webcam
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setCameraActive(true);
        }
      } catch (err) {
        console.error('Camera access error', err);
        setCameraError('Unable to access classroom webcam. Please allow browser camera permissions.');
      }
    };
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 4. Continuous AI Frame Processing Loop (Every 1.2s)
  useEffect(() => {
    if (!cameraActive) return;

    const interval = setInterval(async () => {
      if (processingRef.current || !videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      processingRef.current = true;

      try {
        // Prepare capture canvas
        if (!captureCanvasRef.current) {
          captureCanvasRef.current = document.createElement('canvas');
        }
        const capCanvas = captureCanvasRef.current;
        capCanvas.width = video.videoWidth;
        capCanvas.height = video.videoHeight;
        const capCtx = capCanvas.getContext('2d');
        capCtx.drawImage(video, 0, 0, capCanvas.width, capCanvas.height);

        const base64Image = capCanvas.toDataURL('image/jpeg', 0.85);

        // Transmit frame to AI backend
        const response = await api.post(`/attendance/sessions/${sessionId}/process-frame`, {
          image_base64: base64Image
        });

        const data = response.data;

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

        const scaleX = overlayCanvas.width / video.videoWidth;
        const scaleY = overlayCanvas.height / video.videoHeight;

        data.faces.forEach((f) => {
          const [x1, y1, x2, y2] = f.box;
          const boxX = x1 * scaleX;
          const boxY = y1 * scaleY;
          const boxW = (x2 - x1) * scaleX;
          const boxH = (y2 - y1) * scaleY;

          let strokeColor = '#ef4444'; // Red for unknown
          let tagText = 'UNKNOWN';

          if (f.status === 'MATCHED' || f.status === 'ALREADY_MARKED') {
            strokeColor = '#10b981'; // Green for recognized
            tagText = `${f.student_name} (${f.register_number})`;
          } else if (f.status === 'CONFIRMING') {
            strokeColor = '#f59e0b'; // Amber for verifying
            tagText = `Verifying: ${f.student_name}...`;
          } else if (f.status === 'LOW_QUALITY') {
            strokeColor = '#64748b'; // Slate for low quality
            tagText = 'Low Quality / Blur';
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

        // Refresh present records if new students were marked
        if (data.newly_marked_count > 0) {
          const recRes = await api.get(`/teacher/sessions/${sessionId}/records`);
          setPresentRecords(recRes.data.filter((r) => r.status === 'PRESENT'));
        }
      } catch (err) {
        console.error('Frame processing failed', err);
      } finally {
        processingRef.current = false;
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [cameraActive, sessionId]);

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
    <div className="space-y-6">
      {/* Session Header & Telemetry Summary Banner */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Live Facial Recognition Active
            </span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-slate-900 mt-1">
            {sessionStats?.subject_name || 'Loading Course...'} ({sessionStats?.subject_code})
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
            <span><b>Class:</b> {sessionStats?.class_name}</span>
            <span>&bull;</span>
            <span><b>Faculty:</b> {sessionStats?.teacher_name}</span>
            <span>&bull;</span>
            <span><b>Enrolled:</b> {sessionStats?.total_enrolled} Students</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="px-4 py-2.5 bg-slate-900 text-white rounded-2xl flex items-center space-x-3">
            <Clock className="w-5 h-5 text-teal-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Remaining</div>
              <div className="text-lg font-mono font-bold leading-none">{formatTimer(timeRemaining)}</div>
            </div>
          </div>

          <button
            onClick={handleFinish}
            className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/20 flex items-center space-x-2 transition-colors"
          >
            <StopCircle className="w-4 h-4" />
            <span>Complete Session</span>
          </button>
        </div>
      </div>

      {cameraError && (
        <div className="p-5 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="font-bold flex items-center space-x-2 text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Camera Access Blocked or Not Found</span>
            </div>
            <p className="text-xs text-rose-700">
              {cameraError} Check your browser's address bar (click the camera/lock icon) and ensure permissions are set to "Allow".
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition shrink-0"
          >
            Retry Camera Access
          </button>
        </div>
      )}

      {/* Main Grid: Camera Video Left + Real-time Telemetry Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Preview with Overlay */}
        <div className="lg:col-span-2 bg-slate-950 rounded-3xl p-4 shadow-xl border border-slate-800 flex flex-col justify-between">
          <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center min-h-[420px]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto object-cover rounded-2xl"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* In-Video HUD Status */}
            <div className="absolute top-4 left-4 glass px-3 py-1.5 rounded-xl border border-white/20 text-xs font-semibold text-slate-800 flex items-center space-x-2 shadow">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>MTCNN + ArcFace 512-D</span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white/90">
              <div className="flex items-center space-x-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <span className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Matched</span>
                </span>
                <span className="flex items-center space-x-1.5 text-rose-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span>Unknown</span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Camera Pipeline: 1.2s Sampling Frequency</span>
            <span>Multi-Face Simultaneous Recognition</span>
          </div>
        </div>

        {/* Live Counters & Attendance Feed Sidebar (Section 25 Specification) */}
        <div className="space-y-6">
          {/* Section 25 Four Counters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Detected</div>
              <div className="text-2xl font-extrabold text-slate-900 font-heading mt-1">
                {telemetry.total_detected}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Faces in frame</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">Recognized</div>
              <div className="text-2xl font-extrabold text-teal-600 font-heading mt-1">
                {telemetry.recognized_count}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Registered matches</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Unknown</div>
              <div className="text-2xl font-extrabold text-rose-600 font-heading mt-1">
                {telemetry.unknown_count}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Below threshold</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Present Count</div>
              <div className="text-2xl font-extrabold text-blue-600 font-heading mt-1">
                {telemetry.present_count}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Marked present</div>
            </div>
          </div>

          {/* Real-time Present Roster List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 font-heading text-sm flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Marked Present ({presentRecords.length})</span>
              </h3>
            </div>

            <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
              {presentRecords.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Waiting for students to appear in camera view...
                </div>
              ) : (
                presentRecords.map((r) => (
                  <div
                    key={r.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{r.student_name}</div>
                      <div className="font-mono text-[10px] text-slate-500">{r.register_number}</div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        PRESENT
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
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
