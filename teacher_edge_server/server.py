import os
import sys
import io
import json
import socket
import random
import base64
from datetime import datetime, timezone, date, timedelta
from typing import Dict, Any, Optional

# Link to backend models and AI packages with PyInstaller frozen bundle support
if getattr(sys, 'frozen', False):
    CURRENT_DIR = getattr(sys, '_MEIPASS', os.path.dirname(sys.executable))
    if CURRENT_DIR not in sys.path:
        sys.path.insert(0, CURRENT_DIR)
else:
    CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
    BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
    if BACKEND_DIR not in sys.path:
        sys.path.insert(0, BACKEND_DIR)

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import qrcode
import cv2
import numpy as np

# Load NeuroFace database and AI engine
from app.database.base import *
from app.database.session import SessionLocal
from app.ai.detector import face_detector
from app.ai.recognizer import face_recognizer
from app.ai.imaging import decode_base64_image
from app.ai.quality import evaluate_face_quality
from app.ai.anti_spoof import evaluate_face_authenticity

app = FastAPI(title="NeuroFace Teacher Edge Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory edge session registry
active_edge_sessions: Dict[str, Dict[str, Any]] = {}
SERVER_PORT = 8000


def get_local_lan_ip() -> str:
    """Discover the teacher's Wi-Fi / LAN IP address on the local network."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Does not actually transmit data; connects to non-routable address to determine interface IP
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
    except Exception:
        try:
            ip = socket.gethostbyname(socket.gethostname())
        except Exception:
            ip = "127.0.0.1"
    finally:
        s.close()
    return ip


def generate_qr_data_url(text: str) -> str:
    """Generate a high-contrast QR code image as a base64 Data URL."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(text)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#090d16", back_color="#ffffff")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffered.getvalue()).decode()


# Pydantic payloads
class StartEdgeSessionPayload(BaseModel):
    assignment_id: int = 1
    duration_minutes: int = 50


class VerifyFacePayload(BaseModel):
    image_base64: str


# -- WEB UI ROUTES ----------------------------------------------------

@app.get("/", response_class=HTMLResponse)
def serve_teacher_dashboard():
    """Serves the teacher's live attendance dashboard on the laptop."""
    path = os.path.join(CURRENT_DIR, "dashboard_web", "index.html")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


@app.get("/scanner", response_class=HTMLResponse)
@app.get("/cam", response_class=HTMLResponse)
def serve_mobile_scanner():
    """Serves the standalone mobile attendance camera web app."""
    path = os.path.join(CURRENT_DIR, "scanner_web", "index.html")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


# -- EDGE API ENDPOINTS -----------------------------------------------

@app.get("/api/edge/server-info")
def get_server_info():
    """Returns local network address and any currently active class session."""
    lan_ip = get_local_lan_ip()
    active_code = None
    active_data = None
    for code, sess in active_edge_sessions.items():
        if sess.get("status") == "ACTIVE":
            active_code = code
            active_data = sess
            break

    return {
        "lan_ip": lan_ip,
        "port": SERVER_PORT,
        "scanner_url": f"http://{lan_ip}:{SERVER_PORT}/scanner",
        "active_session": active_data
    }


