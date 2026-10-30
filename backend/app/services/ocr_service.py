import os
import re
import shutil
from datetime import datetime
from typing import Dict, Any, Optional, List
from PIL import Image

# Common Windows Tesseract install locations
TESSERACT_CMD_CANDIDATES = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    r"C:\Users\ASUS\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"
]

def get_tesseract_path() -> Optional[str]:
    """Find tesseract binary if installed on Windows or in PATH."""
    which_path = shutil.which("tesseract")
    if which_path:
        return which_path
    for path in TESSERACT_CMD_CANDIDATES:
        if os.path.exists(path):
            return path
    return None

def parse_date_to_iso(d_str: str) -> Optional[str]:
    """Parse various informal date strings into ISO format YYYY-MM-DD."""
    if not d_str:
        return None
    d_str = d_str.strip(" ,.")
    # Remove ordinal suffixes: 1st, 2nd, 3rd, 4th
    clean_d = re.sub(r'(\d+)(st|nd|rd|th)', r'\1', d_str, flags=re.IGNORECASE)
    formats = [
        "%d-%m-%Y", "%d/%m/%Y", "%d.%m.%Y",
        "%d-%m-%y", "%d/%m/%y", "%d.%m.%y",
        "%Y-%m-%d", "%Y/%m/%d",
        "%d %b %Y", "%d %B %Y", "%b %d, %Y", "%B %d, %Y",
        "%d %b %y", "%d %B %y"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(clean_d, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None

def extract_leave_metadata(raw_text: str, known_subjects: Optional[List[Any]] = None) -> Dict[str, Any]:
    """
    Parse OCR raw text to extract key leave letter attributes:
    - Duration Type: Half Day vs Full Day
    - Half Day Session: Forenoon (FN) vs Afternoon (AN) vs General
    - Subject detection: Match against known courses or extract course mention
    - Dates: ISO start_date and end_date
    - Reasons: Medical, Sickness, Personal reasons, Casual Leave
    - Student info: Register Number, Name
    """
    cleaned = raw_text.replace("\r", "").strip()
    if not cleaned or cleaned.startswith("[OCR Notice:"):
        return {
            "detected_dates": None,
            "detected_reason": None,
            "detected_student_info": None,
            "confidence": 0.0,
            "start_date": None,
            "end_date": None,
            "detected_day_type": "FULL_DAY",
            "detected_half_day_session": None,
            "detected_subject_id": None,
            "detected_subject_name": None,
            "detected_subject_code": None,
            "detected_scope_note": "No readable text detected"
        }

    lines = [line.strip() for line in cleaned.split("\n") if line.strip()]

    # 1. Date extraction regex
    date_patterns = [
        r'\b\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}\b',
        r'\b\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{2,4}\b',
        r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?[\s,]+\d{2,4}\b'
    ]
    detected_dates = []
    for pat in date_patterns:
        for match in re.findall(pat, cleaned, re.IGNORECASE):
            if match not in detected_dates:
                detected_dates.append(match)
    detected_dates_str = ", ".join(detected_dates) if detected_dates else None

    # Derive ISO start_date and end_date
    start_date = None
    end_date = None
    m_range = re.search(r'(?:from|between)\s+(\d{1,2}[-/\.\s\w]+?)\s+(?:to|till|until|-)\s+(\d{1,2}[-/\.\w]+)', cleaned, re.IGNORECASE)
    if m_range:
        d1 = parse_date_to_iso(m_range.group(1))
        d2 = parse_date_to_iso(m_range.group(2))
        if d1 and d2:
            start_date, end_date = d1, d2
        elif d1:
            start_date = d1

    if not start_date and detected_dates:
        iso_dates = [parse_date_to_iso(d) for d in detected_dates if parse_date_to_iso(d)]
        if len(iso_dates) == 1:
            start_date = iso_dates[0]
            end_date = iso_dates[0]
        elif len(iso_dates) >= 2:
            start_date = iso_dates[-2]
            end_date = iso_dates[-1]

    # 2. Reason extraction heuristics
    detected_reason = None

    # Priority A: Look for explicit cause phrase ("due to ...", "suffering from ...", "reason: ...")
    m_cause = re.search(r'(?:due to|suffering from|reason\s*[:\-]?)\s+([^\.\n,;]+)', cleaned, re.IGNORECASE)
    if m_cause:
        cause_phrase = m_cause.group(0).strip(' -:,')
        if len(cause_phrase) > 5:
            detected_reason = cause_phrase

    # Priority B: Look for Subject line in document
    if not detected_reason:
        for line in lines:
            m_sub = re.match(r'^(?:Subject|Sub)\s*[:\-]?\s*(.+)$', line, re.IGNORECASE)
            if m_sub:
                sub_text = m_sub.group(1).strip()
                sub_text = re.split(r'\b(?:Sir|Respected|Madam|Dear)\b', sub_text, flags=re.IGNORECASE)[0].strip(' -:,')
                if len(sub_text) > 4:
                    detected_reason = sub_text
                    break

    # Priority C: Scan for medical or personal keyword indicators
    if not detected_reason:
        keywords = [
            "severe fever", "high fever", "viral fever", "fever",
            "medical leave", "casual leave", "sick leave", "medical emergency",
            "hospitalized", "hospitalisation", "food poisoning", "covid", "typhoid", "dengue",
            "fracture", "accident", "surgery", "injury", "unwell", "illness",
            "personal reasons", "personal reason", "personal emergency",
            "family function", "sister's marriage", "brother's marriage", "marriage", "wedding"
        ]
        for kw in keywords:
            if kw in cleaned.lower():
                for line in lines:
                    if kw in line.lower():
                        detected_reason = line.strip()
                        break
                if not detected_reason:
                    detected_reason = kw.title()
                break

    # 3. Student register number and name heuristics
    m_roll = re.search(r'\b(?:Roll\s*(?:No|Number)?|Reg(?:ister)?\s*(?:No|Number)?|USN|Student\s*ID)\s*[:\-]?\s*([A-Za-z0-9\-]+)', cleaned, re.IGNORECASE)
    detected_roll = m_roll.group(0).strip() if m_roll else None

    detected_name = None
    for i, line in enumerate(lines):
        m_from = re.match(r'^(?:From|Yours\s+faithfully|Yours\s+sincerely|Yours\s+truly)\s*[,:\-]?$', line, re.IGNORECASE)
        if m_from and i + 1 < len(lines):
            next_line = lines[i + 1].strip(' ,-')
            if next_line and not any(kw in next_line.lower() for kw in ['the ', 'mca', 'department', 'semester', 'class', 'roll', 'reg']):
                detected_name = next_line
                break

    detected_student = None
    if detected_name and detected_roll:
        detected_student = f"{detected_name} ({detected_roll})"
    elif detected_name:
        detected_student = detected_name
    elif detected_roll:
        detected_student = detected_roll

    # 4. Half Day vs Full Day Detection
    # Look for half-day keywords, forenoon/afternoon session markers
    half_day_patterns = [
        r'\bhalf[\s\-]*(?:a[\s\-]*)?day\b',
        r'\bhalfday\b',
        r'\b(?:first|1st|second|2nd)\s+half\b',
        r'\bfore[\s\-]*noon\b',
        r'\bafter[\s\-]*noon\b',
        r'\bmorning\s+(?:session|classes|class|half)\b',
        r'\bafternoon\s+(?:session|classes|class|half)\b',
        r'\b(?:single|one|1)\s+(?:period|class|session|hour|subject)\b',
        r'\bpart\s+of\s+the\s+day\b',
        r'\bfor\s+(?:the\s+)?fn\b',
        r'\bfor\s+(?:the\s+)?an\b',
        r'\bfn\s+(?:session|class|period)\b',
        r'\ban\s+(?:session|class|period)\b'
    ]

    is_half_day = any(re.search(pat, cleaned, re.IGNORECASE) for pat in half_day_patterns)

    detected_day_type = "HALF_DAY" if is_half_day else "FULL_DAY"
    detected_half_day_session = None

    if is_half_day:
        if re.search(r'\b(?:fore[\s\-]*noon|morning|first\s+half|1st\s+half|\bfn\b)', cleaned, re.IGNORECASE):
            detected_half_day_session = "FORENOON"
        elif re.search(r'\b(?:after[\s\-]*noon|second\s+half|2nd\s+half|\ban\b)', cleaned, re.IGNORECASE):
            detected_half_day_session = "AFTERNOON"
        else:
            detected_half_day_session = "GENERAL_HALF_DAY"
    else:
        detected_day_type = "FULL_DAY"

    # 5. Applicable Subject Detection
    detected_subject_id = None
    detected_subject_name = None
    detected_subject_code = None

    if known_subjects:
        for sub in known_subjects:
            sub_id = sub.get("id") if isinstance(sub, dict) else getattr(sub, "id", None)
            sub_name = sub.get("name", "") if isinstance(sub, dict) else getattr(sub, "name", "")
            sub_code = sub.get("code", "") if isinstance(sub, dict) else getattr(sub, "code", "")

            # A: Match exact subject code (e.g. MCA301, MCA302)
            if sub_code and re.search(rf'\b{re.escape(sub_code)}\b', cleaned, re.IGNORECASE):
                detected_subject_id = sub_id
                detected_subject_name = sub_name
                detected_subject_code = sub_code
                break

            # B: Match subject full name (e.g. Machine Learning)
            if sub_name and len(sub_name) >= 4 and re.search(rf'\b{re.escape(sub_name)}\b', cleaned, re.IGNORECASE):
                detected_subject_id = sub_id
                detected_subject_name = sub_name
                detected_subject_code = sub_code
                break

            # C: Match distinctive phrases (e.g. "Cloud Computing", "DevOps", "Data Structures")
            distinctive_parts = [p.strip() for p in re.split(r'[&,]+', sub_name) if len(p.strip()) >= 5]
            for part in distinctive_parts:
                if re.search(rf'\b{re.escape(part)}\b', cleaned, re.IGNORECASE):
                    detected_subject_id = sub_id
                    detected_subject_name = sub_name
                    detected_subject_code = sub_code
                    break
            if detected_subject_id:
                break

    # If no known subject matched, try general regex extraction for course mention
    if not detected_subject_name:
        m_subj = re.search(
            r'\b(?:for|regarding|in|attend)\s+(?:the\s+)?([A-Za-z0-9\s&]{3,35}?)\s+(?:class|lecture|subject|course|session|period|lab)\b',
            cleaned,
            re.IGNORECASE
        )
        if m_subj:
            extracted_sub = m_subj.group(1).strip()
            ignored = ['my', 'today', 'tomorrow', 'morning', 'afternoon', 'forenoon', 'fn', 'an', 'half day', 'leave', 'first half', 'second half']
            if not any(ign == extracted_sub.lower() or extracted_sub.lower().startswith(ign) for ign in ignored):
                detected_subject_name = extracted_sub

    # If a specific subject is detected in text, but day_type wasn't explicitly flagged,
    # and date is a single day with single class mention, it indicates a subject-specific leave
    if not is_half_day and detected_subject_name and start_date and end_date and start_date == end_date:
        if re.search(r'\b(?:class|lecture|period|session|hour)\b', cleaned, re.IGNORECASE):
            detected_day_type = "HALF_DAY"
            detected_half_day_session = "GENERAL_HALF_DAY"

    # Human-readable scope note
    if detected_day_type == "HALF_DAY":
        session_lbl = (
            "Forenoon" if detected_half_day_session == "FORENOON"
            else "Afternoon" if detected_half_day_session == "AFTERNOON"
            else "Half Day"
        )
        if detected_subject_name:
            detected_scope_note = f"Half Day ({session_lbl}) detected -> Pre-selected: {detected_subject_name}"
        else:
            detected_scope_note = f"Half Day ({session_lbl}) detected -> Please select applicable subject"
    else:
        detected_scope_note = "Full Day leave detected -> Applies to All Subjects"

    # 6. Confidence scoring
    if len(cleaned) < 10:
        confidence = 0.0
    elif detected_dates_str and detected_reason:
        confidence = 0.95
    elif detected_dates_str or detected_reason:
        confidence = 0.85
    else:
        confidence = 0.70

    return {
        "detected_dates": detected_dates_str,
        "detected_reason": detected_reason,
        "detected_student_info": detected_student,
        "confidence": confidence,
        "start_date": start_date,
        "end_date": end_date,
        "detected_day_type": detected_day_type,
        "detected_half_day_session": detected_half_day_session,
        "detected_subject_id": detected_subject_id,
        "detected_subject_name": detected_subject_name,
        "detected_subject_code": detected_subject_code,
        "detected_scope_note": detected_scope_note
    }

def _ocr_pil_image(img: Image.Image) -> str:
    """Run OCR on a PIL image using available Windows Media OCR or Tesseract."""
    # 1. First attempt: Windows native Media.Ocr engine executed in a dedicated worker thread
    try:
        import winocr
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(winocr.recognize_pil_sync, img)
            res = future.result(timeout=15)
            lines = [l["text"] for l in res.get("lines", []) if l.get("text")]
            if lines:
                return "\n".join(lines).strip()
            text = res.get("text", "").strip()
            if text:
                return text
    except Exception as exc:
        print(f"[OCR] winocr recognition notice: {exc}")

    # 2. Second attempt: Tesseract if installed
    tess_path = get_tesseract_path()
    if tess_path:
        try:
            import pytesseract
            pytesseract.pytesseract.tesseract_cmd = tess_path
            return pytesseract.image_to_string(img).strip()
        except Exception as exc:
            print(f"[OCR] pytesseract notice: {exc}")

    return ""

def process_document_ocr(file_path: str, known_subjects: Optional[List[Any]] = None) -> Dict[str, Any]:
    """
    Execute OCR on an uploaded leave image/document.
    Supports images (PNG, JPG, WEBP) and PDF files.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Document not found at {file_path}")

    raw_text = ""

    # Case A: PDF Document
    if file_path.lower().endswith(".pdf"):
        try:
            import pypdf
            reader = pypdf.PdfReader(file_path)
            extracted_pages = []
            for page in reader.pages:
                text = page.extract_text() or ""
                if text.strip():
                    extracted_pages.append(text.strip())

            # If digital text exists in the PDF, use it directly
            if extracted_pages:
                raw_text = "\n\n".join(extracted_pages).strip()
            else:
                # Scanned image-based PDF: extract images and OCR them
                for page in reader.pages:
                    for img_obj in getattr(page, "images", []):
                        try:
                            pil_img = img_obj.image
                            ocr_piece = _ocr_pil_image(pil_img)
                            if ocr_piece:
                                extracted_pages.append(ocr_piece)
                        except Exception:
                            continue
                raw_text = "\n\n".join(extracted_pages).strip()
        except Exception as exc:
            print(f"[OCR] PDF processing exception: {exc}")

    # Case B: Standard Image Document (PNG, JPG, WEBP, etc.)
    if not raw_text:
        try:
            img = Image.open(file_path)
            raw_text = _ocr_pil_image(img)
        except Exception as exc:
            print(f"[OCR] Image open exception: {exc}")

    # If no text was recognized by any engine
    if not raw_text.strip():
        raw_text = "[OCR Notice: No readable text detected in this document. Please ensure the uploaded file is clearly legible.]"

    metadata = extract_leave_metadata(raw_text, known_subjects=known_subjects)
    return {
        "raw_text": raw_text.strip(),
        "detected_dates": metadata["detected_dates"],
        "detected_reason": metadata["detected_reason"],
        "detected_student_info": metadata["detected_student_info"],
        "confidence": metadata["confidence"],
        "start_date": metadata.get("start_date"),
        "end_date": metadata.get("end_date"),
        "detected_day_type": metadata.get("detected_day_type", "FULL_DAY"),
        "detected_half_day_session": metadata.get("detected_half_day_session"),
        "detected_subject_id": metadata.get("detected_subject_id"),
        "detected_subject_name": metadata.get("detected_subject_name"),
        "detected_subject_code": metadata.get("detected_subject_code"),
        "detected_scope_note": metadata.get("detected_scope_note")
    }
