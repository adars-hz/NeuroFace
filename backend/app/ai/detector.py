import cv2
import numpy as np
from typing import List, Tuple, Optional
from PIL import Image

# Canonical ArcFace reference landmarks for 112x112 aligned image
ARCFACE_DST = np.array([
    [38.2946, 51.6963],  # left eye
    [73.5318, 51.5014],  # right eye
    [56.0252, 71.7366],  # nose
    [41.5493, 92.3655],  # left mouth
    [70.7266, 92.2041]   # right mouth
], dtype=np.float32)

class FaceDetector:
    """MTCNN Multi-face detector and 5-point landmark alignment engine."""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceDetector, cls).__new__(cls)
            cls._instance._mtcnn = None
        return cls._instance

    @property
    def mtcnn(self):
        if self._mtcnn is None:
            import torch
            from facenet_pytorch import MTCNN
            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"[FaceDetector] Initializing MTCNN detector on {device}...")
            self._mtcnn = MTCNN(
                keep_all=True,
                select_largest=False,
                device=device,
                post_process=False,
                min_face_size=40,
                thresholds=[0.6, 0.7, 0.7]
            )
            print("[FaceDetector] MTCNN ready.")
        return self._mtcnn

    def align_face(self, img_bgr: np.ndarray, landmarks: np.ndarray) -> np.ndarray:
        """Align face image to canonical 112x112 dimensions using 5 landmarks."""
        src_pts = np.array(landmarks, dtype=np.float32)
        # Estimate similarity transform matrix
        tform, _ = cv2.estimateAffinePartial2D(src_pts, ARCFACE_DST)
        if tform is None:
            # Fallback simple crop if transform estimation fails
            return cv2.resize(img_bgr, (112, 112))
        aligned = cv2.warpAffine(img_bgr, tform, (112, 112), borderValue=0.0)
        return aligned

    def detect_faces(self, img_bgr: np.ndarray) -> List[dict]:
        """
        Detect multiple faces in an image.
        Returns list of dicts with:
        - 'box': [x1, y1, x2, y2]
        - 'score': confidence
        - 'landmarks': 5 landmark coordinates
        - 'aligned': aligned 112x112 BGR face crop
        """
        h, w = img_bgr.shape[:2]
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(img_rgb)

        boxes, scores, landmarks = self.mtcnn.detect(pil_img, landmarks=True)

        results = []
        if boxes is None:
            return results

        for i in range(len(boxes)):
            box = boxes[i]
            score = scores[i]
            pts = landmarks[i] if landmarks is not None else None

            # Clamp coordinates
            x1, y1, x2, y2 = [int(max(0, val)) for val in box]
            x2 = min(w, x2)
            y2 = min(h, y2)

            if (x2 - x1) < 20 or (y2 - y1) < 20:
                continue

            crop = img_bgr[y1:y2, x1:x2]

            if pts is not None:
                aligned = self.align_face(img_bgr, pts)
            else:
                aligned = cv2.resize(crop, (112, 112))

            results.append({
                "box": [x1, y1, x2, y2],
                "score": float(score),
                "landmarks": pts.tolist() if pts is not None else [],
                "crop": crop,
                "aligned": aligned
            })

        return results

face_detector = FaceDetector()