@app.post("/api/edge/session/start")
def start_edge_session(payload: StartEdgeSessionPayload):
    """Start an attendance session on the teacher's computer and generate a pairing PIN."""
    with SessionLocal() as db:
        assignment = db.query(TeacherSubjectClassAssignment).filter(
            TeacherSubjectClassAssignment.id == payload.assignment_id
        ).first()
        if not assignment:
            raise HTTPException(status_code=404, detail="Class assignment not found")

        # Generate a distinct 6-digit numeric pairing code
        session_code = f"{random.randint(100, 999)} {random.randint(100, 999)}"
        clean_code = session_code.replace(" ", "")

        # Create persistent session record in DB
        now_utc = datetime.now(timezone.utc)
        db_session = AttendanceSession(
            assignment_id=assignment.id,
            teacher_id=assignment.teacher_id,
            slot_id=1,
            session_date=date.today(),
            start_time=now_utc,
            end_time=now_utc + timedelta(minutes=payload.duration_minutes),
            status=AttendanceSessionStatus.ACTIVE
        )
        db.add(db_session)
        db.commit()
        db.refresh(db_session)

        # Preload registered face embeddings for students of this class
        enrolled_students = db.query(Student).filter(
            Student.class_id == assignment.class_id
        ).all()

        registered_pool = []
        student_lookup = {}
        for student in enrolled_students:
            student_lookup[student.id] = {
                "id": student.id,
                "name": student.full_name,
                "reg_no": student.register_number,
                "face_registered": student.face_registered
            }
            for emb in student.embeddings:
                try:
                    vec = np.array(json.loads(emb.embedding_vector), dtype=np.float32)
                    registered_pool.append({"student_id": student.id, "embedding": vec})
                except Exception:
                    continue

        lan_ip = get_local_lan_ip()
        mobile_url = f"http://{lan_ip}:{SERVER_PORT}/scanner?code={clean_code}"
        qr_data_url = generate_qr_data_url(mobile_url)

        session_meta = {
            "session_id": db_session.id,
            "session_code": session_code,
            "clean_code": clean_code,
            "class_id": assignment.class_id,
            "class_name": assignment.class_assigned.name,
            "subject_name": assignment.subject.name,
            "teacher_name": assignment.teacher.full_name,
            "status": "ACTIVE",
            "mobile_url": mobile_url,
            "qr_data_url": qr_data_url,
            "total_enrolled": len(enrolled_students),
            "present_student_ids": set(),
            "roster_lookup": student_lookup,
            "registered_pool": registered_pool,
            "records_feed": {}
        }

        active_edge_sessions[clean_code] = session_meta
        active_edge_sessions[session_code] = session_meta

        # JSON response for frontend
        resp = dict(session_meta)
        del resp["registered_pool"]  # Strip numpy arrays
        del resp["present_student_ids"]
        return resp


@app.get("/api/edge/session/status/{code}")
def get_session_status(code: str):
    """Called by student mobile camera to verify session PIN and fetch class metadata."""
    clean = code.replace(" ", "").upper()
    sess = active_edge_sessions.get(clean)
    if not sess or sess.get("status") != "ACTIVE":
        raise HTTPException(status_code=404, detail="Attendance session code invalid or expired")

    return {
        "session_code": sess["session_code"],
        "class_name": sess["class_name"],
        "subject_name": sess["subject_name"],
        "teacher_name": sess["teacher_name"],
        "present_count": len(sess["present_student_ids"]),
        "total_enrolled": sess["total_enrolled"]
    }


@app.post("/api/edge/session/verify-face/{code}")
def verify_student_face_from_mobile(code: str, payload: VerifyFacePayload):
    """
    Called every 1.0s by the student's mobile phone as it is passed down the class.
    Runs ArcFace AI locally on the teacher's laptop in ~100ms.
    """
    clean = code.replace(" ", "").upper()
    sess = active_edge_sessions.get(clean)
    if not sess or sess.get("status") != "ACTIVE":
        raise HTTPException(status_code=400, detail="Session is no longer active")

    try:
        frame = decode_base64_image(payload.image_base64)
        if frame.shape[1] > 480:
            scale = 480.0 / frame.shape[1]
            frame = cv2.resize(frame, (480, int(frame.shape[0] * scale)))
    except Exception as exc:
        return {"status": "ERROR", "message": f"Frame read: {str(exc)}"}

    detected = face_detector.detect_faces(frame)
    if not detected:
        return {"status": "NO_FACE"}

    face = detected[0]
    box = face["box"]
    crop = face["crop"]
    score = face["score"]

    # 1. Anti-Spoofing & Non-Face Object Filter
    is_authentic, auth_status, auth_reason = evaluate_face_authenticity(
        full_frame=frame,
        box=box,
        crop_bgr=crop,
        landmarks=face.get("landmarks"),
        detection_score=score,
        is_registration=False
    )
    if not is_authentic:
        if auth_status == "SPOOF_DETECTED":
            return {"status": "SPOOF_DETECTED", "message": "PHONE / SCREEN REJECTED"}
        elif auth_status == "NON_FACE_OBJECT":
            return {"status": "NO_FACE"}
        return {"status": "LOW_QUALITY", "message": auth_reason}

    # 2. Quality check (relaxed for variable room lighting)
    is_quality_ok, quality_msg = evaluate_face_quality(crop)
    if not is_quality_ok and score < 0.65:
        return {"status": "LOW_QUALITY", "message": quality_msg}

    # 3. ArcFace embedding match on teacher's laptop
    emb = face_recognizer.extract_embedding(face["aligned"])
    matched_id, confidence, match_status = face_recognizer.match_face(emb, sess["registered_pool"])

    if match_status != "MATCHED" or matched_id not in sess["roster_lookup"]:
        return {
            "status": "UNKNOWN",
            "confidence": round(confidence, 3),
            "total_present": len(sess["present_student_ids"])
        }

    student_info = sess["roster_lookup"][matched_id]
    already_marked = matched_id in sess["present_student_ids"]

    if not already_marked:
        # Mark student present in DB
        with SessionLocal() as db:
            rec = AttendanceRecord(
                session_id=sess["session_id"],
                student_id=matched_id,
                status=AttendanceStatus.PRESENT,
                confidence_score=round(confidence, 4),
                verification_method=VerificationMethod.FACE_RECOGNITION,
                timestamp=datetime.now(timezone.utc), marked_by='Mobile Edge Cam'
            )
            db.add(rec)
            db.commit()

        sess["present_student_ids"].add(matched_id)
        now_str = datetime.now().strftime("%I:%M:%S %p")
        sess["records_feed"][matched_id] = {
            "time": now_str,
            "confidence": round(confidence, 3)
        }

    return {
        "status": "MATCHED",
        "student_name": student_info["name"],
        "register_number": student_info["reg_no"],
        "confidence": round(confidence, 3),
        "newly_marked": not already_marked,
        "total_present": len(sess["present_student_ids"])
    }


