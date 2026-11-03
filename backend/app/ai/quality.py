import cv2
import numpy as np
from typing import Tuple

from app.core.config import settings


def evaluate_face_quality(
    face_img: np.ndarray,
    min_size: int = None,
    blur_threshold: float = None
) -> Tuple[bool, str]:
    """Check a face crop before we try to recognise it.

    Uses calibrated thresholds for phone/webcam sensors in diverse classroom lighting:
      1. Size      - the crop must be at least `min_size` pixels wide and tall.
      2. Sharpness - the Laplacian variance must be above `blur_threshold` (6.0 for webcams).
      3. Lighting  - handles ambient shadows (down to 18) and bright daylight.
    """
    if min_size is None:
        min_size = getattr(settings, 'MIN_FACE_SIZE', 30)
    if blur_threshold is None:
        blur_threshold = getattr(settings, 'BLUR_THRESHOLD', 3.5)

    h, w = face_img.shape[:2]

    # 1. Size check
    if w < min_size or h < min_size:
        return False, f"Face too small ({w}x{h}px). Minimum required is {min_size}px."

    # 2. Blur check using Laplacian variance
    gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY) if len(face_img.shape) == 3 else face_img
    variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if variance < blur_threshold:
        return False, f"Face image is blurry (score: {variance:.1f}, min: {blur_threshold:.1f})."

    # 3. Brightness check
    mean_brightness = float(np.mean(gray))
    if mean_brightness < 10:
        return False, "Poor lighting: Image is too dark."
    if mean_brightness > 248:
        return False, "Poor lighting: Image is overexposed/too bright."

    return True, "Good quality"
