import cv2
import numpy as np
from typing import Tuple

def evaluate_face_quality(
    face_img: np.ndarray,
    min_size: int = 45,
    blur_threshold: float = 20.0
) -> Tuple[bool, str]:
    """
    Evaluate face crop for quality constraints:
    - Minimum size (w, h)
    - Blur check via Laplacian variance
    - Lighting / illumination distribution
    """
    h, w = face_img.shape[:2]

    # 1. Size check
    if w < min_size or h < min_size:
        return False, f"Face too small ({w}x{h}px). Minimum required is {min_size}px."

    # 2. Blur check using Laplacian variance
    gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY) if len(face_img.shape) == 3 else face_img
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    if variance < blur_threshold:
        return False, f"Face image is blurry (score: {variance:.1f}, min: {blur_threshold:.1f})."

    # 3. Brightness check
    mean_brightness = np.mean(gray)
    if mean_brightness < 40:
        return False, "Poor lighting: Image is too dark."
    if mean_brightness > 225:
        return False, "Poor lighting: Image is overexposed/too bright."

    return True, "Good quality"
