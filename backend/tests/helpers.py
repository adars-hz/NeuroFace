"""Small helpers the tests use to fake the face recognition models.

The real MTCNN/ArcFace models need a lot of hardware and downloaded weights,
so the tests replace them with simple stand-ins. That keeps the test suite
fast and lets us check the business rules (multi-frame confirmation,
duplicate blocking, ...) without a camera.
"""

import base64

import cv2
import numpy as np


def make_face_crop(size: int = 100, seed: int = 0) -> np.ndarray:
    """A fake face crop: big enough, sharp enough and lit well enough to pass."""
    rng = np.random.default_rng(seed)
    return rng.integers(60, 200, size=(size, size, 3), dtype=np.uint8)


def make_aligned_face(seed: int = 0) -> np.ndarray:
    """A fake aligned 112x112 face."""
    return make_face_crop(112, seed)


def encode_image(image: np.ndarray) -> str:
    """Encode a picture as a base64 string, the way the frontend sends it."""
    success, buffer = cv2.imencode(".jpg", image)
    assert success, "Could not encode the test image"
    return base64.b64encode(buffer.tobytes()).decode("utf-8")


def unit_vector(seed: int = 0, size: int = 512) -> np.ndarray:
    """A random unit-length vector, used as a fake face embedding."""
    rng = np.random.default_rng(seed)
    vector = rng.random(size).astype(np.float32)
    return vector / np.linalg.norm(vector)


class FakeDetector:
    """Stands in for `face_detector` - always finds the same faces."""

    def __init__(self, face_count: int = 1, score: float = 0.99):
        self.face_count = face_count
        self.score = score
        self.calls = 0

    def detect_faces(self, image):
        self.calls += 1
        return [
            {
                "box": [0, 0, 100, 100],
                "score": self.score,
                "landmarks": [],
                "crop": make_face_crop(),
                "aligned": make_aligned_face(),
            }
            for _ in range(self.face_count)
        ]


class FakeRecognizer:
    """Stands in for `face_recognizer`.

    `embeddings` maps a student id to the vector that face should produce.
    Any student not in the map gets a unique random vector, so two different
    students never look the same.
    """

    def __init__(self, embeddings=None, default_seed: int = 999):
        self.embeddings = embeddings or {}
        self.default_seed = default_seed
        self.calls = 0

    def extract_embedding(self, aligned_face):
        self.calls += 1
        return unit_vector(seed=self.default_seed)

    def embedding_for(self, student_id: int) -> np.ndarray:
        """The vector this recognizer produces for a given student."""
        if student_id in self.embeddings:
            return self.embeddings[student_id]
        return unit_vector(seed=self.default_seed + student_id)

    @staticmethod
    def compute_similarity(a, b) -> float:
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    def match_face(self, query_embedding, registered_students, threshold=None):
        """Return the best matching student, exactly like the real one."""
        best_score = -1.0
        best_student_id = None

        for student in registered_students:
            score = self.compute_similarity(query_embedding, student["embedding"])
            if score > best_score:
                best_score = score
                best_student_id = student["student_id"]

        if best_score >= (threshold if threshold is not None else 0.52) and best_student_id is not None:
            return best_student_id, best_score, "MATCHED"
        return None, max(0.0, best_score), "UNKNOWN"
