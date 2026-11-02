import cv2
import numpy as np
from typing import Tuple, Optional, List


def verify_face_landmarks(landmarks: List[List[float]], box: List[int]) -> Tuple[bool, str]:
    """
    Verifies that the detected facial landmarks follow natural human facial anatomy.
    Prevents false positive detections from objects, clothing prints, bag logos, and wall artifacts.
    """
    if not landmarks or len(landmarks) < 5:
        return True, "Landmarks not available for check"

    pts = np.array(landmarks, dtype=np.float32)
    left_eye, right_eye, nose, left_mouth, right_mouth = pts[:5]

    x1, y1, x2, y2 = box
    w = max(1, x2 - x1)
    h = max(1, y2 - y1)

    # 1. Eye horizontal separation (eyes must be separated and not reversed)
    eye_dx = right_eye[0] - left_eye[0]
    eye_dy = abs(right_eye[1] - left_eye[1])

    if eye_dx < 0.16 * w:
        return False, "Eyes are too close or reversed (non-face object)"

    # Head tilt / vertical asymmetry check (rejects vertical logo patterns)
    if eye_dy / (eye_dx + 1e-6) > 0.45:
        return False, "Invalid eye angle / vertical landmark distortion (non-face object)"

    # 2. Vertical anatomy ordering: eyes must be above nose, and nose must be above mouth
    eyes_y = (left_eye[1] + right_eye[1]) / 2.0
    mouth_y = (left_mouth[1] + right_mouth[1]) / 2.0

    if not (eyes_y < nose[1] < mouth_y):
        return False, "Scrambled facial feature ordering (non-face object)"

    # 3. Eye to mouth vertical proportion
    eye_to_mouth = mouth_y - eyes_y
    if eye_to_mouth < 0.20 * h or eye_to_mouth > 0.85 * h:
        return False, "Unnatural eye-to-mouth vertical distance (non-face pattern)"

    # 4. Nose horizontal centering
    if not (left_eye[0] - 0.12 * w <= nose[0] <= right_eye[0] + 0.12 * w):
        return False, "Nose outside eye boundary (distorted object)"

    # 5. Mouth width
    mouth_dx = right_mouth[0] - left_mouth[0]
    if mouth_dx < 0.10 * w:
        return False, "Invalid mouth geometry (non-face object)"

    return True, "Valid human facial geometry"


def verify_skin_presence(crop_bgr: np.ndarray, min_ratio: float = 0.30) -> Tuple[bool, float]:
    """
    Checks that the central region of the face crop contains natural human skin tones.
    Non-face objects (backpacks, furniture, drawings, dark clothing) lack human skin chrominance.
    """
    h, w = crop_bgr.shape[:2]
    if h < 20 or w < 20:
        return False, 0.0

    # Sample central 60% of the face (cheeks, nose, forehead)
    cy1, cy2 = int(h * 0.2), int(h * 0.8)
    cx1, cx2 = int(w * 0.2), int(w * 0.8)
    center = crop_bgr[cy1:cy2, cx1:cx2]

    # Convert to YCrCb color space
    ycrcb = cv2.cvtColor(center, cv2.COLOR_BGR2YCrCb)
    cr = ycrcb[:, :, 1]
    cb = ycrcb[:, :, 2]

    # Standard human skin chrominance range across diverse ethnicities
    # Cr: 130 to 178, Cb: 75 to 138
    skin_mask = (cr >= 130) & (cr <= 178) & (cb >= 75) & (cb <= 138)
    skin_ratio = float(np.mean(skin_mask))

    return skin_ratio >= min_ratio, skin_ratio


def detect_phone_quadrilateral(surround_bgr: np.ndarray, face_w: int, face_h: int) -> Tuple[bool, List[str]]:
    """
    Finds rectangular/quadrilateral contours around the face that match a phone screen chassis.
    A smartphone screen or bezel has 4 corners and aspect ratio typically between 1.25 and 2.4.
    """
    gray = cv2.cvtColor(surround_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 40, 120)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(dilated, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    face_area = face_w * face_h
    found_quad = False
    details = []

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 0.4 * face_area or area > 6.0 * face_area:
            continue

        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.04 * peri, True)

        if len(approx) == 4:
            x, y, w, h = cv2.boundingRect(approx)
            aspect = max(w, h) / float(min(w, h) + 1e-6)
            if 1.25 <= aspect <= 2.4:
                found_quad = True
                details.append(f"Phone screen rectangle detected (aspect: {aspect:.2f})")
                break

    return found_quad, details