@app.get("/api/edge/session/live/{code}")
def get_live_roster_feed(code: str):
    """Polled by teacher's dashboard to update live attendance cards in real time."""
    clean = code.replace(" ", "").upper()
    sess = active_edge_sessions.get(clean)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    roster = []
    for sid, s in sess["roster_lookup"].items():
        is_pres = sid in sess["present_student_ids"]
        feed_info = sess["records_feed"].get(sid, {})
        roster.append({
            "id": s["id"],
            "name": s["name"],
            "register_number": s["reg_no"],
            "status": "PRESENT" if is_pres else "PENDING",
            "verified_time": feed_info.get("time"),
            "confidence": feed_info.get("confidence")
        })

    # Sort present first, then register number
    roster.sort(key=lambda x: (0 if x["status"] == "PRESENT" else 1, x["register_number"]))

    total = sess["total_enrolled"]
    pres = len(sess["present_student_ids"])
    pct = round((pres / total * 100), 1) if total > 0 else 0.0

    return {
        "total_enrolled": total,
        "present_count": pres,
        "pending_count": total - pres,
        "percentage": pct,
        "roster": roster
    }


@app.post("/api/edge/session/finalize/{code}")
def finalize_edge_session(code: str):
    """Teacher completes attendance. Unmarked students are finalized as Absent."""
    clean = code.replace(" ", "").upper()
    sess = active_edge_sessions.get(clean)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    with SessionLocal() as db:
        db_session = db.query(AttendanceSession).filter(AttendanceSession.id == sess["session_id"]).first()
        if db_session:
            db_session.status = AttendanceSessionStatus.COMPLETED
            db_session.end_time = datetime.now(timezone.utc)

            # Mark all pending enrolled students as ABSENT
            for sid in sess["roster_lookup"]:
                if sid not in sess["present_student_ids"]:
                    absent_rec = AttendanceRecord(
                        session_id=sess["session_id"],
                        student_id=sid,
                        status=AttendanceStatus.ABSENT,
                        verification_method=VerificationMethod.FACE_RECOGNITION,
                        timestamp=datetime.now(timezone.utc), marked_by='Mobile Edge Cam'
                    )
                    db.add(absent_rec)
            db.commit()

    sess["status"] = "COMPLETED"
    return {
        "message": "Session completed successfully",
        "present_count": len(sess["present_student_ids"])
    }


def run():
    lan_ip = get_local_lan_ip()
    print("=" * 65)
    print("   NEUROFACE TEACHER EDGE SERVER")
    print(f"   * Local Network IP:  http://{lan_ip}:{SERVER_PORT}")
    print(f"   * Teacher Dashboard: http://localhost:{SERVER_PORT}")
    print(f"   * Mobile Scanner:    http://{lan_ip}:{SERVER_PORT}/scanner")
    print("=" * 65)
    uvicorn.run(app, host="0.0.0.0", port=SERVER_PORT, log_level="info")


if __name__ == "__main__":
    run()
