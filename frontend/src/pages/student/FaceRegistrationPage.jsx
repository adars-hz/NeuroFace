import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import {
  Camera, CheckCircle2, AlertCircle, RefreshCw, Sparkles,
  ShieldCheck, ArrowRight, ArrowLeft, ArrowUp, Smile, User, Check, X
} from 'lucide-react';

const POSES = [
  {
    id: 'frontal',
    stepNumber: 1,
    title: 'Frontal Focus (Center)',
    instruction: 'Look directly at the camera with your head straight and level with a neutral expression.',
    hint: 'Center your eyes and nose inside the oval guide.',
    icon: User,
    badgeColor: 'bg-teal-500'
  },
  {
    id: 'right',
    stepNumber: 2,
    title: 'Slight Turn Right (15°)',
    instruction: 'Gently turn your head slightly toward your right shoulder.',
    hint: 'Keep the turn subtle so your left eye is still clearly visible.',
    icon: ArrowRight,
    badgeColor: 'bg-blue-500'
  },
  {
    id: 'left',
    stepNumber: 3,
    title: 'Slight Turn Left (15°)',
    instruction: 'Gently turn your head slightly toward your left shoulder.',
    hint: 'Keep the turn subtle so your right eye is still clearly visible.',
    icon: ArrowLeft,
    badgeColor: 'bg-purple-500'
  },
  {
    id: 'tilt_up',
    stepNumber: 4,
    title: 'Slight Tilt Up',
    instruction: 'Slightly elevate your chin while keeping your gaze on the camera.',
    hint: 'This captures jawline and facial angle contours for accurate classroom overhead recognition.',
    icon: ArrowUp,
    badgeColor: 'bg-amber-500'
  },
  {
    id: 'expression',
    stepNumber: 5,
    title: 'Natural Expression / Smile',
    instruction: 'Look straight at the camera with your everyday natural relaxed expression.',
    hint: 'Helps ArcFace normalize variations in daily facial emotion.',
    icon: Smile,
    badgeColor: 'bg-emerald-500'
  }
];

