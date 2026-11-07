import os
import sys
import json
import time

# Ensure backend directory is in path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(CURRENT_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import cv2
import numpy as np
from app.ai.detector import face_detector

LANDMARK_NAMES = ["Left Eye", "Right Eye", "Nose", "Left Mouth", "Right Mouth"]
LANDMARK_COLORS = [
    (255, 200, 0),   # Left Eye: Cyan/Yellow
    (255, 200, 0),   # Right Eye: Cyan/Yellow
    (0, 255, 255),   # Nose: Yellow
    (0, 165, 255),   # Left Mouth: Orange
    (0, 165, 255)    # Right Mouth: Orange
]

def format_mtcnn_output(face_data, idx=1):
    box = face_data["box"]
    score = face_data["score"]
    landmarks = face_data["landmarks"]
    aligned = face_data["aligned"]
    
    output_dict = {
        f"face_{idx}": {
            "bounding_box_coordinates": {
                "x1_left": box[0],
                "y1_top": box[1],
                "x2_right": box[2],
                "y2_bottom": box[3],
                "width": box[2] - box[0],
                "height": box[3] - box[1]
            },
            "detection_confidence_score": round(score, 4),
            "is_human_face": score >= 0.80,
            "five_facial_landmarks": {
                LANDMARK_NAMES[i]: {
                    "x": round(landmarks[i][0], 2),
                    "y": round(landmarks[i][1], 2)
                } for i in range(min(5, len(landmarks)))
            },
            "affine_aligned_crop_shape": list(aligned.shape),
            "ready_for_arcface": aligned.shape == (112, 112, 3)
        }
    }
    return output_dict

def run_image_demo(image_path):
    print(f"\n[+] Loading input image: {image_path}")
    frame = cv2.imread(image_path)
    if frame is None:
        print(f"[!] Error: Could not load image from {image_path}")
        return

    print("[*] Running MTCNN 3-Stage Cascaded Detection (P-Net -> R-Net -> O-Net)...")
    start_t = time.time()
    faces = face_detector.detect_faces(frame)
    latency = (time.time() - start_t) * 1000

    print(f"[+] MTCNN Execution Finished in: {latency:.2f} ms")
    print(f"[+] Total Faces Detected: {len(faces)}")

    if not faces:
        print("[-] No faces met the MTCNN threshold (0.80).")
        return

    for i, face in enumerate(faces):
        print("\n" + "="*65)
        print(f"       MTCNN RAW DICTIONARY OUTPUT FOR FACE #{i+1}")
        print("="*65)
        formatted = format_mtcnn_output(face, i+1)
        print(json.dumps(formatted, indent=2))

        # Annotate image
        box = face["box"]
        score = face["score"]
        landmarks = face["landmarks"]
        aligned = face["aligned"]

        # Draw green bounding box
        cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), (0, 255, 0), 2)
        label = f"Face: {score*100:.1f}%"
        cv2.putText(frame, label, (box[0], max(20, box[1] - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        # Draw 5 landmark points
        for l_idx, (lx, ly) in enumerate(landmarks):
            pt = (int(lx), int(ly))
            color = LANDMARK_COLORS[l_idx] if l_idx < len(LANDMARK_COLORS) else (0, 255, 0)
            cv2.circle(frame, pt, 4, color, -1)
            cv2.putText(frame, str(l_idx+1), (pt[0]+5, pt[1]-5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

        # Save aligned crop
        aligned_filename = f"mtcnn_aligned_face_{i+1}.jpg"
        cv2.imwrite(aligned_filename, aligned)
        print(f"\n[+] Saved Affine Aligned 112x112 Crop to: {aligned_filename}")

    output_annotated = "mtcnn_annotated_result.jpg"
    cv2.imwrite(output_annotated, frame)
    print(f"[+] Saved Visual Annotated Image to: {output_annotated}")

def run_webcam_demo():
    print("\n" + "="*65)
    print("      LIVE MTCNN WEBCAM DEMONSTRATION FOR EXAMINERS")
    print("="*65)
    print("[*] Initializing webcam...")
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[!] Warning: Could not open default webcam (ID 0).")
        print("    If running without a camera, pass an image path: python demo_mtcnn.py <photo.jpg>")
        return

    print("[+] Webcam connected successfully!")
    print("[+] Press 'q' or 'ESC' in the video window to stop.")
    print("-------------------------------------------------------")

    last_print = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        start_t = time.time()
        faces = face_detector.detect_faces(frame)
        latency = (time.time() - start_t) * 1000

        # Draw info overlay
        cv2.putText(frame, f"MTCNN Latency: {latency:.1f}ms | Faces: {len(faces)}", (15, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

        for i, face in enumerate(faces):
            box = face["box"]
            score = face["score"]
            landmarks = face["landmarks"]
            aligned = face["aligned"]

            # Draw green bounding box
            cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), (0, 255, 0), 2)
            cv2.putText(frame, f"Conf: {score*100:.1f}%", (box[0], max(20, box[1] - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 2)

            # Draw 5 landmarks
            for l_idx, (lx, ly) in enumerate(landmarks):
                pt = (int(lx), int(ly))
                color = LANDMARK_COLORS[l_idx] if l_idx < len(LANDMARK_COLORS) else (0, 255, 0)
                cv2.circle(frame, pt, 4, color, -1)

            # Inset the aligned 112x112 ArcFace crop in top-right corner
            if aligned is not None and aligned.shape == (112, 112, 3):
                h, w = frame.shape[:2]
                inset_x = w - 122
                inset_y = 10
                frame[inset_y:inset_y+112, inset_x:inset_x+112] = aligned
                cv2.rectangle(frame, (inset_x, inset_y), (inset_x+112, inset_y+112), (255, 255, 255), 1)
                cv2.putText(frame, "ArcFace 112x112", (inset_x-10, inset_y+125),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

            # Print JSON output to console once every 2 seconds
            if time.time() - last_print > 2.0:
                print(f"\n[MTCNN Live Output @ {time.strftime('%H:%M:%S')}] Detected Face:")
                print(json.dumps(format_mtcnn_output(face, 1), indent=2))
                last_print = time.time()

        cv2.imshow("NeuroFace - Live MTCNN Output Demo", frame)
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == 27:
            break

    cap.release()
    cv2.destroyAllWindows()
    print("\n[+] Live MTCNN Demo stopped.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        run_image_demo(sys.argv[1])
    else:
        run_webcam_demo()

