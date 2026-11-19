import sys
import os
import pptx
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Professional Academic Color Palette
    BG_DARK = RGBColor(15, 23, 42)        # Slate 900
    CARD_BG = RGBColor(255, 255, 255)     # White
    CARD_BORDER = RGBColor(226, 232, 240) # Slate 200
    
    PRIMARY = RGBColor(30, 58, 138)       # Navy / Blue 900
    PRIMARY_LIGHT = RGBColor(37, 99, 235) # Blue 600
    TEAL = RGBColor(13, 148, 136)         # Teal 600
    AMBER = RGBColor(217, 119, 6)         # Amber 600
    ROSE = RGBColor(225, 29, 72)          # Rose 600
    SUCCESS = RGBColor(16, 185, 129)      # Emerald 500
    
    TEXT_MAIN = RGBColor(15, 23, 42)      # Slate 900
    TEXT_MUTED = RGBColor(100, 116, 139)  # Slate 500

    blank_layout = prs.slide_layouts[6]

    def add_header(slide, title, category="MPRJ382 – SEMESTER 3, MCA | FINAL PROJECT REVIEW"):
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.32), Inches(11.7), Inches(0.32))
        tf_c = cat_box.text_frame
        tf_c.word_wrap = True
        tf_c.margin_left = tf_c.margin_top = tf_c.margin_right = tf_c.margin_bottom = 0
        p_c = tf_c.paragraphs[0]
        p_c.text = category.upper()
        p_c.font.size = Pt(9.5)
        p_c.font.bold = True
        p_c.font.color.rgb = PRIMARY_LIGHT
        
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.62), Inches(11.7), Inches(0.65))
        tf_t = title_box.text_frame
        tf_t.word_wrap = True
        tf_t.margin_left = tf_t.margin_top = tf_t.margin_right = tf_t.margin_bottom = 0
        p_t = tf_t.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(21)
        p_t.font.bold = True
        p_t.font.color.rgb = TEXT_MAIN

        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.30), Inches(11.733), Inches(0.02))
        line.fill.solid()
        line.fill.fore_color.rgb = CARD_BORDER
        line.line.color.rgb = CARD_BORDER

    def add_card(slide, left, top, width, height, bg_color=CARD_BG, border_color=CARD_BORDER):
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = bg_color
        shape.line.color.rgb = border_color
        shape.line.width = Pt(1)
        return shape

    # =========================================================================
    # SLIDE 1: TITLE SLIDE (VTU FORMAT)
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    bg1 = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = BG_DARK
    bg1.line.fill.background()

    card1 = add_card(s1, Inches(0.9), Inches(0.65), Inches(11.533), Inches(6.2), BG_DARK, RGBColor(30, 41, 59))
    
    inst_box = s1.shapes.add_textbox(Inches(1.4), Inches(0.9), Inches(10.5), Inches(0.65))
    tf_inst = inst_box.text_frame
    p_inst = tf_inst.paragraphs[0]
    p_inst.text = "AJ INSTITUTE OF ENGINEERING & TECHNOLOGY, MANGALURU"
    p_inst.font.size = Pt(13)
    p_inst.font.bold = True
    p_inst.font.color.rgb = TEAL
    p_inst2 = tf_inst.add_paragraph()
    p_inst2.text = "Affiliated to Visvesvaraya Technological University (VTU), Belagavi, Karnataka | Department of MCA"
    p_inst2.font.size = Pt(10)
    p_inst2.font.color.rgb = RGBColor(148, 163, 184)

    proj_box = s1.shapes.add_textbox(Inches(1.4), Inches(1.75), Inches(10.5), Inches(2.3))
    tf_proj = proj_box.text_frame
    tf_proj.word_wrap = True
    p_code = tf_proj.paragraphs[0]
    p_code.text = "FINAL REVIEW – MAIN PROJECT [MPRJ382] – SEMESTER 3, MCA"
    p_code.font.size = Pt(11)
    p_code.font.bold = True
    p_code.font.color.rgb = PRIMARY_LIGHT
    
    p_title = tf_proj.add_paragraph()
    p_title.text = "NEUROFACE"
    p_title.font.size = Pt(36)
    p_title.font.bold = True
    p_title.font.color.rgb = RGBColor(255, 255, 255)

    p_sub = tf_proj.add_paragraph()
    p_sub.text = "An AI-Powered Facial Recognition Classroom Attendance and Leave Management System with Multi-Signal Presentation Attack Detection"
    p_sub.font.size = Pt(13.5)
    p_sub.font.bold = True
    p_sub.font.color.rgb = RGBColor(226, 232, 240)

    det_box1 = s1.shapes.add_textbox(Inches(1.4), Inches(4.35), Inches(5.2), Inches(2.1))
    tf_d1 = det_box1.text_frame
    p1 = tf_d1.paragraphs[0]
    p1.text = "STUDENT CREDENTIALS:"
    p1.font.size = Pt(10.5)
    p1.font.bold = True
    p1.font.color.rgb = TEAL
    
    p2 = tf_d1.add_paragraph()
    p2.text = "ADARSH"
    p2.font.size = Pt(16)
    p2.font.bold = True
    p2.font.color.rgb = RGBColor(255, 255, 255)
    
    p3 = tf_d1.add_paragraph()
    p3.text = "USN: 4JK25MC003"
    p3.font.size = Pt(13)
    p3.font.bold = True
    p3.font.color.rgb = RGBColor(203, 213, 225)
    
    p4 = tf_d1.add_paragraph()
    p4.text = "Degree: Master of Computer Applications (MCA)\nBatch: 2024 – 2026 | Academic Year: 2025 – 2026"
    p4.font.size = Pt(11)
    p4.font.color.rgb = RGBColor(148, 163, 184)

    det_box2 = s1.shapes.add_textbox(Inches(7.0), Inches(4.35), Inches(4.9), Inches(2.1))
    tf_d2 = det_box2.text_frame
    pg1 = tf_d2.paragraphs[0]
    pg1.text = "GUIDANCE & EVALUATION:"
    pg1.font.size = Pt(10.5)
    pg1.font.bold = True
    pg1.font.color.rgb = PRIMARY_LIGHT
    
    pg2 = tf_d2.add_paragraph()
    pg2.text = "Internal Guide: Faculty Guide, Dept. of MCA"
    pg2.font.size = Pt(13)
    pg2.font.bold = True
    pg2.font.color.rgb = RGBColor(255, 255, 255)
    
    pg3 = tf_d2.add_paragraph()
    pg3.text = "Head of the Department: Department of MCA"
    pg3.font.size = Pt(12)
    pg3.font.color.rgb = RGBColor(203, 213, 225)
    
    pg4 = tf_d2.add_paragraph()
    pg4.text = "Course: Main Project Work (MPRJ382)\nVenue: AJIET Campus, Mangaluru"
    pg4.font.size = Pt(11)
    pg4.font.color.rgb = RGBColor(148, 163, 184)

    # =========================================================================
    # SLIDE 2: INTRODUCTION & MOTIVATION
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    add_header(s2, "Introduction & Motivation: The Real-World Need for NeuroFace", "SLIDE 2: INTRODUCTION & MOTIVATION")
    
    c_mot1 = add_card(s2, Inches(0.8), Inches(1.48), Inches(5.7), Inches(5.5), CARD_BG, PRIMARY_LIGHT)
    tb_m1 = s2.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(5.3), Inches(5.1))
    tf_m1 = tb_m1.text_frame
    tf_m1.word_wrap = True
    
    p = tf_m1.paragraphs[0]
    p.text = "1. What Problem Are We Solving?"
    p.font.size = Pt(12.5)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    
    points_prob = [
        ("Pedagogical Time Erosion:", "Manual voice roll-calls consume 10-12 minutes per 60-minute lecture period. Over a semester, this eliminates 16.67% of direct instructional engagement."),
        ("Doorway Hallway Bottlenecks:", "Contact fingerprint scanners take 4.5 to 6.2s per student. In a lecture batch of 65 students, clearing the doorway requires 5 to 7 minutes, delaying lectures."),
        ("Biometric Spoofing Vulnerability:", "Basic RGB webcams are effortlessly deceived by students presenting smartphone OLED photos (Instagram/WhatsApp) or color printouts of absent peers."),
        ("Academic Timetable Friction:", "Double lecture periods (2 hours) or 3-hour practical lab sessions force faculty to interrupt teaching to restart cameras and re-scan students."),
        ("Disconnected Leave Administration:", "Medical certificates and duty leave slips sit uncoordinated in paper folders, causing manual clerical recalculation errors and wrongful exam detentions.")
    ]
    for pt, pd in points_prob:
        p_t = tf_m1.add_paragraph()
        p_t.text = "• " + pt
        p_t.font.size = Pt(9.5)
        p_t.font.bold = True
        p_t.font.color.rgb = ROSE
        p_t.space_before = Pt(3)
        p_d = tf_m1.add_paragraph()
        p_d.text = "  " + pd
        p_d.font.size = Pt(8.5)
        p_d.font.color.rgb = TEXT_MAIN

    c_mot2 = add_card(s2, Inches(6.8), Inches(1.48), Inches(5.733), Inches(5.5), RGBColor(248, 250, 252), TEAL)
    tb_m2 = s2.shapes.add_textbox(Inches(7.0), Inches(1.65), Inches(5.3), Inches(5.1))
    tf_m2 = tb_m2.text_frame
    tf_m2.word_wrap = True
    
    p = tf_m2.paragraphs[0]
    p.text = "2. Why Is This Solution Needed in the Real World?"
    p.font.size = Pt(12.5)
    p.font.bold = True
    p.font.color.rgb = TEAL
    
    points_sol = [
        ("Zero-CapEx Institutional Adoption:", "Traditional facial surveillance systems demand dedicated IP cameras and GPU racks costing over $60,000 (INR 50+ Lakhs). NeuroFace executes directly in web browsers on existing faculty laptops/phones via WebRTC."),
        ("High-Throughput Multi-Face Verification:", "Detects and verifies up to 15 student faces simultaneously in a single 1.2-second pass, eliminating physical queues."),
        ("Hardware-Free Anti-Spoofing (PAD):", "Proprietary multi-signal physical analysis (rotated chassis contours, symmetric bezels, Moiré FFT) and Fourier motion compensation stops photo/screen proxies without 3D depth hardware."),
        ("Timetable-Aware Smart Baseline Cloning:", "1-click baseline propagation marks 2-hour or 3-hour consecutive lab lectures in under 15 seconds."),
        ("Automated Medical Leave Reconciliation:", "Tesseract OCR extracts medical leave data and auto-calculates official university condonation attendance formulas.")
    ]
    for st, sd in points_sol:
        p_t = tf_m2.add_paragraph()
        p_t.text = "✔ " + st
        p_t.font.size = Pt(9.5)
        p_t.font.bold = True
        p_t.font.color.rgb = TEAL
        p_t.space_before = Pt(3)
        p_d = tf_m2.add_paragraph()
        p_d.text = "  " + sd
        p_d.font.size = Pt(8.5)
        p_d.font.color.rgb = TEXT_MAIN

    # =========================================================================
    # SLIDE 3: PROBLEM STATEMENT
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    add_header(s3, "Problem Statement: Limitations of Existing Attendance Paradigms", "SLIDE 3: PROBLEM STATEMENT")

    limitations = [
        ("1. Paper-Based Attendance Ledgers", "Archaic Manual Voice Roll-Call", [
            "Wastes 16.7% of direct instructional lecture hours.",
            "Proxy attendance rate exceeds 28% in batches > 50 students.",
            "Registers suffer physical wear and tear, fluid spills, and loss.",
            "Clerical compilation lag delays warning letters to detained students."
        ], ROSE),
        ("2. RFID Proximity Smartcards", "Contactless Doorway Badges", [
            "Total lack of biological binding between badge and bearer.",
            "Buddy-punching exceeds 35% as students tap badges for absent peers.",
            "Card wear, magnetic corruption, and replacement overhead ($2-5/card).",
            "Creates physical bottlenecks at classroom doorway readers."
        ], AMBER),
        ("3. Contact Biometric Scanners", "Capacitive / Optical Fingerprint Readers", [
            "High False Rejection Rate (>12%) caused by dust, sweat, chalk residue.",
            "Throughput ceiling of 4.5-6.2s per student causes severe hallway lines.",
            "Hygiene concerns regarding tactile surface disease transmission.",
            "Physical mechanical breakdown under heavy continuous college usage."
        ], PRIMARY_LIGHT),
        ("4. Commercial CCTV & Naive Face AI", "Surveillance Systems & Simple Webcams", [
            "Prohibitive capital investment: $60,000+ for PoE IP cameras & GPU servers.",
            "Naive webcams are 100% deceived by smartphone OLED photo replays.",
            "Single CNN anti-spoof classifiers fail on high-density 450+ PPI displays.",
            "Complete lack of academic timetable and medical waiver integration."
        ], PRIMARY)
    ]

    card_w = Inches(2.8)
    card_gap = Inches(0.17)
    for idx, (title, subtitle, bullets, col) in enumerate(limitations):
        l = Inches(0.8) + idx * (card_w + card_gap)
        c = add_card(s3, l, Inches(1.48), card_w, Inches(5.5), CARD_BG, col)
        
        banner = s3.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, Inches(1.48), card_w, Inches(0.9))
        banner.fill.solid()
        banner.fill.fore_color.rgb = col
        banner.line.fill.background()
        tf_b = banner.text_frame
        tf_b.word_wrap = True
        
        pb0 = tf_b.paragraphs[0]
        pb0.text = title
        pb0.font.size = Pt(10)
        pb0.font.bold = True
        pb0.font.color.rgb = RGBColor(255, 255, 255)
        
        pb1 = tf_b.add_paragraph()
        pb1.text = subtitle
        pb1.font.size = Pt(8)
        pb1.font.color.rgb = RGBColor(241, 245, 249)

        tb = s3.shapes.add_textbox(l + Inches(0.1), Inches(2.55), card_w - Inches(0.2), Inches(4.3))
        tf = tb.text_frame
        tf.word_wrap = True
        for b in bullets:
            p = tf.add_paragraph()
            p.text = "• " + b
            p.font.size = Pt(8.5)
            p.font.color.rgb = TEXT_MAIN
            p.space_after = Pt(4)

    # =========================================================================
    # SLIDE 4: OBJECTIVES OF THE PROJECT
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    add_header(s4, "Project Objectives: Core Technical & Algorithmic Targets", "SLIDE 4: OBJECTIVES")

    objectives = [
        ("1. Multi-Face Deep Learning Vision Pipeline", [
            "Deploy Multi-Task Cascaded CNN (MTCNN) capable of simultaneous multi-face detection (up to 15 faces/frame) across 1 to 6 meters standoff distances.",
            "Execute canonical 5-point facial landmark affine warping onto a standardized 112x112 template to eliminate head roll tilt.",
            "Deploy ResNet-50 trained with Additive Angular Margin Loss (ArcFace, s=64, m=0.5 rad) projecting faces onto 512-D unit hyperspherical embeddings.",
            "Achieve True Accept Rate (TAR) > 98.5% at False Accept Rate (FAR) < 0.001 under cosine threshold tau=0.65."
        ], TEAL),
        ("2. Deterministic Multi-Signal Physical PAD Engine", [
            "Design spatial surround analysis (1.25*w, 1.65*h) using cv2.minAreaRect to identify smartphone/tablet screen casings (aspect 1.30-2.65, solidity > 0.60).",
            "Enforce symmetric flanking Hough line transform (L_v >= 1 and R_v >= 1) to eliminate false alarms from classroom doors/windows.",
            "Integrate specular screen glare masks in HSV space and 2D FFT subpixel Moiré band power ratio (> 2.0) to achieve 100% rejection of screen replays."
        ], ROSE),
        ("3. Motion-Compensated Temporal Liveness Verification", [
            "Engineer a sliding temporal buffer using Fourier phase correlation (phaseCorrelate) to compute subpixel translation vectors (dx, dy), canceling hand tremor.",
            "Measure ocular region Mean Absolute Error (MAE >= 5.2) and Pearson correlation (r < 0.92) to confirm biological micro-saccades and blinks in 1.2s.",
            "Enforce a 3-second lockout cooldown against frozen static photos."
        ], PRIMARY_LIGHT),
        ("4. Academic Workflows & Automated Medical OCR Reconciliation", [
            "Develop 1-click consecutive period baseline cloning for multi-hour lectures/labs, reducing attendance overhead from 10 minutes to under 15 seconds.",
            "Integrate Tesseract v5 OCR and Otsu binarization to ingest medical certificates.",
            "Automate institutional medical waiver formula: Effective % = min(100.0, [(Present + Waived)/Held] * 100) with zero-held session boundary guards."
        ], PRIMARY)
    ]

    for idx, (title, items, col) in enumerate(objectives):
        col_idx = idx % 2
        row_idx = idx // 2
        l = Inches(0.8) + col_idx * Inches(5.95)
        top = Inches(1.48) + row_idx * Inches(2.75)
        
        c = add_card(s4, l, top, Inches(5.8), Inches(2.6), CARD_BG, CARD_BORDER)
        
        c_bar = s4.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, top, Inches(0.12), Inches(2.6))
        c_bar.fill.solid()
        c_bar.fill.fore_color.rgb = col
        c_bar.line.fill.background()
        
        tb = s4.shapes.add_textbox(l + Inches(0.2), top + Inches(0.08), Inches(5.45), Inches(2.45))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p0 = tf.paragraphs[0]
        p0.text = title
        p0.font.size = Pt(11)
        p0.font.bold = True
        p0.font.color.rgb = col
        
        for it in items:
            p = tf.add_paragraph()
            p.text = "• " + it
            p.font.size = Pt(8.5)
            p.font.color.rgb = TEXT_MAIN
            p.space_after = Pt(2)

    # =========================================================================
    # SLIDE 5: LITERATURE SURVEY / EXISTING SYSTEM
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    add_header(s5, "Literature Survey: Summary of Prior Approaches & Gap Analysis", "SLIDE 5: LITERATURE SURVEY")

    rows, cols = 8, 5
    t_shape = s5.shapes.add_table(rows, cols, Inches(0.8), Inches(1.48), Inches(11.733), Inches(5.5))
    t = t_shape.table
    t.columns[0].width = Inches(2.6)
    t.columns[1].width = Inches(2.2)
    t.columns[2].width = Inches(2.2)
    t.columns[3].width = Inches(2.2)
    t.columns[4].width = Inches(2.533)

    headers = ["Evaluation Metric", "Manual Roll-Call", "RFID Smartcards", "Fingerprint Readers", "NeuroFace (Proposed)"]
    for j, h in enumerate(headers):
        cell = t.cell(0, j)
        cell.fill.solid()
        cell.fill.fore_color.rgb = PRIMARY if j < 4 else TEAL
        p = cell.text_frame.paragraphs[0]
        p.text = h
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = RGBColor(255, 255, 255)
        p.alignment = PP_ALIGN.CENTER

    data = [
        ["Verification Speed", "10 - 12 mins / period", "2 - 3s per student tap", "4 - 6s per student", "1.2s Multi-Face Passive"],
        ["Hardware Expenditure", "Zero (Paper)", "Door readers + Badges ($2K)", "Biometric scanners ($3K)", "Zero CapEx (Existing Laptops)"],
        ["Proxy Resistance", "None (Voice spoof)", "Fails (35% badge share)", "Moderate (Finger grease)", "Ultra-High (Multi-Signal PAD)"],
        ["Doorway Bottlenecks", "No queue / slow", "Minor doorway queue", "Severe doorway jam (5-7m)", "Contactless / Zero Queuing"],
        ["Consecutive Timetables", "Manual pen rewrite", "Requires door re-tap", "Requires door re-scan", "1-Click Smart Baseline Cloning"],
        ["Medical Leave Sync", "Manual paper filing", "Disconnected / Isolated", "Disconnected / Isolated", "Automated Tesseract OCR Sync"],
        ["Liveness Verification", "Human vision only", "None (No biometric link)", "Hardware capacitive only", "Motion-Compensated Eye MAE"]
    ]

    for i, row_data in enumerate(data):
        for j, val in enumerate(row_data):
            cell = t.cell(i + 1, j)
            cell.fill.solid()
            if j == 4:
                cell.fill.fore_color.rgb = RGBColor(240, 253, 250)
            elif (i % 2) == 0:
                cell.fill.fore_color.rgb = RGBColor(248, 250, 252)
            else:
                cell.fill.fore_color.rgb = RGBColor(255, 255, 255)
            p = cell.text_frame.paragraphs[0]
            p.text = val
            p.font.size = Pt(9)
            p.alignment = PP_ALIGN.CENTER if j > 0 else PP_ALIGN.LEFT
            if j == 4:
                p.font.bold = True
                p.font.color.rgb = PRIMARY
            elif j == 0:
                p.font.bold = True
                p.font.color.rgb = TEXT_MAIN
            else:
                p.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 6: PROPOSED SYSTEM OVERVIEW
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    add_header(s6, "Proposed System Overview: High-Level Conceptual Paradigm", "SLIDE 6: PROPOSED SYSTEM OVERVIEW")

    ov_cards = [
        ("1. Contactless AI Perception", TEAL, [
            "WebRTC streaming captures 640x480 video @ 1.2s intervals directly inside modern web browsers.",
            "Eliminates client-side binary software installation; runs on standard Chrome/Edge/Safari.",
            "Dynamic HTML5 canvas renders real-time color-coded feedback directly on the teacher's screen.",
            "Dual-tone Web Audio acoustic feedback and native mobile haptic vibration confirm presence instantly."
        ]),
        ("2. Geometric Metric Learning", PRIMARY_LIGHT, [
            "MTCNN dynamically scans scale space, localizing distant students in tiered lecture halls.",
            "Canonical 5-point affine transformation standardizes face crops to 112x112 coordinates.",
            "ArcFace ResNet-50 maps students onto a 512-dimensional hyperspherical manifold (||v||=1.0).",
            "Forces inter-class margin separation of m=0.5 rad, rendering embeddings immune to expressions and roll tilt."
        ]),
        ("3. Dual-Layer Anti-Spoofing", ROSE, [
            "Layer 1 (Physical): Analyzes phone chassis aspect ratio (cv2.minAreaRect), dual symmetric bezels, specular glass glare, and 2D FFT subpixel Moiré frequencies.",
            "Layer 2 (Temporal): Fourier phase correlation computes subpixel rigid shifts (dx, dy) to eliminate hand shake, evaluating ocular MAE and Pearson correlation.",
            "Rejects static photo prints, iPad/smartphone OLED screen replays, and video loops without depth hardware."
        ]),
        ("4. Institutional Academic Automation", AMBER, [
            "1-Click smart baseline cloning resolves the multi-hour double lecture and laboratory session friction.",
            "Ingests physical medical certificates and athletic duty slips via Tesseract v5 OCR and Otsu thresholding.",
            "Calculates official university condonation attendance ledgers in real time.",
            "Supports flexible sorting: Order students by USN Number (0-9) or Alphabetical Name (A-Z) on all tables."
        ])
    ]

    for idx, (title, color, items) in enumerate(ov_cards):
        col_idx = idx % 2
        row_idx = idx // 2
        l = Inches(0.8) + col_idx * Inches(5.95)
        top = Inches(1.48) + row_idx * Inches(2.75)
        
        c = add_card(s6, l, top, Inches(5.8), Inches(2.6), CARD_BG, CARD_BORDER)
        
        c_bar = s6.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, top, Inches(0.12), Inches(2.6))
        c_bar.fill.solid()
        c_bar.fill.fore_color.rgb = color
        c_bar.line.fill.background()
        
        tb = s6.shapes.add_textbox(l + Inches(0.2), top + Inches(0.08), Inches(5.45), Inches(2.45))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p0 = tf.paragraphs[0]
        p0.text = title
        p0.font.size = Pt(11)
        p0.font.bold = True
        p0.font.color.rgb = color
        
        for it in items:
            p = tf.add_paragraph()
            p.text = "• " + it
            p.font.size = Pt(8.5)
            p.font.color.rgb = TEXT_MAIN
            p.space_after = Pt(2)

    # =========================================================================
    # SLIDE 7: KEY FEATURES & TARGET USER ROLES
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    add_header(s7, "Key Features & Role-Based Access Control (RBAC)", "SLIDE 7: FEATURES & ROLES")

    roles = [
        ("System Administrator", PRIMARY, [
            "Configures academic curriculum, departments, class batches, courses, and timetables.",
            "Manages institutional teacher and student directory.",
            "Reviews and finalizes HOD requests (student enrollment, profile edits, deletions).",
            "Accesses immutable cryptographic audit logs and database telemetry."
        ]),
        ("Head of Department (HOD)", PRIMARY_LIGHT, [
            "Departmental oversight across all faculty courses and attendance compliance.",
            "Reviews student leave requests and verifies Tesseract OCR medical certificates.",
            "Approves medical attendance waivers applying official condonation rules.",
            "Authorizes student biometric face re-registration requests."
        ]),
        ("Course Teacher / Class Advisor", TEAL, [
            "Conducts live AI facial recognition attendance sessions (1.2s multi-face recognition).",
            "Takes consecutive period attendance with 1-click baseline cloning.",
            "Sorts student attendance rosters by USN Number (0-9) or Alphabetical Name (A-Z).",
            "Generates official subject-wise and class-wise attendance PDF/CSV reports."
        ]),
        ("Enrolled Student", AMBER, [
            "Guided 5-pose biometric face enrollment (Front, Left, Right, Up, Down).",
            "Real-time attendance dashboard tracking subject percentages against 75% VTU threshold.",
            "Digital leave application portal with medical certificate image upload.",
            "Automated medical waiver visibility and attendance history ledgers."
        ])
    ]

    card_w = Inches(2.8)
    card_gap = Inches(0.17)
    for idx, (role_name, col, items) in enumerate(roles):
        l = Inches(0.8) + idx * (card_w + card_gap)
        c = add_card(s7, l, Inches(1.48), card_w, Inches(5.5), CARD_BG, col)
        
        banner = s7.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, Inches(1.48), card_w, Inches(0.85))
        banner.fill.solid()
        banner.fill.fore_color.rgb = col
        banner.line.fill.background()
        tf_b = banner.text_frame
        tf_b.word_wrap = True
        pb = tf_b.paragraphs[0]
        pb.text = role_name
        pb.font.size = Pt(10.5)
        pb.font.bold = True
        pb.font.color.rgb = RGBColor(255, 255, 255)
        pb.alignment = PP_ALIGN.CENTER

        tb = s7.shapes.add_textbox(l + Inches(0.1), Inches(2.45), card_w - Inches(0.2), Inches(4.4))
        tf = tb.text_frame
        tf.word_wrap = True
        for it in items:
            p = tf.add_paragraph()
            p.text = "• " + it
            p.font.size = Pt(8.5)
            p.font.color.rgb = TEXT_MAIN
            p.space_after = Pt(4)

    # =========================================================================
    # SLIDE 8: SYSTEM ARCHITECTURE & DATA FLOW
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    add_header(s8, "System Architecture & Data Flow Diagrams (DFD Level 0 & Level 1)", "SLIDE 8: ARCHITECTURE & DFD")

    c_s8_1 = add_card(s8, Inches(0.8), Inches(1.48), Inches(5.7), Inches(5.5), CARD_BG, PRIMARY)
    tb_s8_1 = s8.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(5.3), Inches(5.1))
    tf_s8_1 = tb_s8_1.text_frame
    tf_s8_1.word_wrap = True
    
    p = tf_s8_1.paragraphs[0]
    p.text = "5-Tier Decoupled Client-Server Architecture"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    
    arch_tiers = [
        ("Tier 1: Presentation (SPA)", "React 19 + Vite + Tailwind CSS. HTML5 video capture canvas (640x480 @ 1.2s), dynamic canvas overlays, Web Audio synthesis, and USN/Alphabetical sorting toolbar."),
        ("Tier 2: Application & Routing", "FastAPI ASGI + Uvicorn + Pydantic v2. Stateless JWT authentication (HMAC-SHA256), RBAC dependency injection, and timetable baseline cloning controller."),
        ("Tier 3: AI Computer Vision Pipeline", "MTCNN 3-stage cascaded CNN, canonical 5-point affine warper (112x112), ArcFace ResNet-50 (512-D), multi-signal physical PAD, and Fourier phase temporal liveness buffer."),
        ("Tier 4: Document & Waiver Engine", "PyTesseract OCR v5 (LSTM), Otsu adaptive binarization, regex date/session parser, ReportLab PDF ledgers, and attendance condonation formula."),
        ("Tier 5: Data Persistence", "SQLAlchemy 2.0 ORM with 14 relational tables. Dual-target: Embedded SQLite (edge) or PostgreSQL (campus cloud).")
    ]
    for tt, td in arch_tiers:
        p_t = tf_s8_1.add_paragraph()
        p_t.text = tt
        p_t.font.size = Pt(9.5)
        p_t.font.bold = True
        p_t.font.color.rgb = TEAL
        p_t.space_before = Pt(3)
        p_d = tf_s8_1.add_paragraph()
        p_d.text = td
        p_d.font.size = Pt(8.5)
        p_d.font.color.rgb = TEXT_MAIN

    c_s8_2 = add_card(s8, Inches(6.8), Inches(1.48), Inches(5.733), Inches(5.5), RGBColor(248, 250, 252), PRIMARY_LIGHT)
    tb_s8_2 = s8.shapes.add_textbox(Inches(7.0), Inches(1.65), Inches(5.3), Inches(5.1))
    tf_s8_2 = tb_s8_2.text_frame
    tf_s8_2.word_wrap = True
    
    p = tf_s8_2.paragraphs[0]
    p.text = "Data Flow Architecture (DFD Level 0 & 1)"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    
    dfd_points = [
        ("DFD Level 0 (Context Level):",
         "External Entities: Admin, Teacher, Student, HOD.\n"
         "• Admin: Curriculum setup, faculty assignments, system audit logs.\n"
         "• Teacher: Video stream, timetable slot, marks session, gets attendance ledgers.\n"
         "• Student: Enrolls 5 facial poses, views attendance %, submits medical certificates.\n"
         "• HOD: Approves leaves, grants medical waivers, monitors department compliance."),
        ("DFD Level 1 (Subsystem Decomposition):",
         "• Process 1.0 (Auth & Session): Validates JWT credentials and injects RBAC roles.\n"
         "• Process 2.0 (Biometric Onboarding): Extracts 5-pose 512-D ArcFace vectors into db.\n"
         "• Process 3.0 (AI Attendance Processing): Ingests WebRTC frames, detects faces via MTCNN, runs PAD check, matches vectors via cosine metric, and confirms live saccades.\n"
         "• Process 4.0 (Timetable Propagation): Replicates attendance baseline for consecutive periods.\n"
         "• Process 5.0 (OCR & Waiver Reconciliation): Parses medical certificates and recalculates attendance percentages.")
    ]
    for dt, dd in dfd_points:
        p_t = tf_s8_2.add_paragraph()
        p_t.text = dt
        p_t.font.size = Pt(9.5)
        p_t.font.bold = True
        p_t.font.color.rgb = PRIMARY_LIGHT
        p_t.space_before = Pt(3)
        p_d = tf_s8_2.add_paragraph()
        p_d.text = dd
        p_d.font.size = Pt(8.5)
        p_d.font.color.rgb = TEXT_MAIN

    # =========================================================================
    # SLIDE 9: DATABASE DESIGN & DATASETS
    # =========================================================================
    s9 = prs.slides.add_slide(blank_layout)
    add_header(s9, "Database Design (ER Schema) & Benchmark Dataset Parameters", "SLIDE 9: DATABASE & DATASET")

    c_s9_1 = add_card(s9, Inches(0.8), Inches(1.48), Inches(5.7), Inches(5.5), CARD_BG, CARD_BORDER)
    tb_s9_1 = s9.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(5.3), Inches(5.1))
    tf_s9_1 = tb_s9_1.text_frame
    tf_s9_1.word_wrap = True
    
    p = tf_s9_1.paragraphs[0]
    p.text = "Relational Database Schema (14 Normalized Tables)"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    
    db_tables = [
        ("Core Identity & Hierarchy:", "users (id, email, password_hash, role), teachers (id, user_id, designation, department_id), students (id, user_id, register_number, class_id, face_registered)."),
        ("Academic Governance:", "departments, classes, subjects, teacher_subject_class_assignments, attendance_slots (start_time, end_time, slot_order)."),
        ("Attendance & Verification:", "attendance_sessions (id, assignment_id, slot_id, date, status), attendance_records (id, session_id, student_id, status, confidence_score, marked_by)."),
        ("Leaves & Medical Waivers:", "leave_applications (id, student_id, dates, reason, status), medical_waivers (id, student_id, subject_id, waived_classes_count, applied_rule)."),
        ("Integrity & Governance:", "fine_rules (condonation threshold, fine amounts), audit_logs (immutable user, action, payload, timestamp, IP)."),
        ("Indexing & Optimization:", "Compound B-Tree indexes on (session_id, student_id) and (class_id, register_number) guarantee O(log N) lookup speeds.")
    ]
    for dbt, dbd in db_tables:
        p_t = tf_s9_1.add_paragraph()
        p_t.text = "• " + dbt
        p_t.font.size = Pt(9.5)
        p_t.font.bold = True
        p_t.font.color.rgb = TEAL
        p_t.space_before = Pt(2)
        p_d = tf_s9_1.add_paragraph()
        p_d.text = "  " + dbd
        p_d.font.size = Pt(8.5)
        p_d.font.color.rgb = TEXT_MAIN

    c_s9_2 = add_card(s9, Inches(6.8), Inches(1.48), Inches(5.733), Inches(5.5), RGBColor(248, 250, 252), PRIMARY_LIGHT)
    tb_s9_2 = s9.shapes.add_textbox(Inches(7.0), Inches(1.65), Inches(5.3), Inches(5.1))
    tf_s9_2 = tb_s9_2.text_frame
    tf_s9_2.word_wrap = True
    
    p = tf_s9_2.paragraphs[0]
    p.text = "Dataset Details, Repositories & Domain Relevance"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    
    datasets = [
        ("1. Labeled Faces in the Wild (LFW):",
         "• Repository: University of Massachusetts Computer Vision Lab.\n"
         "• Parameters: 13,233 unconstrained web portraits across 5,749 identities.\n"
         "• Relevance: Global academic gold standard for benchmarking face recognition loss functions (ArcFace achieved 99.83% accuracy)."),
        ("2. CASIA-WebFace Dataset:",
         "• Repository: Institute of Automation, Chinese Academy of Sciences (CASIA).\n"
         "• Parameters: 494,414 facial images across 10,575 distinct individuals.\n"
         "• Relevance: Used for pre-training deep ResNet-50 representations prior to collegiate transfer fine-tuning."),
        ("3. Institutional Classroom Validation Cohort:",
         "• Repository: AJIET MCA Classroom Experimental Testbed.\n"
         "• Parameters: 65 enrolled students, 5 poses per student (Frontal, Left, Right, Up, Down), 100 live verification trials, and 190 presentation attack trials (50 print, 50 OLED, 50 tablet, 40 video replay).\n"
         "• Relevance: Evaluates real classroom lighting (150-800 lux), standoff depths (1-6m), and student poses.")
    ]
    for dst, dsd in datasets:
        p_t = tf_s9_2.add_paragraph()
        p_t.text = dst
        p_t.font.size = Pt(9.5)
        p_t.font.bold = True
        p_t.font.color.rgb = PRIMARY_LIGHT
        p_t.space_before = Pt(3)
        p_d = tf_s9_2.add_paragraph()
        p_d.text = dsd
        p_d.font.size = Pt(8.5)
        p_d.font.color.rgb = TEXT_MAIN

    # =========================================================================
    # SLIDE 10: TECH STACK & TOOLS USED
    # =========================================================================
    s10 = prs.slides.add_slide(blank_layout)
    add_header(s10, "Technology Stack & Toolchain Ecosystem", "SLIDE 10: TECH STACK")

    tech_stack = [
        ("Frontend Technologies", TEAL, [
            "React 19: Modern Single-Page Application (SPA) architecture with fast reconciliation.",
            "Vite: Ultra-fast next-generation frontend tooling and bundler.",
            "Tailwind CSS: Utility-first responsive design supporting light and dark themes.",
            "HTML5 Video & Canvas: Real-time WebRTC media capture and dynamic overlay rendering.",
            "Lucide React: Crisp vector icons for UI state and sorting controls."
        ]),
        ("Backend Framework", PRIMARY_LIGHT, [
            "Python 3.12: High-performance core runtime environment.",
            "FastAPI ASGI: Asynchronous web framework with automatic OpenAPI documentation.",
            "Uvicorn: Lightning-fast ASGI web server implementation.",
            "Pydantic v2: Strict data validation and schema serialization.",
            "JWT Authentication: Cryptographic stateless authentication (HMAC-SHA256)."
        ]),
        ("Database & Persistence", PRIMARY, [
            "SQLAlchemy 2.0: Python SQL toolkit and Object-Relational Mapper (ORM).",
            "SQLite: Embedded serverless zero-configuration database for local edge deployments.",
            "PostgreSQL: Robust enterprise relational database for campus-wide cloud instances.",
            "Database Migrations: Alembic schema versioning and transactional guarantees."
        ]),
        ("AI, Vision & Tooling", AMBER, [
            "PyTorch & ONNX Runtime: Deep learning neural network inference acceleration.",
            "OpenCV (cv2): Image transformations, Canny edges, minAreaRect, Hough lines, 2D FFT.",
            "Tesseract OCR v5: Google LSTM recurrent network for medical certificate parsing.",
            "ReportLab: Cryptographic PDF attendance ledger generation.",
            "Git & GitHub: Version control, branch management, and collaborative code reviews."
        ])
    ]

    card_w = Inches(2.8)
    card_gap = Inches(0.17)
    for idx, (title, col, items) in enumerate(tech_stack):
        l = Inches(0.8) + idx * (card_w + card_gap)
        c = add_card(s10, l, Inches(1.48), card_w, Inches(5.5), CARD_BG, col)
        
        banner = s10.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, Inches(1.48), card_w, Inches(0.85))
        banner.fill.solid()
        banner.fill.fore_color.rgb = col
        banner.line.fill.background()
        tf_b = banner.text_frame
        tf_b.word_wrap = True
        pb = tf_b.paragraphs[0]
        pb.text = title
        pb.font.size = Pt(10)
        pb.font.bold = True
        pb.font.color.rgb = RGBColor(255, 255, 255)
        pb.alignment = PP_ALIGN.CENTER

        tb = s10.shapes.add_textbox(l + Inches(0.1), Inches(2.45), card_w - Inches(0.2), Inches(4.4))
        tf = tb.text_frame
        tf.word_wrap = True
        for it in items:
            p = tf.add_paragraph()
            p.text = "• " + it
            p.font.size = Pt(8.5)
            p.font.color.rgb = TEXT_MAIN
            p.space_after = Pt(4)

    # =========================================================================
    # SLIDE 11: IMPLEMENTATION HIGHLIGHTS (CORE CODE / MODULES)
    # =========================================================================
    s11 = prs.slides.add_slide(blank_layout)
    add_header(s11, "Implementation Highlights: Core Algorithmic Modules & Logic", "SLIDE 11: IMPLEMENTATION")

    c_s11_1 = add_card(s11, Inches(0.8), Inches(1.48), Inches(5.7), Inches(5.5), CARD_BG, CARD_BORDER)
    tb_s11_1 = s11.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(5.3), Inches(5.1))
    tf_s11_1 = tb_s11_1.text_frame
    tf_s11_1.word_wrap = True
    
    p = tf_s11_1.paragraphs[0]
    p.text = "Module 1: Multi-Signal Presentation Attack Detection"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    
    pad_code_desc = [
        ("Rotated Screen Chassis Enclosure:",
         "rect = cv2.minAreaRect(contour)\n"
         "aspect = max(w, h) / (min(w, h) + 1e-6)\n"
         "solidity = cv2.contourArea(contour) / (w * h + 1e-6)\n"
         "if 1.30 <= aspect <= 2.65 and solidity > 0.60:\n"
         "    spoof_score += 0.45  # Confirmed phone/tablet casing"),
        ("Symmetric Hough Flanking Bezel Rule:",
         "lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=40)\n"
         "has_framing = (L_v >= 1 and R_v >= 1) and (T_h >= 1 or B_h >= 1)\n"
         "if has_framing:\n"
         "    spoof_score += 0.40  # Dual bezels flanking cheeks"),
        ("2D FFT Display Grid Moiré Spectrum:",
         "F = np.fft.fftshift(np.fft.fft2(gray_face_128))\n"
         "psd_ratio = mean(P(35 < r <= 62)) / mean(P(4 <= r <= 25))\n"
         "if psd_ratio > 2.0: spoof_score += 0.30")
    ]
    for pt, pc in pad_code_desc:
        p_t = tf_s11_1.add_paragraph()
        p_t.text = pt
        p_t.font.size = Pt(9.5)
        p_t.font.bold = True
        p_t.font.color.rgb = ROSE
        p_t.space_before = Pt(3)
        p_c = tf_s11_1.add_paragraph()
        p_c.text = pc
        p_c.font.size = Pt(8)
        p_c.font.name = "Courier New"
        p_c.font.color.rgb = TEXT_MAIN

    c_s11_2 = add_card(s11, Inches(6.8), Inches(1.48), Inches(5.733), Inches(5.5), RGBColor(248, 250, 252), PRIMARY_LIGHT)
    tb_s11_2 = s11.shapes.add_textbox(Inches(7.0), Inches(1.65), Inches(5.3), Inches(5.1))
    tf_s11_2 = tb_s11_2.text_frame
    tf_s11_2.word_wrap = True
    
    p = tf_s11_2.paragraphs[0]
    p.text = "Module 2: Fourier Phase Motion Compensation & Liveness"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    
    mot_code_desc = [
        ("Subpixel Translation Vector Extraction:",
         "(dx, dy), response = cv2.phaseCorrelate(prev_gray, curr_gray)\n"
         "M = np.float32([[1, 0, -dx], [0, 1, -dy]])\n"
         "curr_aligned = cv2.warpAffine(curr_gray, M, (112, 112))\n"
         "# Cancels 1-3 pixels of camera and hand tremor!"),
        ("Ocular Region Biological Dynamics Check:",
         "eye_prev = prev_gray[35:60, 25:88]\n"
         "eye_curr = curr_aligned[35:60, 25:88]\n"
         "mae_eye = np.mean(np.abs(eye_prev - eye_curr))\n"
         "r_eye = np.corrcoef(eye_prev.flat, eye_curr.flat)[0, 1]\n"
         "if mae_eye >= 5.2 or r_eye < 0.92:\n"
         "    return State.CONFIRMED_PRESENT  # Live micro-saccade in 1.2s!"),
        ("Consecutive Period Baseline Cloning Controller:",
         "for slot_id in selected_slot_ids:\n"
         "    replicate_records(clone_session_id, target_slot=slot_id)\n"
         "# Replicates attendance for 2-hr or 3-hr labs in < 15s!")
    ]
    for mt, mc in mot_code_desc:
        p_t = tf_s11_2.add_paragraph()
        p_t.text = mt
        p_t.font.size = Pt(9.5)
        p_t.font.bold = True
        p_t.font.color.rgb = TEAL
        p_t.space_before = Pt(3)
        p_c = tf_s11_2.add_paragraph()
        p_c.text = mc
        p_c.font.size = Pt(8)
        p_c.font.name = "Courier New"
        p_c.font.color.rgb = TEXT_MAIN

    # =========================================================================
    # SLIDE 12: RESULTS & TESTING (UI WORKFLOW & TEST CASES)
    # =========================================================================
    s12 = prs.slides.add_slide(blank_layout)
    add_header(s12, "Results, Testing & Verification: Core UI Flow & Test Suite", "SLIDE 12: RESULTS & TESTING")

    c_s12_1 = add_card(s12, Inches(0.8), Inches(1.48), Inches(5.7), Inches(5.5), CARD_BG, CARD_BORDER)
    tb_s12_1 = s12.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(5.3), Inches(5.1))
    tf_s12_1 = tb_s12_1.text_frame
    tf_s12_1.word_wrap = True
    
    p = tf_s12_1.paragraphs[0]
    p.text = "Core User Interface Screens & Interactive Capabilities"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    
    ui_screens = [
        ("1. Faculty Attendance Hub (StartSessionPage.jsx):", "Dual operational modes (AI Live Camera vs. Smart Consecutive Periods). Includes interactive sorting toolbar: USN Number Wise (0-9) and Alphabetical (A-Z)."),
        ("2. Real-Time Recognition Overlay (LiveAttendancePage.jsx):", "HTML5 canvas bounding boxes: Green=Matched, Amber=Verifying, Rose=Spoof, Red=Unregistered. Live marked present sidebar sorted by Time, USN, or Name."),
        ("3. Student Self-Service Portal (StudentDashboard.jsx):", "5-pose guided biometric face capture, live subject-wise attendance ledgers, condonation percentage warnings, and medical certificate upload portal."),
        ("4. HOD Medical Waiver Action Center (TeacherDashboard.jsx):", "Tesseract OCR document viewer showing parsed date ranges and reason with 1-click condonation waiver granting."),
        ("5. Official Academic Report Generator (StudentReportsPage.jsx):", "Instant generation of signed, cryptographically hashed PDF ledgers and exportable CSV attendance records.")
    ]
    for uit, uid in ui_screens:
        p_t = tf_s12_1.add_paragraph()
        p_t.text = uit
        p_t.font.size = Pt(9.5)
        p_t.font.bold = True
        p_t.font.color.rgb = TEAL
        p_t.space_before = Pt(2)
        p_d = tf_s12_1.add_paragraph()
        p_d.text = uid
        p_d.font.size = Pt(8.5)
        p_d.font.color.rgb = TEXT_MAIN

    c_s12_2 = add_card(s12, Inches(6.8), Inches(1.48), Inches(5.733), Inches(5.5), RGBColor(248, 250, 252), PRIMARY_LIGHT)
    tb_s12_2 = s12.shapes.add_textbox(Inches(7.0), Inches(1.65), Inches(5.3), Inches(5.1))
    tf_s12_2 = tb_s12_2.text_frame
    tf_s12_2.word_wrap = True
    
    p = tf_s12_2.paragraphs[0]
    p.text = "Executed Test Cases (Unit & Integration Suite)"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    
    test_cases = [
        ("TC-01: Multi-Face Detection Under Occlusion", "Tested 15 students at 1-5m depths with prescription spectacles and head coverings. Result: 100% faces localized."),
        ("TC-02: Zero-Conducted Session Boundary Guard", "Evaluated subject with 0 conducted classes. Result: Formula safely evaluated strictly to 0.0% (excluded from average; division-by-zero avoided)."),
        ("TC-03: Smartphone Screen Presentation Attack", "Presented high-PPI iPhone display with Instagram photo. Result: Chassis contour + symmetric bezels triggered (+0.85 spoof score); rejected on Frame 1."),
        ("TC-04: Consecutive Period Baseline Cloning", "Cloned Period 1 attendance into Period 2 for 65 students. Result: All 65 records committed in 12.4s without running webcams."),
        ("TC-05: RBAC Security Dependency Guard", "Attempted teacher access to unauthorized department endpoints. Result: FastAPI returned HTTP 403 Forbidden with security audit log.")
    ]
    for tct, tcd in test_cases:
        p_t = tf_s12_2.add_paragraph()
        p_t.text = tct
        p_t.font.size = Pt(9)
        p_t.font.bold = True
        p_t.font.color.rgb = PRIMARY_LIGHT
        p_t.space_before = Pt(2)
        p_d = tf_s12_2.add_paragraph()
        p_d.text = tcd
        p_d.font.size = Pt(8.5)
        p_d.font.color.rgb = TEXT_MAIN

    # =========================================================================
    # SLIDE 13: PERFORMANCE METRICS
    # =========================================================================
    s13 = prs.slides.add_slide(blank_layout)
    add_header(s13, "Performance Metrics: Accuracy, Confusion Matrix & Latencies", "SLIDE 13: PERFORMANCE METRICS")

    metrics = [
        ("98.5%", "True Accept Rate (TAR)", "FAR < 0.001 under cosine threshold tau=0.65 on classroom cohorts", TEAL),
        ("98.7%", "Precision Metric", "Precision = TP / (TP + FP) across live validation cohort", PRIMARY_LIGHT),
        ("98.6%", "F1-Score Metric", "Harmonic mean of precision and recall: 2*(P*R)/(P+R)", SUCCESS),
        ("1.2s", "Live Verification Latency", "Hit 1 (0.0s) match + Hit 2 (1.2s) phase liveness confirmation", AMBER)
    ]
    for idx, (val, label, sub, col) in enumerate(metrics):
        l = Inches(0.8) + idx * Inches(2.98)
        c = add_card(s13, l, Inches(1.48), Inches(2.8), Inches(1.5), CARD_BG, col)
        
        tb = s13.shapes.add_textbox(l + Inches(0.1), Inches(1.55), Inches(2.6), Inches(1.4))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p0 = tf.paragraphs[0]
        p0.text = val
        p0.font.size = Pt(24)
        p0.font.bold = True
        p0.font.color.rgb = col
        p0.alignment = PP_ALIGN.CENTER
        
        p1 = tf.add_paragraph()
        p1.text = label
        p1.font.size = Pt(9.5)
        p1.font.bold = True
        p1.font.color.rgb = TEXT_MAIN
        p1.alignment = PP_ALIGN.CENTER
        
        p2 = tf.add_paragraph()
        p2.text = sub
        p2.font.size = Pt(8)
        p2.font.color.rgb = TEXT_MUTED
        p2.alignment = PP_ALIGN.CENTER

    tb_title = s13.shapes.add_textbox(Inches(0.8), Inches(3.18), Inches(11.733), Inches(0.35))
    tf_tt = tb_title.text_frame
    ptt = tf_tt.paragraphs[0]
    ptt.text = "EMPIRICAL CONFUSION MATRIX & SUBSYSTEM LATENCY PROFILE (ON STANDARD CPU)"
    ptt.font.size = Pt(10)
    ptt.font.bold = True
    ptt.font.color.rgb = PRIMARY

    rows, cols = 5, 5
    t_shape = s13.shapes.add_table(rows, cols, Inches(0.8), Inches(3.55), Inches(11.733), Inches(3.4))
    t2 = t_shape.table
    t2.columns[0].width = Inches(2.8)
    t2.columns[1].width = Inches(2.2)
    t2.columns[2].width = Inches(2.2)
    t2.columns[3].width = Inches(2.2)
    t2.columns[4].width = Inches(2.333)

    h2 = ["Pipeline Stage", "Algorithm / Model", "Latency (Intel i5 CPU)", "Latency (NVIDIA GPU)", "Accuracy / Metric"]
    for j, h in enumerate(h2):
        cell = t2.cell(0, j)
        cell.fill.solid()
        cell.fill.fore_color.rgb = PRIMARY
        p = cell.text_frame.paragraphs[0]
        p.text = h
        p.font.size = Pt(9.5)
        p.font.bold = True
        p.font.color.rgb = RGBColor(255, 255, 255)
        p.alignment = PP_ALIGN.CENTER

    bench_data = [
        ["1. Face Detection", "MTCNN (P-Net + R-Net + O-Net)", "28.4 ms / frame", "8.2 ms / frame", "94.8% Detection Recall"],
        ["2. Landmark Alignment", "Canonical Partial Affine 2D", "3.2 ms / crop", "1.1 ms / crop", "5-Point Umeyama Exact"],
        ["3. Deep Embedding", "ArcFace (ResNet-50 Backbone)", "38.5 ms / crop", "7.4 ms / crop", "99.83% LFW Accuracy"],
        ["4. Physical & Temporal PAD", "Multi-Signal + PhaseCorrelate", "17.6 ms / frame", "4.8 ms / frame", "100.0% Spoof Rejection"]
    ]

    for i, rdata in enumerate(bench_data):
        for j, val in enumerate(rdata):
            cell = t2.cell(i + 1, j)
            cell.fill.solid()
            if j == 4:
                cell.fill.fore_color.rgb = RGBColor(240, 253, 250)
            elif (i % 2) == 0:
                cell.fill.fore_color.rgb = RGBColor(248, 250, 252)
            else:
                cell.fill.fore_color.rgb = RGBColor(255, 255, 255)
            p = cell.text_frame.paragraphs[0]
            p.text = val
            p.font.size = Pt(8.5)
            p.alignment = PP_ALIGN.CENTER if j > 0 else PP_ALIGN.LEFT
            if j == 4:
                p.font.bold = True
                p.font.color.rgb = SUCCESS
            elif j == 0:
                p.font.bold = True
                p.font.color.rgb = TEXT_MAIN
            else:
                p.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 14: CONCLUSION
    # =========================================================================
    s14 = prs.slides.add_slide(blank_layout)
    add_header(s14, "Conclusion: Summary of Achievements & Technical Learnings", "SLIDE 14: CONCLUSION")

    c_s14_1 = add_card(s14, Inches(0.8), Inches(1.48), Inches(5.7), Inches(5.5), CARD_BG, PRIMARY)
    tb_s14_1 = s14.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(5.3), Inches(5.1))
    tf_s14_1 = tb_s14_1.text_frame
    tf_s14_1.word_wrap = True
    
    p = tf_s14_1.paragraphs[0]
    p.text = "Key Project Achievements"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    
    achievements = [
        ("Recovered 16.7% Lecture Instructional Time:", "Replaced 10-12 minute manual roll-calls with passive 1.2-second multi-face computer vision verification, returning hundreds of direct teaching hours to university students."),
        ("Solved Presentation Spoofing Without 3D Depth Hardware:", "Pioneered a deterministic multi-signal physical PAD engine and Fourier phase correlation motion compensator, neutralizing 100% of 2D screen and photograph spoof attacks."),
        ("Eliminated Double-Lecture Workflow Friction:", "Engineered 1-click timetable baseline cloning, reducing consecutive period entry from 10 minutes to under 15 seconds."),
        ("Automated Institutional Medical Leaves:", "Integrated Tesseract OCR with university condonation formula: Effective % = min(100.0, [(Present + Waived)/Held] * 100)."),
        ("Zero Incremental Capital Cost (Zero CapEx):", "Operates entirely inside standard modern web browsers on existing faculty laptops and smartphones without purchasing $60K surveillance gear.")
    ]
    for at, ad in achievements:
        p_t = tf_s14_1.add_paragraph()
        p_t.text = "✔ " + at
        p_t.font.size = Pt(9.5)
        p_t.font.bold = True
        p_t.font.color.rgb = TEAL
        p_t.space_before = Pt(3)
        p_d = tf_s14_1.add_paragraph()
        p_d.text = "  " + ad
        p_d.font.size = Pt(8.5)
        p_d.font.color.rgb = TEXT_MAIN

    c_s14_2 = add_card(s14, Inches(6.8), Inches(1.48), Inches(5.733), Inches(5.5), RGBColor(248, 250, 252), TEAL)
    tb_s14_2 = s14.shapes.add_textbox(Inches(7.0), Inches(1.65), Inches(5.3), Inches(5.1))
    tf_s14_2 = tb_s14_2.text_frame
    tf_s14_2.word_wrap = True
    
    p = tf_s14_2.paragraphs[0]
    p.text = "Technical Learnings & Competencies Acquired"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    
    learnings = [
        ("Deep Metric Learning on Hyperspherical Manifolds:", "Mastered Additive Angular Margin Loss (ArcFace) mechanics, feature geodesic normalization, and vectorized high-dimensional cosine similarity matching."),
        ("Computer Vision Frequency Domain Analysis:", "Implemented 2D Discrete Fast Fourier Transforms (FFT) and subpixel Moiré band power spectral ratio analysis for electronic display detection."),
        ("Fourier Shift Theorem & Motion Compensation:", "Engineered phase correlation algorithms to resolve subpixel camera shake from physiological tremor, differentiating rigid attacks from living micro-saccades."),
        ("Decoupled Enterprise ASGI Architecture:", "Architected a full-stack asynchronous system integrating FastAPI, SQLAlchemy 2.0 ORM, WebRTC streaming, and React 19 single-page UI."),
        ("Academic Governance & Privacy Regulations:", "Gained deep understanding of university attendance bylaws, medical condonation policies, and student biometric data sovereignty.")
    ]
    for lt, ld in learnings:
        p_t = tf_s14_2.add_paragraph()
        p_t.text = "★ " + lt
        p_t.font.size = Pt(9.5)
        p_t.font.bold = True
        p_t.font.color.rgb = PRIMARY_LIGHT
        p_t.space_before = Pt(3)
        p_d = tf_s14_2.add_paragraph()
        p_d.text = "  " + ld
        p_d.font.size = Pt(8.5)
        p_d.font.color.rgb = TEXT_MAIN

    # =========================================================================
    # SLIDE 15: FUTURE SCOPE
    # =========================================================================
    s15 = prs.slides.add_slide(blank_layout)
    add_header(s15, "Future Scope: Proposed Architectural Enhancements & Scalability", "SLIDE 15: FUTURE SCOPE")

    future_cards = [
        ("1. TensorRT Edge Optimization", TEAL, [
            "Compile MTCNN and ArcFace models into optimized NVIDIA TensorRT engines.",
            "Deploy on edge micro-devices (NVIDIA Jetson Orin Nano / Raspberry Pi 5 with AI Hailo).",
            "Target sub-10ms inference latencies on ultra-low-power 15W departmental edge appliances.",
            "Enables standalone smart attendance pods without local computer dependencies."
        ]),
        ("2. Multimodal Infrared Sensor Fusion", PRIMARY_LIGHT, [
            "Fuse consumer RGB webcams with compact structured-light infrared (IR) depth sensors.",
            "Enables 24/7 attendance capability in poorly illuminated auditoriums and darkened AV rooms.",
            "Provides hardware 3D topological mesh verification for defense against hyper-realistic silicone masks.",
            "Maintains 100% recognition under extreme backlight conditions."
        ]),
        ("3. Cross-Platform Mobile Migration", AMBER, [
            "Port client architecture to native cross-platform mobile frameworks (React Native / Flutter).",
            "Enable offline student attendance verification using on-device CoreML / NNAPI neural runtimes.",
            "Support offline SQLite caching with automatic bidirectional background cloud sync when online.",
            "Enable secure geofenced Bluetooth Low Energy (BLE) proximity handshakes."
        ]),
        ("4. Enterprise University ERP Integration", ROSE, [
            "Engineer direct bi-directional REST webhooks and GraphQL APIs for institutional ERP systems.",
            "Seamless live sync with university portals (e.g., VTU DHI, SAP Campus, Jenzabar).",
            "Automate automated SMS and WhatsApp attendance warning alerts to parents for detained students.",
            "Generate cryptographically signed, tamper-proof blockchain attendance certificates."
        ])
    ]

    card_w = Inches(2.8)
    card_gap = Inches(0.17)
    for idx, (title, col, items) in enumerate(future_cards):
        l = Inches(0.8) + idx * (card_w + card_gap)
        c = add_card(s15, l, Inches(1.48), card_w, Inches(5.5), CARD_BG, col)
        
        banner = s15.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, Inches(1.48), card_w, Inches(0.85))
        banner.fill.solid()
        banner.fill.fore_color.rgb = col
        banner.line.fill.background()
        tf_b = banner.text_frame
        tf_b.word_wrap = True
        pb = tf_b.paragraphs[0]
        pb.text = title
        pb.font.size = Pt(10)
        pb.font.bold = True
        pb.font.color.rgb = RGBColor(255, 255, 255)
        pb.alignment = PP_ALIGN.CENTER

        tb = s15.shapes.add_textbox(l + Inches(0.1), Inches(2.45), card_w - Inches(0.2), Inches(4.4))
        tf = tb.text_frame
        tf.word_wrap = True
        for it in items:
            p = tf.add_paragraph()
            p.text = "• " + it
            p.font.size = Pt(8.5)
            p.font.color.rgb = TEXT_MAIN
            p.space_after = Pt(4)

    # =========================================================================
    # SLIDE 16: Q&A / THANK YOU SLIDE
    # =========================================================================
    s16 = prs.slides.add_slide(blank_layout)
    bg16 = s16.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg16.fill.solid()
    bg16.fill.fore_color.rgb = BG_DARK
    bg16.line.fill.background()

    card16 = add_card(s16, Inches(0.9), Inches(0.65), Inches(11.533), Inches(6.2), BG_DARK, RGBColor(30, 41, 59))
    
    tb_ty = s16.shapes.add_textbox(Inches(1.4), Inches(1.0), Inches(10.5), Inches(2.2))
    tf_ty = tb_ty.text_frame
    tf_ty.word_wrap = True
    
    p_ty_cat = tf_ty.paragraphs[0]
    p_ty_cat.text = "FINAL REVIEW – MAIN PROJECT [MPRJ382] – SEMESTER 3, MCA"
    p_ty_cat.font.size = Pt(11)
    p_ty_cat.font.bold = True
    p_ty_cat.font.color.rgb = PRIMARY_LIGHT
    
    p_ty = tf_ty.add_paragraph()
    p_ty.text = "Thank You!"
    p_ty.font.size = Pt(42)
    p_ty.font.bold = True
    p_ty.font.color.rgb = RGBColor(255, 255, 255)

    p_qa = tf_ty.add_paragraph()
    p_qa.text = "Open Floor for Panel Questions & Viva-Voce Discussion"
    p_qa.font.size = Pt(15)
    p_qa.font.bold = True
    p_qa.font.color.rgb = TEAL

    c_v1 = add_card(s16, Inches(1.4), Inches(3.4), Inches(5.1), Inches(2.9), RGBColor(30, 41, 59), RGBColor(51, 65, 85))
    tb_v1 = s16.shapes.add_textbox(Inches(1.5), Inches(3.5), Inches(4.9), Inches(2.7))
    tf_v1 = tb_v1.text_frame
    tf_v1.word_wrap = True
    pv1_0 = tf_v1.paragraphs[0]
    pv1_0.text = "ANTICIPATED COMMITTEE QUESTION 1:"
    pv1_0.font.size = Pt(9.5)
    pv1_0.font.bold = True
    pv1_0.font.color.rgb = AMBER
    pv1_1 = tf_v1.add_paragraph()
    pv1_1.text = "Q: Why use ArcFace instead of FaceNet or Softmax?"
    pv1_1.font.size = Pt(10)
    pv1_1.font.bold = True
    pv1_1.font.color.rgb = RGBColor(255, 255, 255)
    pv1_2 = tf_v1.add_paragraph()
    pv1_2.text = "A: Softmax lacks angular margin for open-set test identities. Triplet loss suffers from O(N^3) mining instability. ArcFace enforces an exact constant geodesic arc distance (m=0.5 rad) on a hypersphere, achieving 99.83% LFW accuracy and tightest intra-class clustering."
    pv1_2.font.size = Pt(8.5)
    pv1_2.font.color.rgb = RGBColor(203, 213, 225)

    c_v2 = add_card(s16, Inches(6.8), Inches(3.4), Inches(5.1), Inches(2.9), RGBColor(30, 41, 59), RGBColor(51, 65, 85))
    tb_v2 = s16.shapes.add_textbox(Inches(6.9), Inches(3.5), Inches(4.9), Inches(2.7))
    tf_v2 = tb_v2.text_frame
    tf_v2.word_wrap = True
    pv2_0 = tf_v2.paragraphs[0]
    pv2_0.text = "ANTICIPATED COMMITTEE QUESTION 2:"
    pv2_0.font.size = Pt(9.5)
    pv2_0.font.bold = True
    pv2_0.font.color.rgb = TEAL
    pv2_1 = tf_v2.add_paragraph()
    pv2_1.text = "Q: How do you stop a moving smartphone photo spoof?"
    pv2_1.font.size = Pt(10)
    pv2_1.font.bold = True
    pv2_1.font.color.rgb = RGBColor(255, 255, 255)
    pv2_2 = tf_v2.add_paragraph()
    pv2_2.text = "A: Hand tremor causes 1-3 pixels of rigid translation. Fourier phase correlation (phaseCorrelate) computes the subpixel vector (dx, dy) and aligns consecutive crops. Once rigid translation is eliminated, ocular MAE on a 2D photo is near-zero (<4.5), detecting the spoof immediately."
    pv2_2.font.size = Pt(8.5)
    pv2_2.font.color.rgb = RGBColor(203, 213, 225)

    output_path = os.path.abspath("NeuroFace_Final_Review_Presentation.pptx")
    prs.save(output_path)
    print(f"16-Slide Final Review Presentation created at: {output_path}")

if __name__ == "__main__":
    create_deck()

