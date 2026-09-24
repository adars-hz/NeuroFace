import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "NeuroFace: AI Attendance Management System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "neuroface-super-secret-production-key-change-in-env-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database
    DATABASE_URL: str = "sqlite:///./neuroface.db"

    # Institutional Defaults
    ATTENDANCE_MIN_PERCENTAGE: float = 85.0
    CONDONATION_MIN_PERCENTAGE: float = 75.0
    DEFAULT_FINE_AMOUNT: float = 500.0

    # AI Recognition Parameters
    SIMILARITY_THRESHOLD: float = 0.52      # ArcFace cosine similarity threshold for attendance
    DUPLICATE_FACE_THRESHOLD: float = 0.85  # Stricter threshold for blocking identical multi-ID enrollments
    MIN_FACE_SIZE: int = 45                # Minimum pixel bounding box
    BLUR_THRESHOLD: float = 20.0            # Laplacian variance cutoff
    TEMPORAL_CONFIRM_FRAMES: int = 2       # Frames out of 3 needed for confirmation

    # Uploads & Storage
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")
    LEAVE_UPLOAD_DIR: str = os.path.join(UPLOAD_DIR, "leaves")
    FACE_SAMPLES_DIR: str = os.path.join(UPLOAD_DIR, "faces")
    AI_MODELS_DIR: str = os.path.join(BASE_DIR, "app", "ai", "models")

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.LEAVE_UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.FACE_SAMPLES_DIR, exist_ok=True)
os.makedirs(settings.AI_MODELS_DIR, exist_ok=True)
