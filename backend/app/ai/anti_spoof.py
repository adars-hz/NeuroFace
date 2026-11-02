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

    # Head tilt / vertical asymmetry check (allows natural tilt up to ~33 degrees)
    if eye_dy / (eye_dx + 1e-6) > 0.65:
        return False, "Excessive landmark vertical distortion (non-face object)"

    # 2. Vertical anatomy ordering: eyes must be above nose, and nose must be above mouth
    eyes_y = (left_eye[1] + right_eye[1]) / 2.0
    mouth_y = (left_mouth[1] + right_mouth[1]) / 2.0

    if not (eyes_y < nose[1] < mouth_y):
        return False, "Scrambled facial feature ordering (non-face object)"

    # 3. Eye to mouth vertical proportion
    eye_to_mouth = mouth_y - eyes_y
    if eye_to_mouth < 0.18 * h or eye_to_mouth > 0.85 * h:
        return False, "Unnatural eye-to-mouth vertical distance (non-face pattern)"

    # 4. Nose horizontal centering
    if not (left_eye[0] - 0.15 * w <= nose[0] <= right_eye[0] + 0.15 * w):
        return False, "Nose outside eye boundary (distorted object)"

    # 5. Mouth width
    mouth_dx = right_mouth[0] - left_mouth[0]
    if mouth_dx < 0.08 * w:
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
    Finds rectangular/quadrilateral contours around the face that match a phone screen chassis.
    A smartphone screen or bezel:
      - Has 4 perpendicular corners (near 90 degrees)
      - Is strictly convex
      - Has aspect ratio between 1.28 and 2.35 (phone 16:9, 19.5:9, 20:9 or tablet 4:3)
      - Encloses the detected face center
      - Has high fill factor (> 72%)
    """
    fx1, fy1, fx2, fy2 = face_box_in_surround
    fcx, fcy = (fx1 + fx2) // 2, (fy1 + fy2) // 2
    face_area = face_w * face_h

    gray = cv2.cvtColor(surround_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 45, 130)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(dilated, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    found_quad = False
    details = []

    for cnt in contours:
        area = cv2.contourArea(cnt)
        # Phone chassis holding face must enclose face area with reasonable margin
        if area < 1.15 * face_area or area > 6.0 * face_area:
            continue

        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.025 * peri, True)

        if len(approx) != 4 or not cv2.isContourConvex(approx):
            continue

        # Check perpendicular corner angles
        pts = approx.reshape(4, 2)
        angles_ok = True
        for i in range(4):
            v1 = pts[(i - 1) % 4] - pts[i]
            v2 = pts[(i + 1) % 4] - pts[i]
            cos_ang = abs(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6))
            if cos_ang > 0.32:  # Angle outside 71° to 109° range
                angles_ok = False
                break
        if not angles_ok:
            continue

        rx, ry, rw, rh = cv2.boundingRect(approx)
        fill_ratio = area / float(rw * rh + 1e-6)
        if fill_ratio < 0.72:
            continue

        aspect = max(rw, rh) / float(min(rw, rh) + 1e-6)
        if not (1.28 <= aspect <= 2.35):
            continue

        # Crucial: the quadrilateral must enclose the center of the detected face!
        if not (rx <= fcx <= rx + rw and ry <= fcy <= ry + rh):
            continue

        found_quad = True
        details.append(f"Phone screen rectangular chassis (aspect: {aspect:.2f})")
        break

    return found_quad, details


def detect_bezel_lines(
    surround_bgr: np.ndarray,
    face_box_in_surround: Tuple[int, int, int, int],
    face_w: int,
    face_h: int
) -> Tuple[bool, int, int, List[str]]:
    """
    Detects straight lines enclosing the face on both axes (orthogonal framing).
    A phone screen bezel or photo print border frames the face horizontally (top/bottom)
    AND vertically (left/right).
    Ordinary room features (doors, walls, collars) only exhibit lines on one axis.
    """
    fx1, fy1, fx2, fy2 = face_box_in_surround
    gray = cv2.cvtColor(surround_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 45, 130)

    min_line_len = int(min(face_w, face_h) * 0.40)
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
            if mid_y < fy1 + 0.25 * face_h:
                top_h += 1
            elif mid_y > fy2 - 0.25 * face_h:
                bot_h += 1
        elif dy > min_line_len and dx <= 0.20 * dy:
            mid_x = (lx1 + lx2) / 2.0
            if mid_x < fx1 + 0.25 * face_w:
                left_v += 1
            elif mid_x > fx2 - 0.25 * face_w:
                right_v += 1

    tot_h = top_h + bot_h
    tot_v = left_v + right_v

    # Must enclose the face in both horizontal and vertical dimensions (screen or photo edges)
    has_framing_lines = (tot_h >= 1 and tot_v >= 1)
    details = []
    if has_framing_lines:
        details.append(f"Phone screen / photo border edges (H:{tot_h}, V:{tot_v})")

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

    Requires multiple correlated signals (score >= 0.50) to reject.
    Real human faces in typical rooms (doors, collars, light highlights) will not trigger rejection.
    Returns: (is_live: bool, spoof_score: float, reason: str)
    """
    fh, fw = full_frame.shape[:2]
    x1, y1, x2, y2 = box
    bw = max(1, x2 - x1)
    bh = max(1, y2 - y1)

    spoof_signals = []
    spoof_score = 0.0

    # Surround region around the face to inspect phone chassis/bezel/photo edges
    pad_x = int(bw * 0.65)
    pad_y = int(bh * 0.65)
    ex1, ey1 = max(0, x1 - pad_x), max(0, y1 - pad_y)
    ex2, ey2 = min(fw, x2 + pad_x), min(fh, y2 + pad_y)
    surround = full_frame[ey1:ey2, ex1:ex2]

    # Face box in surround coordinates
    fx1, fy1 = x1 - ex1, y1 - ey1
    fx2, fy2 = x2 - ex1, y2 - ey1
    face_box_in_surround = (fx1, fy1, fx2, fy2)

    if surround.shape[0] > 40 and surround.shape[1] > 40:
        # -------------------------------------------------------------
        # 1. Phone Quadrilateral Chassis / Screen Border Detection
        # -------------------------------------------------------------
        found_rect, rect_details = detect_phone_quadrilateral(
            surround, face_box_in_surround, bw, bh
        )
        if found_rect:
            spoof_score += 0.40
            spoof_signals.extend(rect_details)

        # -------------------------------------------------------------
        # 2. Straight Border / Bezel Lines Detection (Hough Transform)
        # -------------------------------------------------------------
        has_bezel, _, _, bezel_details = detect_bezel_lines(
            surround, face_box_in_surround, bw, bh
        )
        if has_bezel:
            spoof_score += 0.35
            spoof_signals.extend(bezel_details)

    # -------------------------------------------------------------
    # 3. Moiré / High Frequency Subpixel Display Grid (2D FFT Power Spectrum)
    # -------------------------------------------------------------
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

        # Display screens show sharp subpixel periodicity with PSD ratio typically > 2.2
        # Natural human faces with camera noise remain well below 1.2
        if psd_ratio > 2.2:
            spoof_score += 0.30
            spoof_signals.append(f"Display subpixel moiré pattern (ratio: {psd_ratio:.1f})")

    # -------------------------------------------------------------
    # 4. Glass Glare / Specular Reflections from Screen / Glossy Photo
    # -------------------------------------------------------------
    hsv = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2HSV)
    v_channel = hsv[:, :, 2]
    s_channel = hsv[:, :, 1]

    # Glass/glossy reflection: high brightness (V >= 248) with low saturation (S < 30)
    glare_mask = (v_channel >= 248) & (s_channel < 30)
    glare_ratio = float(np.mean(glare_mask))

    if glare_ratio > 0.04:
        spoof_score += 0.25
        spoof_signals.append(f"Screen / photo specular glare ({glare_ratio * 100:.1f}%)")

    # -------------------------------------------------------------
    # 5. Color Gamut Flatness & Dynamic Range
    # -------------------------------------------------------------
    std_b = np.std(crop_bgr[:, :, 0])
    std_g = np.std(crop_bgr[:, :, 1])
    std_r = np.std(crop_bgr[:, :, 2])
    avg_std = (std_b + std_g + std_r) / 3.0

    ycrcb = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2YCrCb)
    cr_std = np.std(ycrcb[:, :, 1])
    cb_std = np.std(ycrcb[:, :, 2])

    if (cr_std < 1.7 and cb_std < 1.7) or avg_std < 10.0:
        spoof_score += 0.25
        spoof_signals.append(f"Flat 2D color / compressed chrominance (std: {avg_std:.1f})")

    # Rejection requires at least 2 correlated signals (score >= 0.50)
    is_live = spoof_score < 0.50
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
      - Blocks close-up presentation attack evasion attempts (face filling >58% of camera)
      - Detects phone/screen/photo presentation attacks
    Returns: (is_valid: bool, status_tag: str, detail_message: str)
      status_tag: 'OK' | 'SPOOF_DETECTED' | 'NON_FACE_OBJECT' | 'LOW_QUALITY'
    """
    # 1. Detection confidence check (MTCNN score)
    if detection_score < 0.85:
        return False, "NON_FACE_OBJECT", f"Low detection confidence ({detection_score:.2f}) - likely non-face object"

    # 2. Aspect ratio check (w:h)
    x1, y1, x2, y2 = box
    w = max(1, x2 - x1)
    h = max(1, y2 - y1)
    aspect_ratio = h / float(w)

    if aspect_ratio < 0.90 or aspect_ratio > 1.75:
        return False, "NON_FACE_OBJECT", f"Unnatural aspect ratio ({aspect_ratio:.2f}) - non-face object"

    # 3. Minimum dimensions
    if w < 50 or h < 50:
        return False, "LOW_QUALITY", f"Face box too small ({w}x{h}px) - minimum 50px required"

    # 4. Proximity / Close-up Presentation Check
    # In classroom/desk attendance, a real student's face occupies 18% to 50% of the frame height.
    # When a phone or photo is shoved close to the camera lens to hide the phone bezel/edges,
    # the face occupies 60% to 90%+ of the frame height, or touches the frame boundaries.
    fh, fw = full_frame.shape[:2]
    h_ratio = h / float(fh)
    w_ratio = w / float(fw)

    if h_ratio > 0.58 or w_ratio > 0.52:
        return False, "SPOOF_DETECTED", f"Phone/Image presented too close (h:{h_ratio:.1%}, w:{w_ratio:.1%}) - please step back to normal distance"

    if (x1 < 10 or y1 < 10 or x2 > fw - 10 or y2 > fh - 10) and h_ratio > 0.48:
        return False, "SPOOF_DETECTED", "Phone/Image clipped at camera boundary - please maintain normal distance"

    # 5. Facial landmarks anatomical geometry
    if landmarks:
        is_geo_ok, geo_msg = verify_face_landmarks(landmarks, box)
        if not is_geo_ok:
            return False, "NON_FACE_OBJECT", geo_msg

    # 6. Human skin presence check
    has_skin, skin_pct = verify_skin_presence(crop_bgr, min_ratio=0.20)
    if not has_skin:
        return False, "NON_FACE_OBJECT", f"Insufficient skin chrominance ({skin_pct * 100:.1f}%) - non-face object"

    # 7. Screen / Phone / Photo presentation attack detection
    is_live, spoof_score, spoof_reason = detect_screen_or_spoof(full_frame, box, crop_bgr)
    if not is_live:
        return False, "SPOOF_DETECTED", f"Screen/Phone/Photo spoof detected (score: {spoof_score}): {spoof_reason}"

    return True, "OK", "Live human face verified"
