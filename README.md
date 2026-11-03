---
title: NeuroFace API
emoji: 🧠
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# 🧠 NeuroFace

### AI-Powered Facial Recognition-Based Student Attendance Management System

NeuroFace is an AI-powered student attendance management system designed to automate classroom attendance using **facial recognition, deep learning, multi-face detection, OCR, and role-based access control**.

The system combines **MTCNN-based face detection and alignment**, **ArcFace facial embeddings**, **multi-frame verification**, and **automated attendance management** to provide an intelligent alternative to traditional manual attendance systems.

---

## 📌 Project Overview

Traditional attendance systems can be time-consuming and may be vulnerable to proxy attendance and manual errors.

NeuroFace addresses these challenges by allowing teachers to conduct attendance sessions using a classroom camera. The system detects multiple faces, compares them with registered student face embeddings, verifies identities across multiple frames, and records attendance.

The system also provides:

- Student biometric registration
- Automated facial recognition
- Multi-student classroom face detection
- Duplicate attendance prevention
- Attendance percentage calculation
- Subject-wise attendance tracking
- HOD medical waiver management
- OCR-based leave and medical document processing
- PDF and CSV attendance reports
- Role-based access control
- Audit logging

---

## 🏗️ System Architecture

NeuroFace follows a layered architecture consisting of a React frontend, FastAPI backend, AI processing components, and a database.

```text
                 ┌─────────────────────────┐
                 │     React Frontend      │
                 │ React + Vite + Tailwind │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │     FastAPI Backend    │
                 │   Python + Pydantic    │
                 └────────────┬────────────┘
                              │
              ┌───────────────┼────────────────┐
              │               │                │
              ▼               ▼                ▼
       ┌────────────┐  ┌──────────────┐  ┌────────────┐
       │  Database  │  │ Face         │  │    OCR     │
       │            │  │ Recognition  │  │ Processing │
       │ SQLite /   │  │ Pipeline     │  │            │
       │ PostgreSQL │  └──────┬───────┘  └────────────┘
       └────────────┘         │
                       ┌──────┴───────┐
                       ▼              ▼
                     MTCNN          ArcFace
                 Face Detection   512-D Embeddings
```

---

## 👥 User Roles

NeuroFace uses role-based access control with four functional roles.

### 👨‍💼 Admin

The Admin manages the overall system, including:

- Teachers and students
- Academic batches
- Subjects and course assignments
- Attendance configuration
- Eligibility rules
- Audit logs
- System administration

### 👨‍🏫 Teacher

Teachers can:

- View assigned classes and subjects
- Start attendance sessions
- Use the classroom camera for facial recognition
- Review attendance records
- View student attendance statistics
- Generate and download individual student attendance reports
- Process submitted leave applications

### 🎓 HOD

The Head of Department is modeled as a specialized Teacher account with additional permissions for:

- Department-level attendance monitoring
- Medical waiver approval
- Attendance overrides
- Student eligibility review
- Generating and downloading departmental student attendance reports

### 👨‍🎓 Student

Students can:

- Register their face
- Complete biometric enrollment
- View subject-wise attendance
- Check examination eligibility
- View condonation and fine status
- Submit leave or medical documents
- View attendance history

---

## 🧠 Facial Recognition Pipeline

The NeuroFace biometric pipeline consists of multiple processing stages.

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
            ┌─────┴─────┐
            │           │
          Match      No Match
            │           │
            ▼           ▼
       Student       UNKNOWN
      Identified
            │
            ▼
     Multi-Frame Verification
            │
            ▼
     Attendance Recorded
```

### Face Detection and Alignment – MTCNN

MTCNN (Multi-task Cascaded Convolutional Networks) is used to:

- Detect faces in camera frames
- Support multiple faces in a single frame
- Locate facial landmarks
- Align detected faces before feature extraction

### Face Embedding – ArcFace

ArcFace is used to generate a **512-dimensional facial embedding** representing the biometric characteristics of a registered face.

The embeddings are normalized before comparison.

### Face Matching

Cosine similarity is used to compare detected face embeddings with registered student embeddings.

A configurable similarity threshold determines whether a detected face is accepted as a known student or classified as `UNKNOWN`.

### Multi-Frame Verification

A student must be recognized across multiple frames before attendance is finalized.

This helps reduce incorrect attendance entries caused by a single-frame recognition result.

### Duplicate Attendance Prevention

A database-level constraint prevents the same student from being marked present multiple times during the same attendance session.

---

## 🛡️ Biometric De-Duplication

NeuroFace includes a biometric identity conflict check during face registration.

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
          ┌────┴─────┐
          │          │
      Similarity   No Conflict
      Above Limit      │
          │            ▼
          ▼       Face Registration
     Registration
        Blocked
```

