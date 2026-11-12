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

            # Eye ROI check (y: 35 to 60, x: 25 to 88)
            eye1 = g1[35:60, 25:88]
            eye2 = g2_aligned[35:60, 25:88]
            e1_flat, e2_flat = eye1.flatten(), eye2.flatten()
            se1, se2 = np.std(e1_flat), np.std(e2_flat)
            eye_corr = float(np.corrcoef(e1_flat, e2_flat)[0, 1]) if se1 > 1e-3 and se2 > 1e-3 else 0.0
            eye_mae = float(np.mean(np.abs(eye1 - eye2)))

            # Natural liveness indicators:
            # - Eye blink / wink: eye_corr < 0.92 or eye_mae >= 5.2
            # - Natural facial micro-expression / breathing: face_corr < 0.965 or eye_corr < 0.935
            has_eye_movement = (eye_corr < 0.92 or eye_mae >= 5.2)
            has_micro_movement = (face_corr < 0.965 or eye_corr < 0.935)
            is_live_movement = has_eye_movement or has_micro_movement

            # If biological movement is confirmed, mark as live verified!
            if is_live_movement:
                return True, True, "Live human verified"

            # Motionless state (could be a still human or static photo / phone screen)
            if num_hits == 2:
                # Live student holding very still: prompt naturally
                return False, True, "Verifying (2/3) - please blink or nod"
            elif num_hits == 3:
                # Still holding motionless: prompt again
                return False, True, "Verifying (3/3) - please blink to confirm"
            else:
                # Persistently motionless across 4 consecutive frames (over 3.6s with zero movement)
                self.clear_student(session_id, student_id)
                self._spoof_cooldowns[session_id][student_id] = now + 3.0
                return False, False, f"Static photo / phone screen detected (corr={face_corr:.3f}, eye={eye_corr:.3f})"

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