const FaceRegistrationPage = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(0); // 0 to 4
  const [capturedPoses, setCapturedPoses] = useState({}); // { 0: base64, 1: base64, ... }
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [liveValidation, setLiveValidation] = useState({ valid: false, message: 'Detecting face...' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState('');

  // 1. Initialize Webcam
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
        console.error('Camera error', err);
        setCameraError('Webcam access was denied. Please allow camera permissions in your browser.');
      }
    };
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 2. Periodic Live Pose Validation Check (every 1.5s)
  useEffect(() => {
    if (!cameraActive || isSuccess) return;

    const valInterval = setInterval(async () => {
      if (!videoRef.current) return;
      const video = videoRef.current;
      if (video.videoWidth === 0) return;

      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameData = canvas.toDataURL('image/jpeg', 0.6);

      try {
        const res = await api.post('/student/validate-frame', { image_base64: frameData });
        setLiveValidation(res.data);
      } catch (err) {
        // Silently continue
      }
    }, 1500);

    return () => clearInterval(valInterval);
  }, [cameraActive, isSuccess]);

  // Capture current video frame (Optimized resolution for ArcFace speed)
  const grabCurrentFrame = () => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  };

  // Manual Instant Capture
  const handleCaptureCurrentPose = () => {
    const frame = grabCurrentFrame();
    if (!frame) return;

    setCapturedPoses((prev) => ({
      ...prev,
      [currentStep]: frame
    }));

    // If not on last step, advance automatically
    if (currentStep < POSES.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  // 3-Second Timed Hands-free Capture
  const handleTimedCapture = () => {
    let count = 3;
    setCountdown(count);
    const timer = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(timer);
        setCountdown(null);
        handleCaptureCurrentPose();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  // Retake a specific pose
  const handleRetakePose = (stepIdx) => {
    setCurrentStep(stepIdx);
    setCapturedPoses((prev) => {
      const updated = { ...prev };
      delete updated[stepIdx];
      return updated;
    });
  };

  // Submit all 5 captured frames to backend ArcFace engine
  const handleSubmitBiometrics = async () => {
    const framesList = Object.keys(capturedPoses)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((k) => capturedPoses[k]);

    if (framesList.length < 3) {
      setEnrollmentError('Please capture at least 3 distinct facial poses before submitting.');
      return;
    }

    setIsSubmitting(true);
    setEnrollmentError('');
    try {
      await api.post('/student/register-face', { frames: framesList });
      setIsSuccess(true);
    } catch (err) {
      let errorMsg = 'Biometric template enrollment failed. Please retry.';
      if (typeof err.response?.data?.detail === 'string') {
        errorMsg = err.response.data.detail;
      } else if (Array.isArray(err.response?.data?.detail)) {
        errorMsg = err.response.data.detail.map((d) => d.msg).join(', ');
      } else if (err.message === 'Network Error' || !err.response) {
        errorMsg = 'Network connectivity or server response error. Please check backend connection and retry.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      setEnrollmentError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPoseConfig = POSES[currentStep];
  const allPosesCaptured = Object.keys(capturedPoses).length === POSES.length;
  const PoseIcon = currentPoseConfig.icon;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 mb-1">
          <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Guided Biometric Enrollment
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Student Face Registration</h1>
        <p className="text-slate-600 text-sm">
          Follow the step-by-step instructions to capture 5 distinct facial focus angles for high-accuracy recognition.
        </p>
      </div>

      {enrollmentError && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start justify-between space-x-3 text-rose-800 shadow-sm animate-shake">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <div className="font-bold text-rose-900">
                {enrollmentError.toLowerCase().includes('biometric conflict')
                  ? 'Biometric Registration Blocked'
                  : enrollmentError.toLowerCase().includes('network')
                  ? 'Network Error'
                  : 'Enrollment Notice'}
              </div>
              <div>{enrollmentError}</div>
              {enrollmentError.toLowerCase().includes('biometric conflict') && (
                <div className="text-xs text-rose-600 mt-1">
                  * Note: NeuroFace enforces 1-to-N biometric uniqueness across all students to eliminate multi-identity proxy fraud.
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setEnrollmentError('')}
            className="text-rose-400 hover:text-rose-700 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {cameraError && (
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl text-sm">
          {cameraError}
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        {/* Step Indicator Tracker Bar */}
        <div className="grid grid-cols-5 gap-2">
          {POSES.map((p, idx) => {
            const isCaptured = !!capturedPoses[idx];
            const isCurrent = currentStep === idx;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`p-2.5 rounded-2xl border text-center transition-all ${
                  isCurrent
                    ? 'border-teal-600 bg-teal-50/50 shadow-sm ring-2 ring-teal-500/20'
                    : isCaptured
                    ? 'border-emerald-300 bg-emerald-50/40 text-emerald-800'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-center space-x-1">
                  {isCaptured ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <span className="text-xs font-bold font-mono">{idx + 1}</span>
                  )}
                </div>
                <div className="text-[11px] font-bold truncate mt-1">
                  {p.title.split(' ')[0]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Current Instruction Banner */}
        <div className="p-5 rounded-2xl bg-slate-900 text-white flex items-start space-x-4 shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 flex-shrink-0">
            <PoseIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500 text-slate-950">
                Step {currentStep + 1} of 5
              </span>
              <h3 className="font-bold font-heading text-base text-white">{currentPoseConfig.title}</h3>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              {currentPoseConfig.instruction}
            </p>
            <p className="text-[11px] text-teal-400">
              <b>Tip:</b> {currentPoseConfig.hint}
            </p>
          </div>
        </div>

        {/* Live Webcam Feed with Interactive Oval */}
        <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center min-h-[400px]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto object-cover rounded-2xl"
          />

          {/* Biometric Guide Oval */}
          {!isSuccess && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`w-52 h-64 rounded-[48%] border-2 transition-all duration-300 flex flex-col items-center justify-between p-3 ${
                  liveValidation.valid
                    ? 'border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.35)]'
                    : 'border-dashed border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                }`}
              >
                <span className="text-[10px] text-white/90 font-bold uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {currentPoseConfig.title}
                </span>

                {/* Focus Direction Indicator Icon inside Oval */}
                <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 border border-white/20">
                  <PoseIcon className="w-5 h-5" />
                </div>

                <span className="text-[10px] text-white/80 font-medium bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  Keep Eyes on Lens
                </span>
              </div>
            </div>
          )}

          {/* Countdown Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="text-7xl font-extrabold text-white animate-ping font-heading">
                {countdown}
              </div>
            </div>
          )}

          {/* Live Validation Pill Badge at Bottom */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center pointer-events-none">
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border shadow flex items-center space-x-1.5 ${
                liveValidation.valid
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900/80 text-amber-300 border-amber-500/40'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${liveValidation.valid ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span>{liveValidation.message}</span>
            </div>
          </div>

          {/* Success Overlay */}
          {isSuccess && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-white space-y-3 p-6 text-center z-30">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold font-heading">5-Pose Biometric Template Generated!</h3>
              <p className="text-xs text-slate-300 max-w-sm">
                Your 512-D normalized ArcFace facial profile has been compiled and saved. You are now authorized for automatic classroom recognition.
              </p>
              <button
                onClick={() => window.location.href = '/student/my-attendance'}
                className="mt-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition-colors"
              >
                Go to Attendance Dashboard &rarr;
              </button>
            </div>
          )}
        </div>

        {/* Capture Controls for Current Pose */}
        {!isSuccess && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500">
              {capturedPoses[currentStep] ? (
                <span className="text-emerald-700 font-semibold flex items-center">
                  <Check className="w-4 h-4 mr-1 text-emerald-600" /> Pose {currentStep + 1} captured. Click retake or advance.
                </span>
              ) : (
                <span>Position yourself, then choose manual snap or 3-second timer.</span>
              )}
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleTimedCapture}
                disabled={!cameraActive || countdown !== null}
                className="flex-1 sm:flex-none px-4 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
              >
                ⏱ 3s Timer
              </button>

              <button
                type="button"
                onClick={handleCaptureCurrentPose}
                disabled={!cameraActive || countdown !== null}
                className="flex-1 sm:flex-none px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>
                  {capturedPoses[currentStep] ? `Retake Pose ${currentStep + 1}` : `Capture Pose ${currentStep + 1}`}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 5-Pose Review Gallery */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Captured Pose Gallery ({Object.keys(capturedPoses).length} of 5)
            </h4>
            <span className="text-[11px] text-slate-500">Click any thumbnail to retake</span>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {POSES.map((p, idx) => {
              const frame = capturedPoses[idx];
              return (
                <div
                  key={p.id}
                  onClick={() => frame && handleRetakePose(idx)}
                  className={`relative rounded-xl overflow-hidden border transition-all cursor-pointer aspect-[4/3] bg-slate-100 flex flex-col items-center justify-center ${
                    currentStep === idx
                      ? 'ring-2 ring-teal-500 border-teal-500'
                      : frame
                      ? 'border-emerald-300 hover:opacity-80'
                      : 'border-dashed border-slate-300'
                  }`}
                >
                  {frame ? (
                    <>
                      <img src={frame} alt={p.title} className="w-full h-full object-cover" />
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-semibold text-center py-0.5 truncate px-1">
                        {p.title.split(' ')[0]}
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-1">
                      <div className="text-[10px] font-bold text-slate-400">{idx + 1}</div>
                      <div className="text-[9px] text-slate-400 truncate">{p.title.split(' ')[0]}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Final Submission Banner */}
        {!isSuccess && (
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              {Object.keys(capturedPoses).length >= 3 ? (
                <span className="text-emerald-700 font-semibold">
                  ✓ Ready to generate ArcFace 512-D profile from {Object.keys(capturedPoses).length} poses.
                </span>
              ) : (
                <span>Please capture at least 3 poses (recommended: all 5) to proceed.</span>
              )}
            </div>

            <button
              onClick={handleSubmitBiometrics}
              disabled={Object.keys(capturedPoses).length < 3 || isSubmitting}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Compiling ArcFace Biometrics...'
                  : 'Generate & Save Biometric Template'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceRegistrationPage;