This helps prevent the same individual from registering their face under multiple student accounts.

---

## 📊 Attendance Management

NeuroFace automatically calculates subject-wise attendance percentages from biometric classroom sessions and approved medical waivers.

The system provides:

- Attendance session management
- Subject-wise attendance tracking
- Student attendance history
- Attendance percentage calculation
- Examination eligibility monitoring
- PDF and CSV attendance reports

### Medical Waiver Management

Authorized HOD users can approve medical waivers for eligible cases.

The effective attendance calculation can account for approved waived classes while preserving original attendance records for audit purposes.

---

## 📄 OCR-Based Leave Processing

NeuroFace supports OCR-based processing of uploaded leave letters and medical certificates.

The OCR pipeline uses:

- Tesseract OCR
- PyTesseract
- Pillow
- Regular-expression-based text extraction

The system can assist in extracting information such as:

- Student ID
- Dates
- Leave period
- Medical information
- Relevant document details

Extracted information can be reviewed by authorized faculty members.

---

## 📑 Reports and Analytics

NeuroFace provides attendance reporting capabilities, including:

- Student attendance reports
- Subject-wise attendance
- Attendance history
- PDF report generation
- CSV exports

Teachers can generate reports for students in their assigned classes, while HODs can generate reports for students in their department.

---

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| UI Libraries | Lucide Icons, React Router |
| API Communication | Axios, REST API |
| Backend | Python 3.13, FastAPI, Pydantic |
| Database | SQLite / PostgreSQL |
| ORM | SQLAlchemy 2.0 |
| Face Detection | MTCNN, facenet-pytorch |
| Face Recognition | ArcFace |
| Deep Learning | PyTorch |
| OCR | Tesseract OCR, PyTesseract, Pillow |
| Version Control | Git, GitHub |
| Deployment | Docker, Hugging Face Spaces |

---

## 📁 Project Modules

| Module | Description |
|---|---|
| Authentication | User login and role-based access |
| Student Management | Student records and profiles |
| Teacher Management | Teacher accounts and assignments |
| Face Registration | Student biometric enrollment |
| Face Detection | MTCNN-based face detection |
| Face Recognition | ArcFace embedding generation and matching |
| Attendance Management | Automated attendance recording |
| Anti-Spoofing | Facial liveness and presentation-attack checks |
| Leave Management | Leave application processing |
| OCR Processing | Leave document text extraction |
| Reports | Attendance report generation |
| Audit Logging | System activity tracking |

---

## 🚀 Deployment

NeuroFace API is configured for deployment using Docker on Hugging Face Spaces.

**Hugging Face Space:**

[https://huggingface.co/spaces/adars-hz/neuroface-api](https://huggingface.co/spaces/adars-hz/neuroface-api)

The Docker configuration must expose the port configured in the Hugging Face Space settings.

**Default configured application port:** `7860`

---

## 🔐 Security and Data Privacy

NeuroFace handles student records and biometric information. Appropriate safeguards should be applied, including:

- Role-based access control
- Secure authentication
- Protected API endpoints
- Controlled access to biometric records
- Secure handling of uploaded documents
- Protection of environment variables and database credentials

Biometric data and student information should not be committed to public repositories.

---

## 🔮 Future Enhancements

Potential future improvements include:

- Improved recognition under varying lighting conditions
- Enhanced anti-spoofing mechanisms
- Mobile application integration
- Advanced attendance analytics
- Improved OCR document analysis
- Scalable cloud infrastructure
- AI model optimization

---

## 🎯 Project Goal

The goal of NeuroFace is to combine facial recognition, deep learning, attendance automation, and leave management into a unified academic management platform.

By reducing manual attendance work and improving record management, NeuroFace aims to make classroom attendance more efficient and reliable.

---

## 👨‍💻 Developed As

**MCA Main Project**

Department of MCA

AJIET

**Project:** NeuroFace – AI-Powered Facial Recognition-Based Student Attendance Management System

---

<p align="center">
  <strong>NeuroFace – Smarter Attendance Through AI</strong>
</p>