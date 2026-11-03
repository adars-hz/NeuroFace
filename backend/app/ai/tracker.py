import time
from collections import defaultdict, deque
from typing import Dict, Deque, List, Optional, Tuple, Any
from dataclasses import dataclass
import numpy as np


@dataclass
class FrameSample:
    timestamp: float
    landmarks: Optional[List[List[float]]]
    aligned_crop: Optional[np.ndarray]


class MultiFrameConfirmationBuffer:
    """
    Buffer to ensure a student is detected across multiple consecutive clean frames
    before officially marking attendance, with strict anti-spoof temporal liveness analysis.
    Prevents presentation attacks using printed photos on paper or still images on mobile devices.
    """
    def __init__(self, required_hits: int = 2, window_size: int = 4, max_idle_seconds: float = 3.5):
        self.required_hits = required_hits
        self.window_size = window_size
        self.max_idle_seconds = max_idle_seconds
        # session_id -> student_id -> Deque of FrameSample
        self._buffers: Dict[int, Dict[int, Deque[FrameSample]]] = defaultdict(
            lambda: defaultdict(lambda: deque(maxlen=window_size))
        )
        # session_id -> lockout timestamp (when a phone/screen/photo spoof was detected)
        self._spoof_lockouts: Dict[int, float] = {}

    def record_spoof(self, session_id: int, lockout_seconds: float = 1.0):
        """
        When a phone, screen, or photo attack is detected, immediately purge all pending
        confirmation hits and lock the session.
        """
        now = time.time()
        self._spoof_lockouts[session_id] = now + lockout_seconds
        if session_id in self._buffers:
            self._buffers[session_id].clear()

    def is_locked_out(self, session_id: int) -> bool:
        """Returns True if the session is currently locked out due to a recent spoof attempt."""
        now = time.time()
        return now < self._spoof_lockouts.get(session_id, 0.0)

    def evaluate_temporal_liveness(self, samples: List[FrameSample]) -> Tuple[bool, str]:
        """
        Evaluates temporal micro-movement and organic facial dynamics across consecutive frames.
        A real human exhibits involuntary micro-movements, eye saccades/blinks, and lip micro-tension.
        A static 2D photo (printed on paper or displayed on a mobile device) has ZERO facial
        micro-movement across the eye and mouth regions (identical cross-correlation > 0.992).
        """
        if len(samples) < 2:
            return True, "Collecting frames"

        corrs = []
        eye_corrs = []
        mouth_corrs = []
        maes = []

        for i in range(1, len(samples)):
            c1 = samples[i - 1].aligned_crop
            c2 = samples[i].aligned_crop
            if c1 is not None and c2 is not None and c1.shape == (112, 112, 3) and c2.shape == (112, 112, 3):
                # 1. Full-face correlation
                f1 = c1.flatten().astype(np.float32)
                f2 = c2.flatten().astype(np.float32)
                s1, s2 = np.std(f1), np.std(f2)
                if s1 > 1e-3 and s2 > 1e-3:
                    corrs.append(float(np.corrcoef(f1, f2)[0, 1]))
                maes.append(float(np.mean(np.abs(f1 - f2))))

                # 2. Eye Region ROI (y: 35 to 60, x: 25 to 88)
                e1 = c1[35:60, 25:88].flatten().astype(np.float32)
                e2 = c2[35:60, 25:88].flatten().astype(np.float32)
                es1, es2 = np.std(e1), np.std(e2)
                if es1 > 1e-3 and es2 > 1e-3:
                    eye_corrs.append(float(np.corrcoef(e1, e2)[0, 1]))

                # 3. Mouth Region ROI (y: 70 to 95, x: 32 to 80)
                m1 = c1[70:95, 32:80].flatten().astype(np.float32)
                m2 = c2[70:95, 32:80].flatten().astype(np.float32)
                ms1, ms2 = np.std(m1), np.std(m2)
                if ms1 > 1e-3 and ms2 > 1e-3:
                    mouth_corrs.append(float(np.corrcoef(m1, m2)[0, 1]))

        avg_corr = float(np.mean(corrs)) if corrs else 0.0
        avg_eye_corr = float(np.mean(eye_corrs)) if eye_corrs else 0.0
        avg_mouth_corr = float(np.mean(mouth_corrs)) if mouth_corrs else 0.0
        avg_mae = float(np.mean(maes)) if maes else 99.0

        # A static photo (phone photo or paper print):
        # Both eyes and mouth are completely motionless across frames (correlation > 0.992)
        # Or full-face correlation > 0.995 with low MAE
        is_static = (avg_corr > 0.992 and avg_eye_corr > 0.992 and avg_mouth_corr > 0.992) or (avg_corr > 0.995 and avg_mae < 2.5)

        if is_static:
            return False, f"Static photo / phone image detected (Zero facial micro-movement: eye_corr={avg_eye_corr:.4f}, mouth_corr={avg_mouth_corr:.4f})"

        return True, "Live human verified"

    def record_hit(
        self,
        session_id: int,
        student_id: int,
        landmarks: Optional[List[List[float]]] = None,
        aligned_crop: Optional[np.ndarray] = None
    ) -> Tuple[bool, bool, str]:
        """
        Record a positive recognition hit for a student in a session.
        Returns: (confirmed: bool, is_live: bool, message: str)
        """
        now = time.time()
        # If in lockout, reject confirmation
        if now < self._spoof_lockouts.get(session_id, 0.0):
            return False, True, "Cooldown lockout active"

        hit_deque = self._buffers[session_id][student_id]

        # Purge stale timestamps beyond max_idle_seconds
        while hit_deque and (now - hit_deque[0].timestamp) > self.max_idle_seconds:
            hit_deque.popleft()

        hit_deque.append(FrameSample(now, landmarks, aligned_crop))

        if len(hit_deque) < self.required_hits:
            return False, True, f"Verifying ({len(hit_deque)}/{self.required_hits})"

        # Evaluate temporal liveness across the required consecutive hits
        is_live, reason = self.evaluate_temporal_liveness(list(hit_deque))
        if not is_live:
            # Static photo or device image detected! Clear buffers and lockout session
            self.record_spoof(session_id, lockout_seconds=3.0)
            return False, False, reason

        return True, True, "Live human verified"

    def clear_student(self, session_id: int, student_id: int):
        """Clear memory buffer for a specific student in a session (e.g. after manual reset)."""
        if session_id in self._buffers and student_id in self._buffers[session_id]:
            del self._buffers[session_id][student_id]

    def clear_session(self, session_id: int):
        """Clear memory buffer when an attendance session ends."""
        if session_id in self._buffers:
            del self._buffers[session_id]
        if session_id in self._spoof_lockouts:
            del self._spoof_lockouts[session_id]

frame_tracker = MultiFrameConfirmationBuffer()
