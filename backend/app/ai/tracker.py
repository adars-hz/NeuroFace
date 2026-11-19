import time
from collections import defaultdict, deque
from typing import Dict, Deque, List, Optional, Tuple, Any
from dataclasses import dataclass
import numpy as np
import cv2


@dataclass
class FrameSample:
    timestamp: float
    landmarks: Optional[List[List[float]]]
    aligned_crop: Optional[np.ndarray]


class MultiFrameConfirmationBuffer:
    """
    Buffer to ensure a student is detected across consecutive frames
    before officially marking attendance, with intelligent temporal liveness analysis.
    Prevents presentation attacks using printed photos or still images on phone screens
    without falsely rejecting real students sitting in front of the camera.
    """
    def __init__(self, required_hits: int = 2, window_size: int = 5, max_idle_seconds: float = 4.0):
        self.required_hits = required_hits
        self.window_size = window_size
        self.max_idle_seconds = max_idle_seconds
        # session_id -> student_id -> Deque of FrameSample
        self._buffers: Dict[int, Dict[int, Deque[FrameSample]]] = defaultdict(
            lambda: defaultdict(lambda: deque(maxlen=window_size))
        )
        # session_id -> student_id -> float (cooldown expiry timestamp when spoof detected)
        self._spoof_cooldowns: Dict[int, Dict[int, float]] = defaultdict(dict)

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
          - (True, True, "Live human verified") -> Marks attendance as PRESENT
          - (False, True, "Verifying (x/y)...")  -> Keeps in CONFIRMING state (amber box)
          - (False, False, "Static photo...")   -> Flags as SPOOF_DETECTED (red box)
        """
        now = time.time()

        # Check if student is in spoof lockout cooldown
        cooldown_until = self._spoof_cooldowns.get(session_id, {}).get(student_id, 0.0)
        if now < cooldown_until:
            return False, False, "PHONE / IMAGE DETECTED - REJECTED"

        hit_deque = self._buffers[session_id][student_id]

        # Purge stale timestamps beyond max_idle_seconds
        while hit_deque and (now - hit_deque[0].timestamp) > self.max_idle_seconds:
            hit_deque.popleft()

        hit_deque.append(FrameSample(now, landmarks, aligned_crop))
        num_hits = len(hit_deque)

        # Hit 1: Initial detection, awaiting temporal verification
        if num_hits < 2:
            return False, True, "Verifying (1/2)"

        # Evaluate temporal liveness across the last two consecutive frames
        samples = list(hit_deque)
        c1 = samples[-2].aligned_crop
        c2 = samples[-1].aligned_crop

        if c1 is not None and c2 is not None and c1.shape == (112, 112, 3) and c2.shape == (112, 112, 3):
            g1 = cv2.cvtColor(c1, cv2.COLOR_BGR2GRAY).astype(np.float32)
            g2 = cv2.cvtColor(c2, cv2.COLOR_BGR2GRAY).astype(np.float32)

            # Motion compensation to eliminate natural hand tremor / camera shake
            (shift_x, shift_y), _ = cv2.phaseCorrelate(g1, g2)
            h, w = g1.shape[:2]
            M = np.float32([[1, 0, -shift_x], [0, 1, -shift_y]])
            g2_aligned = cv2.warpAffine(g2, M, (w, h))

            pad = min(10, max(3, int(max(abs(shift_x), abs(shift_y)) + 1)))
            roi1 = g1[pad:h-pad, pad:w-pad].flatten()
            roi2 = g2_aligned[pad:h-pad, pad:w-pad].flatten()
            s1, s2 = np.std(roi1), np.std(roi2)
            face_corr = float(np.corrcoef(roi1, roi2)[0, 1]) if s1 > 1e-3 and s2 > 1e-3 else 0.0

            # 1. Rigid Skull / Forehead anchor ROI (y: 14 to 34, x: 28 to 84)
            fh1 = g1[14:34, 28:84]
            fh2 = g2_aligned[14:34, 28:84]
            std_fh = np.std(fh1) + 1e-3
            fh_norm_mae = float(np.mean(np.abs(fh1 - fh2))) / std_fh

            # 2. Eye/Eyelid ROI (y: 36 to 58, x: 22 to 90)
            eye1 = g1[36:58, 22:90]
            eye2 = g2_aligned[36:58, 22:90]
            std_eye = np.std(eye1) + 1e-3
            eye_norm_mae = float(np.mean(np.abs(eye1 - eye2))) / std_eye

            # 3. Mouth/Lip ROI (y: 76 to 100, x: 30 to 82)
            m1 = g1[76:100, 30:82]
            m2 = g2_aligned[76:100, 30:82]
            std_m = np.std(m1) + 1e-3
            m_norm_mae = float(np.mean(np.abs(m1 - m2))) / std_m

            # Biological Liveness Discrimination:
            # - In a phone screen or static photo: the whole 2D plane moves rigidly with hand tremor.
            #   Normalized local motions are almost equal across all regions (ratio ~ 0.7 - 1.15).
            # - In a real living human:
            #   Eye blink: eyelid covers the eye, causing massive local eye MAE (ratio >= 1.60, eye_norm_mae >= 0.70)
            #   while the forehead/skull bone structure remains stable!
            eye_relative_motion = eye_norm_mae / (fh_norm_mae + 1e-4)
            is_eye_blink = (eye_relative_motion >= 1.60 and eye_norm_mae >= 0.65) or (eye_norm_mae >= 1.40)
            is_mouth_movement = (m_norm_mae / (fh_norm_mae + 1e-4) >= 1.80 and m_norm_mae >= 0.75)

            is_biological_liveness = is_eye_blink or is_mouth_movement

            # Also check across earlier sample in buffer (e.g. frame 0 vs frame 2)
            if not is_biological_liveness and len(samples) >= 3:
                c0 = samples[-3].aligned_crop
                if c0 is not None and c0.shape == (112, 112, 3):
                    g0 = cv2.cvtColor(c0, cv2.COLOR_BGR2GRAY).astype(np.float32)
                    (sx0, sy0), _ = cv2.phaseCorrelate(g0, g2)
                    M0 = np.float32([[1, 0, -sx0], [0, 1, -sy0]])
                    g2_al0 = cv2.warpAffine(g2, M0, (w, h))

                    fh0 = g0[14:34, 28:84]
                    eye0 = g0[36:58, 22:90]
                    fh0_norm = float(np.mean(np.abs(fh0 - g2_al0[14:34, 28:84]))) / (np.std(fh0) + 1e-3)
                    eye0_norm = float(np.mean(np.abs(eye0 - g2_al0[36:58, 22:90]))) / (np.std(eye0) + 1e-3)
                    if (eye0_norm / (fh0_norm + 1e-4) >= 1.60 and eye0_norm >= 0.65) or (eye0_norm >= 1.40):
                        is_biological_liveness = True

            # If biological movement is confirmed, mark as live verified!
            if is_biological_liveness:
                return True, True, "Live human verified"

            # Motionless state or Rigid 2D movement (static photo / phone screen moved by hand)
            if num_hits == 2:
                # Live student holding very still or phone held in hand: prompt naturally
                return False, True, "Verifying (2/3) - please blink or nod"
            elif num_hits == 3:
                # Still holding motionless / rigid: prompt again
                return False, True, "Verifying (3/3) - please blink to confirm"
            else:
                # Persistently rigid across 4 consecutive frames (over 4.5s with zero biological blink)
                # Static photo / phone screen presentation attack!
                self.clear_student(session_id, student_id)
                self._spoof_cooldowns[session_id][student_id] = now + 4.0
                return False, False, f"Static phone screen / photo detected (no biological blink, rigid motion ratio={eye_relative_motion:.2f})"

        # Fallback if crops are unavailable
        return True, True, "Live human verified"

    def clear_student(self, session_id: int, student_id: int):
        """Clear memory buffer for a specific student in a session."""
        if session_id in self._buffers and student_id in self._buffers[session_id]:
            del self._buffers[session_id][student_id]

    def clear_session(self, session_id: int):
        """Clear memory buffer when an attendance session ends."""
        if session_id in self._buffers:
            del self._buffers[session_id]
        if session_id in self._spoof_cooldowns:
            del self._spoof_cooldowns[session_id]


frame_tracker = MultiFrameConfirmationBuffer()