def detect_screen_or_spoof(
    full_frame: np.ndarray,
    box: List[int],
    crop_bgr: np.ndarray
) -> Tuple[bool, float, str]:
    """
    Detects presentation attacks where a photo or video of a student is shown on a smartphone/tablet:
      1. Phone Screen Quadrilateral / Chassis Contour Detection
      2. Phone Bezel / Screen Edge Detection (straight lines enclosing the face box)
      3. Glass Glare / Planar Specular Reflections
      4. Display Moiré / High-Frequency Subpixel Grid Artifacts (FFT)
      5. Flat 2D Dynamic Range & Color Gamut Flatness

    Returns: (is_live: bool, spoof_score: float, reason: str)
    """
    fh, fw = full_frame.shape[:2]
    x1, y1, x2, y2 = box
    bw = max(1, x2 - x1)
    bh = max(1, y2 - y1)

    spoof_signals = []
    spoof_score = 0.0

    # -------------------------------------------------------------
    # 1. Phone Quadrilateral Chassis / Screen Border Detection
    # -------------------------------------------------------------
    pad_x = int(bw * 0.45)
    pad_y = int(bh * 0.45)
    ex1, ey1 = max(0, x1 - pad_x), max(0, y1 - pad_y)
    ex2, ey2 = min(fw, x2 + pad_x), min(fh, y2 + pad_y)
    surround = full_frame[ey1:ey2, ex1:ex2]

    if surround.shape[0] > 40 and surround.shape[1] > 40:
        found_rect, rect_details = detect_phone_quadrilateral(surround, bw, bh)
        if found_rect:
            spoof_score += 0.65
            spoof_signals.extend(rect_details)

        # ---------------------------------------------------------
        # 2. Straight Bezel Lines Detection (Hough Transform)
        # ---------------------------------------------------------
        gray_surround = cv2.cvtColor(surround, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray_surround, (3, 3), 0)
        edges = cv2.Canny(blurred, 45, 130)

        min_line_len = int(min(bw, bh) * 0.32)
        lines = cv2.HoughLinesP(
            edges, 1, np.pi / 180,
            threshold=28,
            minLineLength=min_line_len,
            maxLineGap=12
        )

        if lines is not None:
            horiz_count = 0
            vert_count = 0
            for line in lines:
                lx1, ly1, lx2, ly2 = [int(v) for v in line.flatten()[:4]]
                dx = abs(lx2 - lx1)
                dy = abs(ly2 - ly1)
                if dx > min_line_len and dy <= 0.22 * dx:
                    horiz_count += 1
                elif dy > min_line_len and dx <= 0.22 * dy:
                    vert_count += 1

            if (horiz_count >= 1 and vert_count >= 1) or (horiz_count >= 2) or (vert_count >= 2):
                spoof_score += 0.55
                spoof_signals.append(f"Phone screen bezel edges (H:{horiz_count}, V:{vert_count})")

    # -------------------------------------------------------------
    # 3. Glass Glare / Specular Reflections from Phone Screen
    # -------------------------------------------------------------
    hsv = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2HSV)
    v_channel = hsv[:, :, 2]
    s_channel = hsv[:, :, 1]

    # Glass specular glare: pure blown-out brightness (V > 242) with low saturation (S < 45)
    glare_mask = (v_channel >= 242) & (s_channel < 45)
    glare_ratio = float(np.mean(glare_mask))

    if glare_ratio > 0.025:
        spoof_score += 0.35
        spoof_signals.append(f"Screen glass reflection glare ({glare_ratio * 100:.1f}%)")

    # -------------------------------------------------------------
    # 4. Moiré / High Frequency Subpixel Display Grid (2D FFT)
    # -------------------------------------------------------------
    gray_crop = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
    if gray_crop.shape[0] >= 32 and gray_crop.shape[1] >= 32:
        crop_128 = cv2.resize(gray_crop, (128, 128)).astype(np.float32)
        f = np.fft.fft2(crop_128)
        fshift = np.fft.fftshift(f)
        mag = np.log(np.abs(fshift) + 1.0)

        cy, cx = 64, 64
        y, x = np.ogrid[:128, :128]
        dist = np.sqrt((x - cx)**2 + (y - cy)**2)

        hf_band = (dist > 42) & (dist <= 62)
        lf_band = dist <= 20

        hf_val = np.mean(mag[hf_band])
        lf_val = np.mean(mag[lf_band]) + 1e-6
        hf_ratio = hf_val / lf_val

        if hf_ratio > 0.55:
            spoof_score += 0.30
            spoof_signals.append(f"Display subpixel moiré pattern ({hf_ratio:.2f})")

    # -------------------------------------------------------------
    # 5. Color Gamut Flatness & Dynamic Range
    # -------------------------------------------------------------
    std_b = np.std(crop_bgr[:, :, 0])
    std_g = np.std(crop_bgr[:, :, 1])
    std_r = np.std(crop_bgr[:, :, 2])
    avg_std = (std_b + std_g + std_r) / 3.0

    if avg_std < 11.5:
        spoof_score += 0.25
        spoof_signals.append(f"Unnatural flat 2D color distribution (std: {avg_std:.1f})")

    is_live = spoof_score < 0.45
    reason = "; ".join(spoof_signals) if spoof_signals else "Live physical human face"

    return is_live, round(spoof_score, 3), reason


