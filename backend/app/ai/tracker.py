import time
from collections import defaultdict, deque
from typing import Dict, Deque

class MultiFrameConfirmationBuffer:
    """
    Buffer to ensure a student is detected in multiple consecutive frames
    before officially marking attendance.
    """
    def __init__(self, required_hits: int = 2, window_size: int = 3, max_idle_seconds: float = 8.0):
        self.required_hits = required_hits
        self.window_size = window_size
        self.max_idle_seconds = max_idle_seconds
        # session_id -> student_id -> Deque of timestamps
        self._buffers: Dict[int, Dict[int, Deque[float]]] = defaultdict(lambda: defaultdict(lambda: deque(maxlen=window_size)))

    def record_hit(self, session_id: int, student_id: int) -> bool:
        """
        Record a positive recognition hit for a student in a session.
        Returns True if the student meets the temporal confirmation criterion.
        """
        now = time.time()
        hit_deque = self._buffers[session_id][student_id]

        # Purge stale timestamps beyond max_idle_seconds
        while hit_deque and (now - hit_deque[0]) > self.max_idle_seconds:
            hit_deque.popleft()

        hit_deque.append(now)

        return len(hit_deque) >= self.required_hits

    def clear_session(self, session_id: int):
        """Clear memory buffer when an attendance session ends."""
        if session_id in self._buffers:
            del self._buffers[session_id]

frame_tracker = MultiFrameConfirmationBuffer()
