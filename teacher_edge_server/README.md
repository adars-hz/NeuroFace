# NeuroFace Teacher Edge Server & Mobile Camera Scanner

This is an isolated edge-computing architecture for **NeuroFace**. In this mode, the **Teacher's computer acts as the attendance server**, and any **student's smartphone acts as the pass-down attendance camera**.

---

## Architecture Overview

```
 [ Teacher's Laptop / PC ]                    [ Student's Smartphone ]
  (Runs Server & Local AI)                    (Pass-the-Phone Camera)
         │                                              │
         │─── 1. Teacher starts session ───────────────>│ (Student enters 6-digit PIN
         │       Generates 6-Digit PIN & QR Code        │  or scans QR Code on screen)
         │                                              │
         │<── 2. Real-time video frame sent (1.0s) ─────│ (Front camera frames face)
         │                                              │
         ├─── 3. Laptop CPU/GPU runs ArcFace & MTCNN    │
         │       Matches face in ~100ms                 │
         │                                              │
         │─── 4. Returns Match & Student Info ─────────>│ (Plays Chime 🎶 + Vibrates 📳)
         │       Marks student PRESENT in DB            │ ("✓ Attendance Recorded: Arun")
         │                                              │ ("➔ Pass phone to next student")
         │                                              │
         └─── 5. Teacher's screen updates in real-time! ┘ (Next student takes phone)
```

---

## Key Benefits

1. **Massive Power & Zero Cloud Costs**: The teacher's laptop has 8GB–16GB+ RAM and full multi-core performance. No cloud memory limits, no timeouts, no subscription costs.
2. **Instant Recognition (~100ms)**: Frames are processed locally over Wi-Fi / LAN, providing split-second verification.
3. **Physical Phone-Passing UX**: The mobile camera website features audio feedback (`D5 -> A5`), mobile haptics (`navigator.vibrate`), and a 2.5-second cooldown banner so students can comfortably hand the phone to the next person.
4. **Completely Isolated**: Built in this dedicated `teacher_edge_server/` folder so it does **not** modify or affect the main web project.

---

## How to Run & Test

### Option 1: Instant Launcher (Recommended for quick testing)
Simply double-click:
```
teacher_edge_server\start_server.bat
```
- Starts the FastAPI server and launches the **Teacher Edge Server GUI**.
- Automatically generates a 6-digit Session PIN (e.g., `581 294`) and live QR code.
- Displays the local Wi-Fi URL: `http://192.168.x.x:8000/scanner`.
- Click **"Open Teacher Web Dashboard"** to view the live classroom grid.

### Option 2: Build as Standalone Windows Executable (.exe)
Double-click:
```
teacher_edge_server\build_exe.bat
```
- Packages the server, PyTorch models, and web apps into:
  `teacher_edge_server\dist\NeuroFace-Teacher-Server\NeuroFace-Teacher-Server.exe`
- The teacher can copy this folder to any Windows laptop and double-click to run without needing Python installed!

---

## How to Connect the Student Mobile Phone

1. **Ensure the phone is on the same classroom Wi-Fi network** (or connected to the teacher's mobile hotspot).
2. Open the mobile camera in one of two ways:
   - **Scan the QR Code** displayed on the teacher's laptop screen.
   - Or open your mobile browser and go to `http://<TEACHER-IP>:8000/scanner`, then type the 6-digit session PIN.
3. **Pass the phone down the classroom**:
   - Each student looks at the front camera.
   - Upon recognition:
     - 🎶 Success audio chime rings.
     - 📳 Mobile phone vibrates.
     - 🟢 Green celebration banner displays: **"✓ Attendance Recorded: [Name] ([RegNo]) — Pass Phone to Next Student"**.
   - The student hands the phone to their classmate.
   - The teacher's laptop screen updates instantly in real time!