def evaluate_face_authenticity(
    full_frame: np.ndarray,
    box: List[int],
    crop_bgr: np.ndarray,
    landmarks: Optional[List[List[float]]] = None,
    detection_score: float = 1.0
) -> Tuple[bool, str, str]:
    """
    Comprehensive authenticity & anti-spoof evaluation:
      - Filters out non-face objects (logos, bags, furniture, shadows, wall art)
      - Detects phone/screen presentation attacks
    Returns: (is_valid: bool, status_tag: str, detail_message: str)
      status_tag: 'OK' | 'SPOOF_DETECTED' | 'NON_FACE_OBJECT' | 'LOW_QUALITY'
    """
    # 1. Detection confidence check (MTCNN score)
    if detection_score < 0.88:
        return False, "NON_FACE_OBJECT", f"Low detection confidence ({detection_score:.2f}) - likely non-face object"

    # 2. Aspect ratio check (w:h)
    x1, y1, x2, y2 = box
    w = max(1, x2 - x1)
    h = max(1, y2 - y1)
    aspect_ratio = h / float(w)

    if aspect_ratio < 0.92 or aspect_ratio > 1.70:
        return False, "NON_FACE_OBJECT", f"Unnatural aspect ratio ({aspect_ratio:.2f}) - non-face object"

    # 3. Minimum dimensions
    if w < 55 or h < 55:
        return False, "LOW_QUALITY", f"Face box too small ({w}x{h}px) - minimum 55px required"

    # 4. Facial landmarks anatomical geometry
    if landmarks:
        is_geo_ok, geo_msg = verify_face_landmarks(landmarks, box)
        if not is_geo_ok:
            return False, "NON_FACE_OBJECT", geo_msg

    # 5. Human skin presence check
    has_skin, skin_pct = verify_skin_presence(crop_bgr, min_ratio=0.28)
    if not has_skin:
        return False, "NON_FACE_OBJECT", f"Insufficient skin chrominance ({skin_pct * 100:.1f}%) - non-face object"

    # 6. Screen / Phone presentation attack detection
    is_live, spoof_score, spoof_reason = detect_screen_or_spoof(full_frame, box, crop_bgr)
    if not is_live:
        return False, "SPOOF_DETECTED", f"Screen/Phone spoof detected (score: {spoof_score}): {spoof_reason}"

    return True, "OK", "Live human face verified"
