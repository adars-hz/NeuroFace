import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "neuroface.db")

def show_summary():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    print("\n" + "="*70)
    print("         NEUROFACE RELATIONAL DATABASE SUMMARY (SQLite)")
    print(f" Database File: {DB_PATH}")
    print("="*70)
    
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = [t[0] for t in cur.fetchall()]
    
    print(f"\n[+] Total Normalized Tables: {len(tables)}\n")
    print(f"{'Table Name':<35} | {'Total Records':<15}")
    print("-" * 55)
    for table in tables:
        try:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            count = cur.fetchone()[0]
            print(f"{table:<35} | {count:<15}")
        except Exception:
            pass

    print("\n" + "="*70)
    print(" SAMPLE: STUDENTS & ENROLLED BIOMETRICS")
    print("="*70)
    cur.execute("""
        SELECT s.id, s.register_number, s.full_name, s.face_registered, COUNT(fe.id) as embeddings_count
        FROM students s
        LEFT JOIN face_embeddings fe ON fe.student_id = s.id
        GROUP BY s.id
        LIMIT 5;
    """)
    rows = cur.fetchall()
    print(f"{'ID':<4} | {'Reg Number':<12} | {'Student Name':<20} | {'Registered':<10} | {'Embeddings'}")
    print("-" * 70)
    for r in rows:
        reg_status = "YES" if r[3] else "NO"
        print(f"{r[0]:<4} | {r[1]:<12} | {r[2]:<20} | {reg_status:<10} | {r[4]} 512-D vectors")

    print("\n" + "="*70)
    print(" SAMPLE: RECENT ATTENDANCE VERIFICATION RECORDS")
    print("="*70)
    cur.execute("""
        SELECT ar.id, ar.session_id, s.full_name, ar.status, ar.confidence_score, ar.verification_method, ar.timestamp
        FROM attendance_records ar
        JOIN students s ON ar.student_id = s.id
        ORDER BY ar.id DESC
        LIMIT 5;
    """)
    rec_rows = cur.fetchall()
    print(f"{'ID':<4} | {'Session':<7} | {'Student Name':<18} | {'Status':<8} | {'Confidence':<10} | {'Method'}")
    print("-" * 70)
    for rec in rec_rows:
        conf = f"{rec[4]:.2f}" if rec[4] else "N/A"
        print(f"{rec[0]:<4} | {rec[1]:<7} | {rec[2]:<18} | {rec[3]:<8} | {conf:<10} | {rec[5]}")

    print("\n" + "="*70)
    print(" SAMPLE: ARCFACE 512-D VECTOR EMBEDDING STRUCTURE")
    print("="*70)
    cur.execute("SELECT id, student_id, model_name, quality_score, embedding_vector FROM face_embeddings LIMIT 1;")
    emb = cur.fetchone()
    if emb:
        vec = json.loads(emb[4])
        print(f"Embedding ID   : {emb[0]}")
        print(f"Student ID     : {emb[1]}")
        print(f"Model Backbone : {emb[2]}")
        print(f"Quality Score  : {emb[3]}")
        print(f"Vector Length  : {len(vec)} dimensions (Float32)")
        print(f"First 5 Values : {vec[:5]} ...")
    
    conn.close()
    print("\n" + "="*70 + "\n")

if __name__ == "__main__":
    show_summary()
