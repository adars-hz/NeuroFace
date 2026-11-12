import cv2
import numpy as np
from typing import Tuple, Optional, List


def verify_face_landmarks(landmarks: List[List[float]], box: List[int], is_registration: bool = False) -> Tuple[bool, str]:
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

    # Allow head turns in registration mode (yaw angles up to 25°)
    min_eye_sep = 0.07 * w if is_registration else 0.16 * w
    if eye_dx < min_eye_sep:
        return False, "Eyes are too close or reversed (non-face object)"

    # Head tilt / vertical asymmetry check (allows natural tilt up to ~33 degrees in classroom, up to 45 degrees in registration)
    max_tilt_ratio = 0.85 if is_registration else 0.65
    if eye_dy / (eye_dx + 1e-6) > max_tilt_ratio:
        return False, "Excessive landmark vertical distortion (non-face object)"

    # 2. Vertical anatomy ordering: eyes must be above nose, and nose must be above mouth
    eyes_y = (left_eye[1] + right_eye[1]) / 2.0
    mouth_y = (left_mouth[1] + right_mouth[1]) / 2.0

    if is_registration:
        # In tilt-up poses, nose can align closely with eyes
        if not (eyes_y - 8 <= nose[1] <= mouth_y + 8):
            return False, "Scrambled facial feature ordering (non-face object)"
    else:
        if not (eyes_y < nose[1] < mouth_y):
            return False, "Scrambled facial feature ordering (non-face object)"

    # 3. Eye to mouth vertical proportion
    eye_to_mouth = mouth_y - eyes_y
    min_em = 0.12 * h if is_registration else 0.18 * h
    if eye_to_mouth < min_em or eye_to_mouth > 0.88 * h:
        return False, "Unnatural eye-to-mouth vertical distance (non-face pattern)"

    # 4. Nose horizontal centering
    nose_margin = 0.28 * w if is_registration else 0.15 * w
    if not (left_eye[0] - nose_margin <= nose[0] <= right_eye[0] + nose_margin):
        return False, "Nose outside eye boundary (distorted object)"

    # 5. Mouth width
    mouth_dx = right_mouth[0] - left_mouth[0]
    min_mouth = 0.05 * w if is_registration else 0.08 * w
    if mouth_dx < min_mouth:
        return False, "Invalid mouth geometry (non-face object)"

    return True, "Valid human facial geometry"


def verify_skin_presence(crop_bgr: np.ndarray, min_ratio: float = 0.20) -> Tuple[bool, float]:
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

    # Broad human skin chrominance range across diverse ethnicities
    # Cr: 125 to 182, Cb: 72 to 140
    skin_mask = (cr >= 125) & (cr <= 182) & (cb >= 72) & (cb <= 140)
    skin_ratio = float(np.mean(skin_mask))

    return skin_ratio >= min_ratio, skin_ratio


