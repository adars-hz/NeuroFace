"""
NeuroFace Database Viewer CLI Utility
Allows instant command-line inspection of tables in SQLite database (neuroface.db)

Usage:
  python view_db.py                     (Shows all tables and row counts)
  python view_db.py users               (Inspect users table)
  python view_db.py students            (Inspect students table)
  python view_db.py teachers            (Inspect teachers table)
  python view_db.py attendance_records  (Inspect attendance records)
  python view_db.py attendance_sessions (Inspect sessions)
  python view_db.py audit_logs          (Inspect compliance audit logs)
  python view_db.py medical_waivers     (Inspect medical waivers)
"""

import sys
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "neuroface.db")

def format_cell(val, max_len=24):
    if val is None:
        return "NULL"
    s = str(val).replace("\n", " ")
    if len(s) > max_len:
        return s[:max_len - 3] + "..."
    return s

def show_tables(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    tables = [row[0] for row in cursor.fetchall()]

    print("\n=======================================================")
    print("           NEUROFACE DATABASE TABLES OVERVIEW          ")
    print("=======================================================")
    print(f"Database File: {DB_PATH}\n")
    print(f"{'TABLE NAME':<35} | {'RECORD COUNT':<15}")
    print("-" * 55)

    for tbl in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {tbl}")
        count = cursor.fetchone()[0]
        print(f"{tbl:<35} | {count:<15}")

    print("-" * 55)
    print("\nTo view any table contents, run:")
    print("  python view_db.py <table_name> [limit]")
    print("Example: python view_db.py students\n")

def view_table(conn, table_name, limit=25):
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
    if not cursor.fetchone():
        print(f"\n[ERROR] Table '{table_name}' does not exist in neuroface.db.")
        show_tables(conn)
        return

    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [col[1] for col in cursor.fetchall()]

    cursor.execute(f"SELECT * FROM {table_name} LIMIT ?", (limit,))
    rows = cursor.fetchall()

    print(f"\n=======================================================")
    print(f" TABLE: {table_name.upper()} (Showing up to {limit} rows)")
    print(f"=======================================================")

    col_widths = {}
    for i, col in enumerate(columns):
        max_w = len(col)
        for row in rows:
            max_w = max(max_w, len(format_cell(row[i])))
        col_widths[i] = min(30, max(max_w, 8))

    # Header
    header = " | ".join(columns[i].ljust(col_widths[i]) for i in range(len(columns)))
    sep = "-+-".join("-" * col_widths[i] for i in range(len(columns)))

    print(header)
    print(sep)

    for row in rows:
        row_str = " | ".join(format_cell(row[i], col_widths[i]).ljust(col_widths[i]) for i in range(len(columns)))
        print(row_str)

    print(f"\nTotal rows displayed: {len(rows)}\n")

def main():
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] Database file not found at {DB_PATH}. Run 'python seed_data.py' first.")
        return

    conn = sqlite3.connect(DB_PATH)
    try:
        if len(sys.argv) < 2:
            show_tables(conn)
        else:
            tbl = sys.argv[1]
            lim = int(sys.argv[2]) if len(sys.argv) > 2 else 25
            view_table(conn, tbl, lim)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
