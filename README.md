# NeuroFace: AI-Powered Facial Recognition-Based Student Attendance Management System Using Deep Learning

**NeuroFace** is an enterprise-grade, full-stack academic attendance automation platform developed for MCA final-year project demonstration and research presentation. It eliminates proxy attendance and manual roll calls by combining **MTCNN multi-face detection & canonical alignment**, **512-dimensional ArcFace deep facial embeddings**, **temporal multi-frame confirmation**, and **automated OCR leave certificate analysis** with role-based governance.

---

## 1. Key Highlights & Architectural Features

- **Strict 3-Tier Role-Based Access (Admin, Teacher, Student)**:
  - **Admin**: System superuser overseeing teachers, students, academic batches, course assignments, 85% eligibility fine rules, and immutable audit logs.
  - **Teacher**: Restricted to viewing and conducting sessions **only** for assigned subjects and classes.
  - **HOD (Head of Department)**: Cleanly modeled as a Teacher account with `designation: HOD`. Unlocks elevated department oversight, medical waiver approvals, and attendance overrides without creating a separate login system.
  - **Student**: Access to personal biometric registration wizard, subject-wise attendance percentages, 85% exam eligibility status, fine condonation notices, and OCR leave application submission.
- **Deep Learning Biometric Pipeline**:
  - **Face Detection & Alignment**: MTCNN identifies multiple faces in classroom camera frames, extracts 5 facial landmarks (eyes, nose, mouth corners), and performs affine transformation to canonical $112 \times 112$ tensors.
  - **Feature Extraction**: Pretrained neural network trained with **ArcFace** loss generates unit-normalized 512-dimensional face vectors ($\|v\|_2 = 1.0$).
  - **Cosine Similarity & Unknown Rejection**: Matches embeddings with a calibrated threshold ($\tau = 0.52$). Faces below this threshold are flagged as `UNKNOWN` rather than forced into false student matches.
  - **1-to-N Biometric De-Duplication (Fraud Guard)**: Prevents the same individual from enrolling their face under multiple student IDs. During face registration, the generated 512-D template is compared against all registered students ($\vec{v}_{\text{new}} \cdot \vec{v}_{\text{existing}} \ge 0.52$); if a match is detected, registration is immediately aborted with `HTTP 409 Conflict` and an audit security alert is logged.
  - **Temporal Multi-Frame Verification**: Requires a student to be detected across multiple consecutive frames before final attendance entry, preventing single-frame false positives.
  - **Session Duplicate Prevention**: Database-level unique constraint `UNIQUE(session_id, student_id)` ensures students cannot be marked present multiple times in the same lecture.
- **Academic Governance & Condonation Rules**:
  - **Mandatory 85% Rule**: Minimum 85% attendance required in each subject for direct examination eligibility.
  - **Condonation with Fine**: Configurable bracket ($75\% \le \text{Attendance} < 85\%$) allows examination upon payment of a fine (default ₹500).
  - **Detention**: Below 75% attendance marks student as detained.
  - **HOD Medical Waivers**: Legally compensates missed classes via:
    $$\text{Effective Attendance \%} = \min\left(100, \frac{\text{Present Classes} + \text{Waived Classes}}{\text{Total Sessions Held}} \times 100\right)$$
    Original lecture records remain intact for compliance; every waiver is permanently logged in the audit trail.
- **OCR Document Processing**:
  - Uploaded leave letters and medical certificates are scanned via OCR (Tesseract with fallback parser) to automatically extract dates, sickness reasons, and student IDs to assist faculty verification.
- **Export Capabilities**:
  - Download official student attendance reports in **PDF** and **CSV** formats.

---

## 2. Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Axios, React Router |
| **Backend API** | Python 3.13, FastAPI, Pydantic v2, Uvicorn |
| **Database & ORM** | SQLite / PostgreSQL via SQLAlchemy 2.0 with foreign-key cascade enforcement |
| **Deep Learning & Computer Vision** | PyTorch, MTCNN (facenet-pytorch), ArcFace (512-D ONNX / Torch), OpenCV, NumPy |
| **Document OCR** | PyTesseract, PIL (Pillow), Regex NLP heuristics |
| **Reporting** | ReportLab (PDF generation), Python CSV |

---

## 3. System Credentials for University Presentation

The database is pre-seeded with realistic MCA departmental data and active lecture sessions:

