import os
import cv2
import numpy as np
from typing import List, Tuple, Optional, Dict
from app.core.config import settings

class FaceRecognizer:
    """ArcFace 512-D Embedding Extractor & Cosine Matcher."""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceRecognizer, cls).__new__(cls)
            cls._instance._initialized = False
            cls._instance.onnx_session = None
            cls._instance.torch_fallback = None
        return cls._instance

    def _ensure_initialized(self):
        if not self._initialized:
            self._init_model()
            self._initialized = True

    def _init_model(self):
        self.onnx_session = None
        self.torch_fallback = None
        onnx_path = os.path.join(settings.AI_MODELS_DIR, "w600k_r50.onnx")

        if os.path.exists(onnx_path):
            try:
                import onnxruntime as ort
                providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
                self.onnx_session = ort.InferenceSession(onnx_path, providers=providers)
                print(f"[ArcFace] Initialized ONNX session using providers: {self.onnx_session.get_providers()}")
                return
            except Exception as e:
                print(f"[ArcFace] Could not load ONNX model ({e}), falling back to Torch InceptionResnetV1.")

        # Robust built-in fallback: InceptionResnetV1 (512-D normalized embeddings)
        import torch
        from facenet_pytorch import InceptionResnetV1
        device = "cuda" if torch.cuda.is_available() else "cpu"
        self.torch_fallback = InceptionResnetV1(pretrained='vggface2').eval().to(device)
        print(f"[ArcFace] Initialized 512-D PyTorch embedding model on {device}")

    def extract_embedding(self, aligned_bgr: np.ndarray) -> np.ndarray:
        """
        Extract normalized 512-dimensional face embedding.
        Input: Aligned 112x112 BGR or RGB face crop.
        Output: 512-D float32 numpy array with L2 norm = 1.0.
        """
        self._ensure_initialized()
        if self.onnx_session is not None:
            # Preprocessing for InsightFace ArcFace
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
            norm = np.linalg.norm(raw_emb)
            return (raw_emb / norm).astype(np.float32)

        # PyTorch fallback extraction
        import torch
        rgb = cv2.cvtColor(aligned_bgr, cv2.COLOR_BGR2RGB)
        if rgb.shape[:2] != (160, 160):
            # InceptionResnetV1 expects 160x160
            resized = cv2.resize(rgb, (160, 160))
        else:
            resized = rgb

        tensor = torch.from_numpy(resized).permute(2, 0, 1).unsqueeze(0).float()
        tensor = (tensor - 127.5) / 128.0
        device = next(self.torch_fallback.parameters()).device
        tensor = tensor.to(device)

        with torch.no_grad():
            emb = self.torch_fallback(tensor).cpu().numpy()[0]
        norm = np.linalg.norm(emb)
        return (emb / norm).astype(np.float32)

    @staticmethod
    def compute_similarity(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Calculate cosine similarity between two unit-normalized vectors."""
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
        """
        Match a query embedding against a list of registered student embeddings.
        Returns: (student_id or None, best_score, status: 'MATCHED' | 'UNKNOWN')
        """
        thresh = threshold if threshold is not None else settings.SIMILARITY_THRESHOLD
        best_score = -1.0
        best_student_id = None

        for student in registered_students:
            score = self.compute_similarity(query_embedding, student["embedding"])
            if score > best_score:
                best_score = score
                best_student_id = student["student_id"]

        if best_score >= thresh and best_student_id is not None:
            return best_student_id, best_score, "MATCHED"
        else:
            return None, max(0.0, best_score), "UNKNOWN"

face_recognizer = FaceRecognizer()