def detect_phone_quadrilateral(
    surround_bgr: np.ndarray,
    face_box_in_surround: Tuple[int, int, int, int],
    face_w: int,
    face_h: int
) -> Tuple[bool, List[str]]:
    """
    Finds rectangular contours in the surround of the face that match a phone screen chassis.
    Must be framing the face (1.35x to 8.5x face area), centered on the face, and have smartphone aspect ratio.
    Works even if fingers hold the chassis or phone is tilted.
    """
    fx1, fy1, fx2, fy2 = face_box_in_surround
    fcx, fcy = (fx1 + fx2) // 2, (fy1 + fy2) // 2
    face_area = face_w * face_h

    gray = cv2.cvtColor(surround_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 40, 120)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(dilated, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    found_quad = False
    details = []

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 1.35 * face_area or area > 8.5 * face_area:
            continue

        rect = cv2.minAreaRect(cnt)
        (rcx, rcy), (rw, rh), angle = rect
        if rw == 0 or rh == 0:
            continue
        rect_w = min(rw, rh)
        rect_h = max(rw, rh)
        aspect = rect_h / float(rect_w + 1e-6)

        dist_c = np.hypot(rcx - fcx, rcy - fcy)
        solidity = area / float(rect_w * rect_h + 1e-6)

        # Phone portrait (1.30 to 2.65), landscape / tablet (0.38 to 0.75)
        is_phone_aspect = (1.30 <= aspect <= 2.65) or (0.38 <= 1.0 / aspect <= 0.75)
        is_centered = dist_c < 0.45 * max(face_w, face_h)
        is_solid = solidity > 0.60

        if is_phone_aspect and is_centered and is_solid:
            found_quad = True
            details.append(f"Phone screen chassis contour (aspect: {aspect:.2f}, solidity: {solidity:.2f})")
            break

    return found_quad, details


def detect_bezel_lines(
    surround_bgr: np.ndarray,
    face_box_in_surround: Tuple[int, int, int, int],
    face_w: int,
    face_h: int
) -> Tuple[bool, int, int, List[str]]:
    """
    Detects straight symmetric lines immediately framing the face box (tight screen bezel).
    Requires both left AND right vertical bezels flanking the face, plus top or bottom bezel.
    Distant background lines (walls, doors, whiteboards) on one side are ignored.
    """
    fx1, fy1, fx2, fy2 = face_box_in_surround
    gray = cv2.cvtColor(surround_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 40, 120)

    min_line_len = int(min(face_w, face_h) * 0.45)
    lines = cv2.HoughLinesP(
        edges, 1, np.pi / 180,
        threshold=40,
        minLineLength=min_line_len,
        maxLineGap=12
    )

    if lines is None:
        return False, 0, 0, []

    top_h, bot_h, left_v, right_v = 0, 0, 0, 0
    for line in lines:
        lx1, ly1, lx2, ly2 = [int(v) for v in line.flatten()[:4]]
        dx = abs(lx2 - lx1)
        dy = abs(ly2 - ly1)
        if dx > min_line_len and dy <= 0.20 * dx:
            mid_y = (ly1 + ly2) / 2.0
            mid_x = (lx1 + lx2) / 2.0
            if (fx1 - 0.40 * face_w) <= mid_x <= (fx2 + 0.40 * face_w):
                if (fy1 - 1.50 * face_h) <= mid_y <= (fy1 - 0.10 * face_h):
                    top_h += 1
                elif (fy2 + 0.10 * face_h) <= mid_y <= (fy2 + 1.50 * face_h):
                    bot_h += 1
        elif dy > min_line_len and dx <= 0.20 * dy:
            mid_y = (ly1 + ly2) / 2.0
            mid_x = (lx1 + lx2) / 2.0
            if (fy1 - 0.50 * face_h) <= mid_y <= (fy2 + 0.50 * face_h):
                if (fx1 - 0.90 * face_w) <= mid_x <= (fx1 - 0.05 * face_w):
                    left_v += 1
                elif (fx2 + 0.05 * face_w) <= mid_x <= (fx2 + 0.90 * face_w):
                    right_v += 1

    tot_h = top_h + bot_h
    tot_v = left_v + right_v

    # True bezel enclosure must flank BOTH cheeks (left and right), plus at least one horizontal border
    has_framing_lines = (left_v >= 1 and right_v >= 1) and (top_h >= 1 or bot_h >= 1)
    details = []
    if has_framing_lines:
        details.append(f"Symmetric screen bezels (L:{left_v}, R:{right_v}, H:{tot_h})")

    return has_framing_lines, tot_h, tot_v, details


def detect_screen_or_spoof(
    full_frame: np.ndarray,
    box: List[int],
    crop_bgr: np.ndarray
) -> Tuple[bool, float, str]:
    """
    Detects presentation attacks where a photo or video of a student is shown on a smartphone/tablet
    or printed on paper/cardboard:
      1. Phone Screen Quadrilateral / Chassis Contour Detection (enclosing face)
      2. Phone Screen / Photo Border Edge Enclosure (orthogonal H+V lines)
      3. Glass Glare / Specular Reflections from Screen / Glossy Photo
      4. Display Moiré / High-Frequency Subpixel Grid Artifacts (FFT Power Spectrum)
      5. Flat 2D Dynamic Range & Compressed Chrominance

    Requires multiple correlated signals (score >= 0.45) to reject.
    Real human faces in typical rooms (doors, collars, light highlights) will not trigger rejection.
    Returns: (is_live: bool, spoof_score: float, reason: str)
    """
    fh, fw = full_frame.shape[:2]
    x1, y1, x2, y2 = box
    bw = max(1, x2 - x1)
    bh = max(1, y2 - y1)

    spoof_signals = []
    spoof_score = 0.0

    pad_x = int(bw * 1.25)
    pad_y = int(bh * 1.65)
    ex1, ey1 = max(0, x1 - pad_x), max(0, y1 - pad_y)
    ex2, ey2 = min(fw, x2 + pad_x), min(fh, y2 + pad_y)
    surround = full_frame[ey1:ey2, ex1:ex2]

    fx1, fy1 = x1 - ex1, y1 - ey1
    fx2, fy2 = x2 - ex1, y2 - ey1
    face_box_in_surround = (fx1, fy1, fx2, fy2)

    if surround.shape[0] > 40 and surround.shape[1] > 40:
        found_rect, rect_details = detect_phone_quadrilateral(
            surround, face_box_in_surround, bw, bh
        )
        if found_rect:
            spoof_score += 0.45
            spoof_signals.extend(rect_details)

        has_bezel, _, _, bezel_details = detect_bezel_lines(
            surround, face_box_in_surround, bw, bh
        )
        if has_bezel:
            spoof_score += 0.40
            spoof_signals.extend(bezel_details)

    # 3. Moiré / High Frequency Subpixel Display Grid (2D FFT Power Spectrum)
    gray_crop = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
    if gray_crop.shape[0] >= 32 and gray_crop.shape[1] >= 32:
        crop_128 = cv2.resize(gray_crop, (128, 128)).astype(np.float32)
        f = np.fft.fft2(crop_128)
        fshift = np.fft.fftshift(f)
        power = np.abs(fshift) ** 2

        cy, cx = 64, 64
        y, x = np.ogrid[:128, :128]
        dist = np.sqrt((x - cx)**2 + (y - cy)**2)

        hf_band = (dist > 35) & (dist <= 62)
        lf_band = (dist >= 4) & (dist <= 25)

        hf_val = np.mean(power[hf_band])
        lf_val = np.mean(power[lf_band]) + 1e-6
        psd_ratio = hf_val / lf_val

        if psd_ratio > 2.0:
            spoof_score += 0.30
            spoof_signals.append(f"Display subpixel moiré pattern (ratio: {psd_ratio:.1f})")

    # 4. Glass Glare / Specular Reflections from Screen / Glossy Photo
    hsv = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2HSV)
    v_channel = hsv[:, :, 2]
    s_channel = hsv[:, :, 1]
    glare_mask = (v_channel >= 250) & (s_channel < 25)
    glare_ratio = float(np.mean(glare_mask))

    if glare_ratio > 0.035:
        spoof_score += 0.30
        spoof_signals.append(f"Screen / photo specular glare ({glare_ratio * 100:.1f}%)")

    # 5. Color Gamut Flatness & Dynamic Range
    ycrcb = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2YCrCb)
    cr_std = np.std(ycrcb[:, :, 1])
    cb_std = np.std(ycrcb[:, :, 2])

    if cr_std < 2.0 and cb_std < 2.0:
        spoof_score += 0.20
        spoof_signals.append(f"Flat 2D color / compressed chrominance (cr_std: {cr_std:.1f})")

    # Rejection requires at least 1 strong structural signal or multiple correlated signals (score >= 0.45)
    is_live = spoof_score < 0.45
    reason = "; ".join(spoof_signals) if spoof_signals else "Live physical human face"

    return is_live, round(spoof_score, 3), reason


