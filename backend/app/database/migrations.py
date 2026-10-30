"""Hand-written SQLite migrations.

`Base.metadata.create_all()` only creates tables that do not exist yet - it
never changes a table that is already there. So whenever we want to relax or
rename a column we have to migrate the existing database by hand.

Every migration in this file is written so that running it twice is safe.
"""

from sqlalchemy import text
from sqlalchemy.engine import Engine


def _is_sqlite(engine: Engine) -> bool:
    return engine.dialect.name == "sqlite"


def _column_is_not_null(engine: Engine, table: str, column: str) -> bool:
    """True when the given column still has a NOT NULL constraint."""
    with engine.connect() as conn:
        rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
    for row in rows:
        if row[1] == column:
            return bool(row[3])  # row[3] is the "notnull" flag
    return False


def migrate_leave_documents_leave_id(engine: Engine) -> bool:
    """Allow a leave document to be uploaded before its leave application exists."""
    if not _is_sqlite(engine):
        return False
    if not _column_is_not_null(engine, "leave_documents", "leave_id"):
        return False  # Already migrated.

    with engine.begin() as conn:
        conn.execute(text("PRAGMA foreign_keys=off"))
        conn.execute(text("""
            CREATE TABLE leave_documents_new (
                id INTEGER NOT NULL,
                leave_id INTEGER,
                file_path VARCHAR(255) NOT NULL,
                file_name VARCHAR(100) NOT NULL,
                mime_type VARCHAR(50) NOT NULL,
                ocr_processed BOOLEAN NOT NULL,
                uploaded_at DATETIME NOT NULL,
                PRIMARY KEY (id),
                FOREIGN KEY(leave_id) REFERENCES leave_applications (id) ON DELETE CASCADE
            )
        """))
        conn.execute(text(
            "INSERT INTO leave_documents_new "
            "(id, leave_id, file_path, file_name, mime_type, ocr_processed, uploaded_at) "
            "SELECT id, leave_id, file_path, file_name, mime_type, ocr_processed, uploaded_at "
            "FROM leave_documents"
        ))
        conn.execute(text("DROP TABLE leave_documents"))
        conn.execute(text("ALTER TABLE leave_documents_new RENAME TO leave_documents"))
        conn.execute(text("PRAGMA foreign_keys=on"))
    return True


def migrate_classes_add_advisor(engine: Engine) -> bool:
    """Add class_advisor_id column to classes table if missing."""
    if not _is_sqlite(engine):
        return False

    with engine.connect() as conn:
        rows = conn.execute(text("PRAGMA table_info(classes)")).fetchall()
        col_names = [row[1] for row in rows]
        if "class_advisor_id" in col_names:
            return False  # Already exists

    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE classes ADD COLUMN class_advisor_id INTEGER "
            "REFERENCES teachers(id) ON DELETE SET NULL"
        ))
    return True


def migrate_leave_applications_add_day_type(engine: Engine) -> bool:
    """Add day_type column to leave_applications table if missing."""
    if not _is_sqlite(engine):
        return False

    with engine.connect() as conn:
        rows = conn.execute(text("PRAGMA table_info(leave_applications)")).fetchall()
        col_names = [row[1] for row in rows]
        if "day_type" in col_names:
            return False

    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE leave_applications ADD COLUMN day_type VARCHAR(20) DEFAULT 'FULL_DAY' NOT NULL"
        ))
    return True


def migrate_ocr_results_add_day_type_and_subject(engine: Engine) -> bool:
    """Add detected_day_type and detected_subject columns to ocr_results table if missing."""
    if not _is_sqlite(engine):
        return False

    with engine.connect() as conn:
        rows = conn.execute(text("PRAGMA table_info(ocr_results)")).fetchall()
        col_names = [row[1] for row in rows]

    with engine.begin() as conn:
        if "detected_day_type" not in col_names:
            conn.execute(text("ALTER TABLE ocr_results ADD COLUMN detected_day_type VARCHAR(20)"))
        if "detected_subject" not in col_names:
            conn.execute(text("ALTER TABLE ocr_results ADD COLUMN detected_subject VARCHAR(100)"))
    return True


def run_migrations(engine: Engine) -> None:
    """Run every migration. Safe to call on every startup."""
    migrate_leave_documents_leave_id(engine)
    migrate_classes_add_advisor(engine)
    migrate_leave_applications_add_day_type(engine)
    migrate_ocr_results_add_day_type_and_subject(engine)
