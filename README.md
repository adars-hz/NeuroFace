# NeuroFace

## AI-Powered Facial Recognition-Based Student Attendance Management System

NeuroFace is an AI-powered student attendance management system designed to automate classroom attendance using **facial recognition, deep learning, multi-face detection, OCR, and role-based access control**.

The system combines **MTCNN-based face detection and alignment**, **ArcFace facial embeddings**, **multi-frame verification**, and **automated attendance management** to provide a secure and efficient alternative to traditional manual attendance.

---

## 📌 Project Overview

Traditional attendance systems can be time-consuming and may be vulnerable to proxy attendance and manual errors.

NeuroFace addresses these challenges by allowing teachers to conduct attendance sessions using a classroom camera. The system detects multiple faces, compares them with registered student face embeddings, verifies identities across multiple frames, and records attendance automatically.

The system also provides:

* Student biometric registration
* Automated face recognition
* Multi-student classroom detection
* Duplicate attendance prevention
* Attendance percentage calculation
* Real-time subject-wise tracking
* HOD medical waiver management
* OCR-based leave and medical document processing
* PDF and CSV attendance reports
* Role-based access control
* Audit logging

---

# 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │   React Frontend    │
                    │ React + Vite +      │
                    │ Tailwind CSS        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    FastAPI Backend  │
                    │ Python + Pydantic   │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
       ┌───────────┐     ┌────────────┐    ┌────────────┐
       │ Database  │     │ Face       │    │ OCR        │
       │ SQLite /  │     │ Recognition│    │ Processing │
       │ PostgreSQL│     │ Pipeline   │    │            │
       └───────────┘     └────────────┘    └────────────┘
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
                  MTCNN             ArcFace
               Face Detection      512-D Embedding
```

---

# 👥 User Roles

NeuroFace uses role-based access control with four functional roles.

### 👨‍💼 Admin

The Admin manages the overall system, including:

* Teachers and students
* Academic batches
* Subjects and course assignments
* Attendance configuration
* Eligibility rules
* Audit logs
* System administration

### 👨‍🏫 Teacher

Teachers can:

* View assigned classes and subjects
* Start attendance sessions
* Use the classroom camera for facial recognition
* Review attendance records
* View student attendance statistics
* Generate and download individual student attendance reports as PDF
* Process submitted leave applications

### 🎓 HOD

The Head of Department is modeled as a specialized Teacher account with additional permissions for:

* Department-level attendance monitoring
* Medical waiver approval
* Attendance overrides
* Student eligibility review
* Generate and download individual student attendance reports as PDF for the department

### 👨‍🎓 Student

Students can:

* Register their face
* Complete biometric enrollment
* View subject-wise attendance
* Check examination eligibility
* View condonation/fine status
* Submit leave or medical documents
* View their attendance history

---

# 🧠 Facial Recognition Pipeline

The NeuroFace biometric pipeline consists of multiple stages:

```text
Camera Input
     │
     ▼
Face Detection
   (MTCNN)
     │
     ▼
Face Alignment
     │
     ▼
Image Preprocessing
     │
     ▼
ArcFace Feature Extraction
     │
     ▼
512-D Face Embedding
     │
     ▼
Cosine Similarity
     │
     ├── Match ──────► Student Identified
     │
     └── No Match ───► UNKNOWN
                              │
                              ▼
                    Multi-Frame Verification
                              │
                              ▼
                     Attendance Recorded
```

### Face Detection & Alignment

MTCNN is used to:

* Detect faces in camera frames
* Support multiple faces in a single frame
* Locate facial landmarks
* Align detected faces before feature extraction

### Face Embedding

ArcFace is used to generate a **512-dimensional facial embedding** representing the biometric characteristics of a registered face.

The embeddings are normalized before comparison.

### Face Matching

Cosine similarity is used to compare the detected face embedding with registered student embeddings.

A configurable similarity threshold is used to determine whether a detected face should be accepted as a known student or rejected as `UNKNOWN`.

### Multi-Frame Verification

A student must be recognized across multiple consecutive frames before attendance is finalized.

This reduces the possibility of recording attendance from a single incorrect detection.

### Duplicate Attendance Prevention

A database-level constraint prevents the same student from being marked present multiple times during the same attendance session.

---

# 🛡️ Biometric De-Duplication

NeuroFace includes a biometric identity conflict check during registration.

When a student registers their face:

```text
New Face
   │
   ▼
Generate ArcFace Embedding
   │
   ▼
Compare With Existing Embeddings
   │
   ├── Similarity Above Threshold
   │          │
   │          ▼
   │     Registration Blocked
   │
   └── No Conflict
              │
              ▼
       Face Registration
```

This helps prevent the same individual from registering their face under multiple student accounts.

---

# 📊 Attendance Management

NeuroFace automatically calculates subject-wise attendance percentages from biometric classroom sessions and approved medical waivers. The system provides real-time attendance reporting, session breakdowns, and downloadable PDF and CSV reports.

### Medical Waiver

Authorized HOD users can approve medical waivers for eligible cases.
 
The effective attendance calculation can account for approved waived classes while preserving the original attendance records for audit purposes.

---

# 📄 OCR-Based Leave Processing

NeuroFace supports automated processing of uploaded leave letters and medical certificates.

The OCR pipeline uses:

* Tesseract OCR
* PyTesseract
* Pillow
* Regular-expression based text extraction

The system can assist in extracting information such as:

* Student ID
* Dates
* Leave period
* Medical information
* Relevant document details

The extracted information can then be reviewed by authorized faculty members.

---

# 📑 Reports

The system provides attendance reporting capabilities with support for:

* Student attendance reports
* Subject-wise attendance
* Attendance history
* PDF reports
* CSV exports

Teachers can generate reports for students in their assigned classes. HODs can
generate reports for students in their department. Open **Student Reports** in
the faculty portal, select a student, and choose **Download PDF**.

---

# 🛠️ Technology Stack

| Category             | Technologies                                                    |
| -------------------- | --------------------------------------------------------------- |
| **Frontend**         | React 18, Vite, Tailwind CSS, Lucide Icons, Axios, React Router |
| **Backend**          | Python 3.13, FastAPI, Pydantic                                  |
| **Database**         | SQLite / PostgreSQL                                             |
| **ORM**              | SQLAlchemy 2.0                                                  |
| **Face Detection**   | MTCNN / facenet-pytorch                                         |
| **Face Recognition** | ArcF                                                            |
