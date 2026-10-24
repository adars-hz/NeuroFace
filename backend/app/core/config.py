import os
from typing import List
from pydantic import model_validator
from pydantic_settings import BaseSettings

# The backend folder (this file lives in app/core/).
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class Settings(BaseSettings):
    """Every setting of the NeuroFace backend in one place.

    Each value can be changed with an environment variable of the same name
    (see the `.env` file) so nothing has to be edited in the code.
    """

    PROJECT_NAME: str = "NeuroFace: AI Attendance Management System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "fallback-dev-key-for-local-only-123")
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
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")
    LEAVE_UPLOAD_DIR: str = ""
    FACE_SAMPLES_DIR: str = ""
    AI_MODELS_DIR: str = os.path.join(BASE_DIR, "app", "ai", "models")

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True

    @model_validator(mode="after")
    def derive_folders(self):
        """Work out the folders that live inside UPLOAD_DIR."""
        if not self.LEAVE_UPLOAD_DIR:
            self.LEAVE_UPLOAD_DIR = os.path.join(self.UPLOAD_DIR, "leaves")
        if not self.FACE_SAMPLES_DIR:
            self.FACE_SAMPLES_DIR = os.path.join(self.UPLOAD_DIR, "faces")
        return self


settings = Settings()

# Make sure every folder the app writes to exists.
for _folder in (settings.UPLOAD_DIR, settings.LEAVE_UPLOAD_DIR, settings.FACE_SAMPLES_DIR, settings.AI_MODELS_DIR):
    os.makedirs(_folder, exist_ok=True)