| Role | Username | Email | Password | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin@neuroface.edu` | `AdminPassword123!` | System Superuser |
| **HOD** | `hod_mca` | `hod.mca@neuroface.edu` | `HodPassword123!` | Dr. K. R. Ramanathan (HOD, Dept of MCA) |
| **Faculty** | `prof_rahul` | `rahul.faculty@neuroface.edu` | `TeacherPassword123!` | Prof. Rahul Verma (Assigned: Machine Learning) |
| **Faculty** | `prof_sarah` | `sarah.faculty@neuroface.edu` | `TeacherPassword123!` | Prof. Sarah Thomas (Assigned: Cloud Computing) |
| **Student** | `student_arun` | `arun@neuroface.edu` | `StudentPassword123!` | Arun Kumar (MCA S3 - 90% Attendance, Eligible) |
| **Student** | `student_priya` | `priya@neuroface.edu` | `StudentPassword123!` | Priya Nair (MCA S3 - 80% Attendance, Condonation Fine) |
| **Student** | `student_rohit` | `rohit@neuroface.edu` | `StudentPassword123!` | Rohit Sharma (MCA S3 - 70% Attendance, Detained / Waiver) |

*Note: The login screen also features 1-click quick-fill demo buttons for instant access during presentations.*

---

## 4. How to Run Locally

### Step 1: Start the FastAPI Backend
Open a terminal in the project directory:
```powershell
cd d:\NeuroFace\backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- API Base URL: `http://127.0.0.1:8000`
- Interactive Swagger Documentation: `http://127.0.0.1:8000/docs`

### Step 2: Start the React Frontend
Open a second terminal:
```powershell
cd d:\NeuroFace\frontend
npm run dev
```
- Web Application URL: `http://127.0.0.1:5173`

---

## 5. How to Check Database Data (3 Easy Methods)

### Method A: In-App Database Explorer (Visual Web Interface)
1. Sign in as **Admin** (`admin` / `AdminPassword123!`) on [http://127.0.0.1:5173](http://127.0.0.1:5173).
2. Click **Database Explorer** in the sidebar navigation.
3. Select any table (`students`, `attendance_records`, `attendance_sessions`, `face_embeddings`, `medical_waivers`, `users`, etc.) to view all active columns, schemas, live records, and search across rows.

### Method B: Terminal CLI Viewer (`view_db.py`)
Run the provided CLI utility in the backend directory:
```powershell
cd d:\NeuroFace\backend

# 1. View all tables with live record counts
.\venv\Scripts\python.exe view_db.py

# 2. View any specific table's contents
.\venv\Scripts\python.exe view_db.py students
.\venv\Scripts\python.exe view_db.py attendance_records
.\venv\Scripts\python.exe view_db.py attendance_sessions
.\venv\Scripts\python.exe view_db.py medical_waivers
.\venv\Scripts\python.exe view_db.py audit_logs
```

### Method C: External SQLite GUI Tools
Open `d:\NeuroFace\backend\neuroface.db` using any SQLite tool:
- **DB Browser for SQLite** (Free, open-source GUI)
- **VS Code Extension**: SQLite Viewer

---

## 6. Real-Life Biometric Face Registration (Guided 5-Pose Wizard)

The face registration has been redesigned into a structured, step-by-step real-life enrollment wizard:
- **No continuous auto-clicking**: The camera guides the user through each individual pose with clear visual instructions and feedback.
- **Pose 1 (Frontal Focus)**: Straight center look with neutral expression.
- **Pose 2 (Slight Right)**: 15° gentle turn towards right shoulder.
- **Pose 3 (Slight Left)**: 15° gentle turn towards left shoulder.
- **Pose 4 (Slight Tilt Up)**: Slight chin elevation to capture overhead classroom angles.
- **Pose 5 (Natural Expression)**: Everyday relaxed expression.
- **Pose Feedback & Retakes**: Live oval guide changes color upon face detection. Captured thumbnails are displayed below and can be retaken individually before generating the 512-D ArcFace template.
- **Biometric Identity Conflict Guard**: Automatically prevents one individual from registering under multiple student IDs. If the computed 512-D ArcFace embedding matches an existing student's face with $\ge 52\%$ cosine similarity, registration is blocked with a red security alert showing the conflicting student name and registration number.
1
---

## 7. Verification & Testing

To run the automated backend test suite verifying credentials, HOD permissions, attendance formulas, medical waivers, and ArcFace embedding dimensions:
```powershell
cd d:\NeuroFace\backend
.\venv\Scripts\python.exe test_core.py
```
All 7 test suites pass with 100% compliance.