def evaluate_face_authenticity(
    full_frame: np.ndarray,
    box: List[int],
    crop_bgr: np.ndarray,
    landmarks: Optional[List[List[float]]] = None,
    detection_score: float = 1.0,
    is_registration: bool = False
) -> Tuple[bool, str, str]:
    """
    Comprehensive authenticity & anti-spoof evaluation:
      - Filters out non-face objects (logos, bags, furniture, shadows, wall art)
      - Blocks close-up presentation attack evasion attempts (face filling >58% of camera in classroom)
      - Detects phone/screen/photo presentation attacks
      - In registration mode (is_registration=True): adapts proximity & pose geometry for guided 5-pose capture
    Returns: (is_valid: bool, status_tag: str, detail_message: str)
      status_tag: 'OK' | 'SPOOF_DETECTED' | 'NON_FACE_OBJECT' | 'LOW_QUALITY'
    """
    # 1. Detection confidence check (MTCNN score)
    min_confidence = 0.70 if is_registration else 0.85
    if detection_score < min_confidence:
        return False, "NON_FACE_OBJECT", f"Low detection confidence ({detection_score:.2f}) - likely non-face object"

    # 2. Aspect ratio check (w:h)
    x1, y1, x2, y2 = box
    w = max(1, x2 - x1)
    h = max(1, y2 - y1)
    aspect_ratio = h / float(w)

    min_ar = 0.82 if is_registration else 0.90
    max_ar = 1.85 if is_registration else 1.75
    if aspect_ratio < min_ar or aspect_ratio > max_ar:
        return False, "NON_FACE_OBJECT", f"Unnatural aspect ratio ({aspect_ratio:.2f}) - non-face object"

    # 3. Minimum dimensions
    if w < 45 or h < 45:
        return False, "LOW_QUALITY", f"Face box too small ({w}x{h}px) - minimum 45px required"

    # 4. Proximity / Close-up Presentation Check
    # In classroom attendance, a real student's face occupies 18% to 50% of the frame height.
    # When a phone or photo is shoved close to the camera lens to hide the phone bezel/edges,
    # the face occupies 60% to 90%+ of the frame height, or touches the frame boundaries.
    # In registration mode, students are guided into a close-up portrait inside the oval guide.
    fh, fw = full_frame.shape[:2]
    h_ratio = h / float(fh)
    w_ratio = w / float(fw)

    # Allow natural handheld mobile selfie distance (up to 82%) and registration framing (up to 88%)
    max_h = 0.88 if is_registration else 0.82
    max_w = 0.88 if is_registration else 0.82

    if h_ratio > max_h or w_ratio > max_w:
        return False, "LOW_QUALITY", f"Face too close to camera ({h_ratio:.1%}) - please hold phone at comfortable arm's length"

    if not is_registration and (x1 < 6 or y1 < 6 or x2 > fw - 6 or y2 > fh - 6) and h_ratio > 0.78:
        return False, "SPOOF_DETECTED", "Subject clipped at camera boundary - please center face"

    # 5. Facial landmarks anatomical geometry
    if landmarks:
        is_geo_ok, geo_msg = verify_face_landmarks(landmarks, box, is_registration=is_registration)
        if not is_geo_ok:
            return False, "NON_FACE_OBJECT", geo_msg

    # 6. Human skin presence check
    skin_threshold = 0.15 if is_registration else 0.20
    has_skin, skin_pct = verify_skin_presence(crop_bgr, min_ratio=skin_threshold)
    if not has_skin:
        return False, "NON_FACE_OBJECT", f"Insufficient skin chrominance ({skin_pct * 100:.1f}%) - non-face object"

    # 7. Screen / Phone / Photo presentation attack detection
    is_live, spoof_score, spoof_reason = detect_screen_or_spoof(full_frame, box, crop_bgr)
    if not is_live:
        return False, "SPOOF_DETECTED", f"Screen/Phone/Photo spoof detected (score: {spoof_score}): {spoof_reason}"

    return True, "OK", "Live human face verified"
