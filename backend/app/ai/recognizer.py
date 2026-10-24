import os
import cv2
import numpy as np
from typing import List, Tuple, Optional, Dict

from app.ai.errors import AIModelUnavailableError
from app.core.config import settings


class FaceRecognizer:
    """Turns a face picture into a 512-D vector and matches it against students.

    Two backends are supported, tried in this order:
      1. An ONNX ArcFace model (fastest) at `app/ai/models/w600k_r50.onnx`.
      2. A PyTorch InceptionResnetV1 fallback from `facenet-pytorch`.

    The model loads lazily so importing this module is fast and never fails.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceRecognizer, cls).__new__(cls)
            cls._instance.onnx_session = None
            cls._instance.torch_model = None
            cls._instance.load_error = None
        return cls._instance

    def _ensure_initialized(self):
        """Backwards compatibility alias for _ensure_model."""
        self._ensure_model()

    # -- model loading -------------------------------------------------

    def _ensure_model(self):
        """Load the embedding model the first time an embedding is needed."""
        if self.onnx_session is not None or self.torch_model is not None:
            return
        if self.load_error:
            raise AIModelUnavailableError(self.load_error)

        onnx_path = os.path.join(settings.AI_MODELS_DIR, "w600k_r50.onnx")
        if os.path.exists(onnx_path):
            try:
                import onnxruntime as ort
                providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
                self.onnx_session = ort.InferenceSession(onnx_path, providers=providers)
                return
            except Exception as exc:
                print(f"[ArcFace] Could not load ONNX model ({exc}), using PyTorch fallback.")

        try:
            import torch
            from facenet_pytorch import InceptionResnetV1
        except ImportError as exc:
            self.load_error = (
                "The face recognition model is unavailable because neither an "
                "ArcFace ONNX model nor the 'facenet-pytorch' package could be "
                f"loaded ({exc}). Install it with: pip install facenet-pytorch"
            )
            raise AIModelUnavailableError(self.load_error)

        device = "cuda" if torch.cuda.is_available() else "cpu"
        self.torch_model = InceptionResnetV1(pretrained='vggface2').eval().to(device)

    @property
    def is_available(self) -> bool:
        """True when an embedding model is loaded or can be loaded."""
        return self.onnx_session is not None or self.torch_model is not None

    # -- embeddings ----------------------------------------------------

    def extract_embedding(self, aligned_bgr: np.ndarray) -> np.ndarray:
        """Return the 512-D face embedding of an aligned face crop.

        The returned vector is L2-normalised, so its length is always 1.0.
        """
        self._ensure_model()
        if self.onnx_session is not None:
            return self._extract_with_onnx(aligned_bgr)
        return self._extract_with_torch(aligned_bgr)

    def _extract_with_onnx(self, aligned_bgr: np.ndarray) -> np.ndarray:
        """Embed a face using the ONNX ArcFace model."""
        rgb = cv2.cvtColor(aligned_bgr, cv2.COLOR_BGR2RGB)
        if rgb.shape[:2] != (112, 112):
            rgb = cv2.resize(rgb, (112, 112))
        blob = cv2.dnn.blobFromImage(
            rgb,
            scalefactor=1.0 / 127.5,
            size=(112, 112),
            mean=(127.5, 127.5, 127.5),
            swapRB=False
        )
        input_name = self.onnx_session.get_inputs()[0].name
        output_name = self.onnx_session.get_outputs()[0].name
        raw_emb = self.onnx_session.run([output_name], {input_name: blob})[0][0]
        return self._normalize(raw_emb)

    def _extract_with_torch(self, aligned_bgr: np.ndarray) -> np.ndarray:
        """Embed a face using the PyTorch InceptionResnetV1 fallback."""
        import torch

        rgb = cv2.cvtColor(aligned_bgr, cv2.COLOR_BGR2RGB)
        if rgb.shape[:2] != (160, 160):
            rgb = cv2.resize(rgb, (160, 160))

        tensor = torch.from_numpy(rgb).permute(2, 0, 1).unsqueeze(0).float()
        tensor = (tensor - 127.5) / 128.0
        tensor = tensor.to(next(self.torch_model.parameters()).device)

        with torch.no_grad():
            emb = self.torch_model(tensor).cpu().numpy()[0]
        return self._normalize(emb)

    @staticmethod
    def _normalize(vector: np.ndarray) -> np.ndarray:
        """Scale a vector to unit length so cosine similarity is a plain dot product."""
        norm = np.linalg.norm(vector)
        if norm == 0:
            return vector.astype(np.float32)
        return (vector / norm).astype(np.float32)

    # -- matching ------------------------------------------------------

    @staticmethod
    def compute_similarity(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Cosine similarity between two vectors (1.0 = identical)."""
        dot = np.dot(embedding1, embedding2)
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return float(dot / (norm1 * norm2))

    def match_face(
        self,
        query_embedding: np.ndarray,
        registered_students: List[Dict[str, any]],
        threshold: Optional[float] = None
    ) -> Tuple[Optional[int], float, str]:
        """Find the registered student that best matches a face.

        `registered_students` is a list of {"student_id": int, "embedding": array}.
        Returns (student_id or None, best_score, "MATCHED" or "UNKNOWN").
        """
        thresh = threshold if threshold is not None else settings.SIMILARITY_THRESHOLD
        best_score = -1.0
        best_student_id = None

        for record in registered_students:
            score = self.compute_similarity(query_embedding, record["embedding"])
            if score > best_score:
                best_score = score
                best_student_id = record["student_id"]

        if best_score >= thresh and best_student_id is not None:
            return best_student_id, best_score, "MATCHED"
        return None, max(0.0, best_score), "UNKNOWN"


# One shared recognizer for the whole application.
face_recognizer = FaceRecognizer()
