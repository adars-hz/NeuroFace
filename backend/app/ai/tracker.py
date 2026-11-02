import time
from collections import defaultdict, deque
from typing import Dict, Deque

class MultiFrameConfirmationBuffer:
    """
    Buffer to ensure a student is detected in multiple consecutive clean frames
    before officially marking attendance, with strict anti-spoof temporal lockout.
    """
    def __init__(self, required_hits: int = 3, window_size: int = 4, max_idle_seconds: float = 4.0):
        self.required_hits = required_hits
        self.window_size = window_size
        self.max_idle_seconds = max_idle_seconds
        # session_id -> student_id -> Deque of timestamps
        self._buffers: Dict[int, Dict[int, Deque[float]]] = defaultdict(lambda: defaultdict(lambda: deque(maxlen=window_size)))
        # session_id -> lockout timestamp (when a phone/screen spoof was detected)
        self._spoof_lockouts: Dict[int, float] = {}

    def record_spoof(self, session_id: int, lockout_seconds: float = 4.0):
        """
        When a phone or screen presentation attack is detected in a frame,
        immediately purge all pending confirmation hits and lock the session.
        This guarantees a phone cannot mark attendance!
        """
        now = time.time()
        self._spoof_lockouts[session_id] = now + lockout_seconds
        if session_id in self._buffers:
            self._buffers[session_id].clear()

    def is_locked_out(self, session_id: int) -> bool:
        """Returns True if the session is currently locked out due to a recent spoof attempt."""
        now = time.time()
        return now < self._spoof_lockouts.get(session_id, 0.0)

    def record_hit(self, session_id: int, student_id: int) -> bool:
        """
        Record a positive recognition hit for a student in a session.
        Returns True if the student meets the temporal confirmation criterion without spoofing.
        """
        now = time.time()
        # If a phone/screen was detected within the lockout window, block confirmation!
        if now < self._spoof_lockouts.get(session_id, 0.0):
            return False

        hit_deque = self._buffers[session_id][student_id]

        # Purge stale timestamps beyond max_idle_seconds
        while hit_deque and (now - hit_deque[0]) > self.max_idle_seconds:
            hit_deque.popleft()

        hit_deque.append(now)

        return len(hit_deque) >= self.required_hits

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
