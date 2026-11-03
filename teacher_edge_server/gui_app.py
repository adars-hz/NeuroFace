import os
import sys
import time
import base64
import io
import threading
import webbrowser
import urllib.request
import json
import tkinter as tk
from tkinter import ttk, messagebox
from PIL import Image, ImageTk

# Link to current directory and backend
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from teacher_edge_server.server import app, get_local_lan_ip, SERVER_PORT
import uvicorn


class TeacherServerGUI:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("NeuroFace - Teacher Edge Server")
        self.root.geometry("640x720")
        self.root.minsize(580, 680)
        self.root.configure(bg="#090d16")

        self.lan_ip = get_local_lan_ip()
        self.server_url = f"http://{self.lan_ip}:{SERVER_PORT}"
        self.current_code = ""
        self.active_session_data = None
        self.qr_photo = None
        self.running = True

        self._build_ui()
        self._start_server_thread()

    def _build_ui(self):
        # Header Frame
        header = tk.Frame(self.root, bg="#0f172a", padx=20, pady=16)
        header.pack(fill="x")

        title_box = tk.Frame(header, bg="#0f172a")
        title_box.pack(side="left")

        lbl_title = tk.Label(
            title_box,
            text="NeuroFace Teacher Server",
            font=("Plus Jakarta Sans", 16, "bold"),
            fg="#ffffff",
            bg="#0f172a"
        )
        lbl_title.pack(anchor="w")

        self.lbl_ip = tk.Label(
            title_box,
            text=f"Host IP: {self.server_url} (Port {SERVER_PORT})",
            font=("Consolas", 10),
            fg="#2dd4bf",
            bg="#0f172a"
        )
        self.lbl_ip.pack(anchor="w", pady=(2, 0))

        # Status Badge
        self.status_badge = tk.Label(
            header,
            text="● INITIALIZING",
            font=("Plus Jakarta Sans", 9, "bold"),
            fg="#fbbf24",
            bg="#1e293b",
            padx=10,
            pady=4
        )
        self.status_badge.pack(side="right")

        # Content Container
        content = tk.Frame(self.root, bg="#090d16", padx=24, pady=16)
        content.pack(fill="both", expand=True)

        # Session Pairing Card
        card = tk.Frame(content, bg="#0f172a", highlightbackground="#1e293b", highlightthickness=1, padx=20, pady=16)
        card.pack(fill="x", pady=(0, 12))

        lbl_card_title = tk.Label(
            card,
            text="STUDENT MOBILE PAIRING CODE",
            font=("Plus Jakarta Sans", 9, "bold"),
            fg="#94a3b8",
            bg="#0f172a"
        )
        lbl_card_title.pack(anchor="center")

        # Big Code Label
        self.lbl_code = tk.Label(
            card,
            text="------",
            font=("Consolas", 36, "bold"),
            fg="#2dd4bf",
            bg="#0f172a"
        )
        self.lbl_code.pack(anchor="center", pady=6)

        self.lbl_session_info = tk.Label(
            card,
            text="Starting attendance session...",
            font=("Plus Jakarta Sans", 10),
            fg="#cbd5e1",
            bg="#0f172a"
        )
        self.lbl_session_info.pack(anchor="center")

        # QR Code Frame
        qr_container = tk.Frame(card, bg="#0f172a", pady=8)
        qr_container.pack(anchor="center")

        self.qr_label = tk.Label(qr_container, bg="#ffffff", padx=8, pady=8)
        self.qr_label.pack()

        lbl_qr_hint = tk.Label(
            card,
            text="Students scan this QR code or enter PIN on mobile",
            font=("Plus Jakarta Sans", 8),
            fg="#64748b",
            bg="#0f172a"
        )
        lbl_qr_hint.pack(anchor="center", pady=(4, 0))

        # Live Stats Counter
        stats_box = tk.Frame(content, bg="#0f172a", highlightbackground="#1e293b", highlightthickness=1, padx=16, pady=12)
        stats_box.pack(fill="x", pady=(0, 14))

        self.lbl_present_count = tk.Label(
            stats_box,
            text="Present: 0 Students Verified",
            font=("Plus Jakarta Sans", 12, "bold"),
            fg="#34d399",
            bg="#0f172a"
        )
        self.lbl_present_count.pack(side="left")

        self.lbl_attendance_pct = tk.Label(
            stats_box,
            text="0.0% Attended",
            font=("Consolas", 11, "bold"),
            fg="#a5b4fc",
            bg="#0f172a"
        )
        self.lbl_attendance_pct.pack(side="right")

        # Action Buttons Frame
        btn_grid = tk.Frame(content, bg="#090d16")
        btn_grid.pack(fill="x", pady=(0, 8))

        btn_dashboard = tk.Button(
            btn_grid,
            text="Open Teacher Web Dashboard ➔",
            font=("Plus Jakarta Sans", 10, "bold"),
            bg="#0d9488",
            fg="#ffffff",
            activebackground="#14b8a6",
            activeforeground="#ffffff",
            relief="flat",
            padx=14,
            pady=10,
            cursor="hand2",
            command=self.open_dashboard
        )
        btn_dashboard.pack(fill="x", pady=(0, 6))

        sub_btns = tk.Frame(btn_grid, bg="#090d16")
        sub_btns.pack(fill="x")

        btn_copy = tk.Button(
            sub_btns,
            text="Copy Mobile Scanner Link",
            font=("Plus Jakarta Sans", 9),
            bg="#1e293b",
            fg="#cbd5e1",
            activebackground="#334155",
            relief="flat",
            padx=10,
            pady=8,
            cursor="hand2",
            command=self.copy_link
        )
        btn_copy.pack(side="left", fill="x", expand=True, padx=(0, 4))

        btn_new_session = tk.Button(
            sub_btns,
            text="New Class Session",
            font=("Plus Jakarta Sans", 9),
            bg="#1e293b",
            fg="#cbd5e1",
            activebackground="#334155",
            relief="flat",
            padx=10,
            pady=8,
            cursor="hand2",
            command=self.request_new_session
        )
        btn_new_session.pack(side="right", fill="x", expand=True, padx=(4, 0))

        # Footer
        footer = tk.Label(
            self.root,
            text="NeuroFace Local Edge Engine • Powered by MTCNN & ArcFace 512-D",
            font=("Plus Jakarta Sans", 8),
            fg="#475569",
            bg="#090d16",
            pady=8
        )
        footer.pack(side="bottom")

    def _start_server_thread(self):
        def run_uvicorn():
            uvicorn.run(app, host="0.0.0.0", port=SERVER_PORT, log_level="warning")

        server_t = threading.Thread(target=run_uvicorn, daemon=True)
        server_t.start()

        # Poll until server is responding, then initialize active session
        threading.Thread(target=self._init_session_when_ready, daemon=True).start()

    def _init_session_when_ready(self):
        for _ in range(25):
            try:
                res = urllib.request.urlopen(f"http://127.0.0.1:{SERVER_PORT}/api/edge/server-info", timeout=2)
                if res.getcode() == 200:
                    time.sleep(0.5)
                    self.request_new_session()
                    self._start_stats_poller()
                    return
            except Exception:
                time.sleep(0.5)

    def request_new_session(self):
        try:
            req_data = json.dumps({"assignment_id": 1, "duration_minutes": 50}).encode()
            req = urllib.request.Request(
                f"http://127.0.0.1:{SERVER_PORT}/api/edge/session/start",
                data=req_data,
                headers={"Content-Type": "application/json"}
            )
            res = urllib.request.urlopen(req, timeout=5)
            data = json.loads(res.read().decode())
            self.active_session_data = data
            self.current_code = data["clean_code"]

            self.root.after(0, self._update_session_display, data)
        except Exception as e:
            print("Session create error:", e)

    def _update_session_display(self, data):
        self.lbl_code.config(text=data["session_code"])
        self.lbl_session_info.config(text=f"{data['class_name']} • {data['subject_name']}\nFaculty: {data['teacher_name']}")
        self.status_badge.config(text="● SERVER ACTIVE", fg="#34d399", bg="#064e3b")

        # Render QR Code image from base64
        try:
            b64_qr = data["qr_data_url"].split(",")[1]
            qr_bytes = base64.b64decode(b64_qr)
            img = Image.open(io.BytesIO(qr_bytes)).resize((160, 160), Image.Resampling.LANCZOS)
            self.qr_photo = ImageTk.PhotoImage(img)
            self.qr_label.config(image=self.qr_photo)
        except Exception as e:
            print("QR render error:", e)

    def _start_stats_poller(self):
        def poll():
            while self.running:
                if self.current_code:
                    try:
                        url = f"http://127.0.0.1:{SERVER_PORT}/api/edge/session/live/{self.current_code}"
                        res = urllib.request.urlopen(url, timeout=2)
                        data = json.loads(res.read().decode())
                        self.root.after(0, self._update_stats_display, data)
                    except Exception:
                        pass
                time.sleep(1.5)

        threading.Thread(target=poll, daemon=True).start()

    def _update_stats_display(self, data):
        pres = data.get("present_count", 0)
        tot = data.get("total_enrolled", 0)
        pct = data.get("percentage", 0.0)
        self.lbl_present_count.config(text=f"Present: {pres} / {tot} Students")
        self.lbl_attendance_pct.config(text=f"{pct}% Recorded")

    def open_dashboard(self):
        webbrowser.open(f"http://localhost:{SERVER_PORT}")

    def copy_link(self):
        if self.current_code:
            link = f"http://{self.lan_ip}:{SERVER_PORT}/scanner?code={self.current_code}"
            self.root.clipboard_clear()
            self.root.clipboard_append(link)
            messagebox.showinfo("Scanner Link Copied", f"Mobile scanner link copied to clipboard:\n\n{link}")


def main():
    root = tk.Tk()
    app_gui = TeacherServerGUI(root)
    root.protocol("WM_DELETE_WINDOW", lambda: sys.exit(0))
    root.mainloop()


if __name__ == "__main__":
    main()
