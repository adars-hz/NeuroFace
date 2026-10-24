import cv2
import numpy as np
from typing import List, Tuple, Optional
from PIL import Image

from app.ai.errors import AIModelUnavailableError

# Canonical ArcFace reference landmarks for a 112x112 aligned image.
ARCFACE_DST = np.array([
    [38.2946, 51.6963],  # left eye
    [73.5318, 51.5014],  # right eye
    [56.0252, 71.7366],  # nose
    [41.5493, 92.3655],  # left mouth
    [70.7266, 92.2041]   # right mouth
], dtype=np.float32)


class FaceDetector:
    """Finds every face in a picture and aligns each one to the ArcFace format.

    The MTCNN model comes from the optional `facenet-pytorch` package. The
    model is loaded lazily (on first use) so that importing this module is
    fast and never fails. When the package is missing the detector reports
    itself as unavailable and raises a friendly error when used.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceDetector, cls).__new__(cls)
            cls._instance._mtcnn = None
            cls._instance.load_error = None
        return cls._instance

    # -- model loading -------------------------------------------------

    def _ensure_model(self):
        """Load MTCNN the first time it is needed."""
        if self._mtcnn is not None:
            return
        if self.load_error:
            raise AIModelUnavailableError(self.load_error)

        try:
            import torch
            from facenet_pytorch import MTCNN
        except ImportError as exc:
            self.load_error = (
                "The face detector is unavailable because the "
                f"'facenet-pytorch' package could not be loaded ({exc}). "
                "Install it with: pip install facenet-pytorch"
            )
            raise AIModelUnavailableError(self.load_error)

        device = "cuda" if torch.cuda.is_available() else "cpu"
        self._mtcnn = MTCNN(
            keep_all=True,
            select_largest=False,
            device=device,
            post_process=False,
            min_face_size=40,
            thresholds=[0.6, 0.7, 0.7]
        )

    @property
    def mtcnn(self):
        self._ensure_model()
        return self._mtcnn

    @property
    def is_available(self) -> bool:
        """True when the detector can actually run."""
        try:
            self._ensure_model()
            return True
        except Exception:
            return False

    # -- detection -----------------------------------------------------

    def align_face(self, img_bgr: np.ndarray, landmarks: np.ndarray) -> np.ndarray:
        """Warp a detected face onto the canonical 112x112 ArcFace template."""
        src_pts = np.array(landmarks, dtype=np.float32)
        transform, _ = cv2.estimateAffinePartial2D(src_pts, ARCFACE_DST)
        if transform is None:
            # Fall back to a plain resize if the transform cannot be estimated.
            return cv2.resize(img_bgr, (112, 112))
        return cv2.warpAffine(img_bgr, transform, (112, 112), borderValue=0.0)

    def detect_faces(self, img_bgr: np.ndarray) -> List[dict]:
        """Detect all faces in a BGR image.

        Returns one dictionary per face with the keys:
        'box' (x1, y1, x2, y2), 'score', 'landmarks', 'crop' and 'aligned'.
        """
        self._ensure_model()

        h, w = img_bgr.shape[:2]
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(img_rgb)

        boxes, scores, landmarks = self.mtcnn.detect(pil_img, landmarks=True)
        if boxes is None:
            return []

        results = []
        for i in range(len(boxes)):
            x1, y1, x2, y2 = [int(max(0, val)) for val in boxes[i]]
            x2 = min(w, x2)
            y2 = min(h, y2)

            # Skip boxes that are too small to be useful.
            if (x2 - x1) < 20 or (y2 - y1) < 20:
                continue

            pts = None
            if landmarks is not None and i < len(landmarks):
                pts = landmarks[i]

            crop = img_bgr[y1:y2, x1:x2]
            aligned = (
                self.align_face(img_bgr, pts)
                if pts is not None
                else cv2.resize(crop, (112, 112))
            )

            results.append({
                "box": [x1, y1, x2, y2],
                "score": float(scores[i]),
                "landmarks": pts.tolist() if pts is not None else [],
                "crop": crop,
                "aligned": aligned
            })

        return results


# One shared detector for the whole application.
face_detector = FaceDetector()
