from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import DATA_DIR, DATABASE_URL, DB_PATH, UPLOAD_DIR

try:
    import psycopg2
    import psycopg2.extras
    HAS_POSTGRES = True
except ImportError:
    HAS_POSTGRES = False


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_storage() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    
    if HAS_POSTGRES:
        try:
            with psycopg2.connect(DATABASE_URL) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS documents (
                          id VARCHAR(64) PRIMARY KEY,
                          source_type VARCHAR(64) NOT NULL,
                          source_label VARCHAR(255) NOT NULL,
                          filename VARCHAR(255),
                          mime_type VARCHAR(128),
                          size_bytes BIGINT NOT NULL DEFAULT 0,
                          checksum VARCHAR(128),
                          document_type VARCHAR(64) NOT NULL DEFAULT 'unknown',
                          status VARCHAR(64) NOT NULL,
                          storage_path TEXT,
                          raw_text TEXT,
                          metadata_json TEXT NOT NULL DEFAULT '{}',
                          preview_json TEXT NOT NULL DEFAULT '{}',
                          resume_json TEXT NOT NULL DEFAULT '{}',
                          captured_at VARCHAR(64) NOT NULL,
                          updated_at VARCHAR(64) NOT NULL
                        )
                        """
                    )
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS audit_events (
                          id SERIAL PRIMARY KEY,
                          document_id VARCHAR(64) NOT NULL,
                          actor VARCHAR(128) NOT NULL,
                          action VARCHAR(128) NOT NULL,
                          from_status VARCHAR(64),
                          to_status VARCHAR(64),
                          metadata_json TEXT NOT NULL DEFAULT '{}',
                          created_at VARCHAR(64) NOT NULL
                        )
                        """
                    )
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS user_sessions (
                          username VARCHAR(128) PRIMARY KEY,
                          active_entity_id VARCHAR(64),
                          active_entity_name VARCHAR(255),
                          locale VARCHAR(16) DEFAULT 'id',
                          theme VARCHAR(16) DEFAULT 'system',
                          updated_at VARCHAR(64) NOT NULL
                        )
                        """
                    )
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS entities (
                          id VARCHAR(64) PRIMARY KEY,
                          name VARCHAR(255) NOT NULL UNIQUE,
                          code VARCHAR(64),
                          created_by VARCHAR(128) DEFAULT 'system',
                          created_at VARCHAR(64) NOT NULL
                        )
                        """
                    )
                    # Seed default entities if empty
                    cur.execute("SELECT COUNT(*) FROM entities")
                    count = cur.fetchone()[0]
                    if count == 0:
                        now = now_iso()
                        cur.executemany(
                            "INSERT INTO entities (id, name, code, created_by, created_at) VALUES (%s, %s, %s, %s, %s)",
                            [
                                ("ent-1", "PT Manufaktur Nusantara", "MN", "system", now),
                                ("ent-2", "Toko Sinar Jaya", "SJ", "system", now),
                                ("ent-3", "CV Gemilang Utama", "GU", "system", now),
                            ],
                        )
                    conn.commit()
            return
        except Exception as exc:
            print(f"[Storage] Warning: Failed connecting to PostgreSQL ({exc}). Falling back to SQLite.")

    # SQLite Fallback for local testing without Postgres
    with sqlite3.connect(DB_PATH) as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS documents (
              id TEXT PRIMARY KEY,
              source_type TEXT NOT NULL,
              source_label TEXT NOT NULL,
              filename TEXT,
              mime_type TEXT,
              size_bytes INTEGER NOT NULL DEFAULT 0,
              checksum TEXT,
              document_type TEXT NOT NULL DEFAULT 'unknown',
              status TEXT NOT NULL,
              storage_path TEXT,
              raw_text TEXT,
              metadata_json TEXT NOT NULL DEFAULT '{}',
              preview_json TEXT NOT NULL DEFAULT '{}',
              resume_json TEXT NOT NULL DEFAULT '{}',
              captured_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              document_id TEXT NOT NULL,
              actor TEXT NOT NULL,
              action TEXT NOT NULL,
              from_status TEXT,
              to_status TEXT,
              metadata_json TEXT NOT NULL DEFAULT '{}',
              created_at TEXT NOT NULL
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS user_sessions (
              username TEXT PRIMARY KEY,
              active_entity_id TEXT,
              active_entity_name TEXT,
              locale TEXT DEFAULT 'id',
              theme TEXT DEFAULT 'system',
              updated_at TEXT NOT NULL
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS entities (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL UNIQUE,
              code TEXT,
              created_by TEXT DEFAULT 'system',
              created_at TEXT NOT NULL
            )
            """
        )
        cursor = db.execute("SELECT COUNT(*) FROM entities")
        if cursor.fetchone()[0] == 0:
            now = now_iso()
            db.executemany(
                "INSERT INTO entities (id, name, code, created_by, created_at) VALUES (?, ?, ?, ?, ?)",
                [
                    ("ent-1", "PT Manufaktur Nusantara", "MN", "system", now),
                    ("ent-2", "Toko Sinar Jaya", "SJ", "system", now),
                    ("ent-3", "CV Gemilang Utama", "GU", "system", now),
                ],
            )
            db.commit()


def encode_json(value: Any) -> str:
    return json.dumps(value or {}, ensure_ascii=False, default=str)


def decode_json(value: str | None, fallback: Any) -> Any:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def row_to_document(row: dict[str, Any] | sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "source_type": row["source_type"],
        "source_label": row["source_label"],
        "filename": row["filename"],
        "mime_type": row["mime_type"],
        "size_bytes": row["size_bytes"],
        "checksum": row["checksum"],
        "document_type": row["document_type"],
        "status": row["status"],
        "captured_at": row["captured_at"],
        "updated_at": row["updated_at"],
    }


def get_document(document_id: str) -> dict[str, Any] | None:
    ensure_storage()
    if HAS_POSTGRES:
        try:
            with psycopg2.connect(DATABASE_URL) as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                    cur.execute("SELECT * FROM documents WHERE id = %s", (document_id,))
                    row = cur.fetchone()
                    return dict(row) if row else None
        except Exception:
            pass

    with sqlite3.connect(DB_PATH) as db:
        db.row_factory = sqlite3.Row
        row = db.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
        return dict(row) if row else None


def insert_document(payload: dict[str, Any]) -> None:
    ensure_storage()
    timestamp = now_iso()
    doc_id = payload["id"]
    source_type = payload["source_type"]
    source_label = payload["source_label"]
    filename = payload.get("filename")
    mime_type = payload.get("mime_type")
    size_bytes = payload.get("size_bytes", 0)
    checksum = payload.get("checksum")
    document_type = payload.get("document_type", "unknown")
    status = payload.get("status", "uploaded")
    storage_path = payload.get("storage_path")
    raw_text = payload.get("raw_text")
    metadata_json = encode_json(payload.get("metadata"))
    preview_json = encode_json(payload.get("preview"))
    resume_json = encode_json(payload.get("resume"))

    if HAS_POSTGRES:
        try:
            with psycopg2.connect(DATABASE_URL) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO documents (
                          id, source_type, source_label, filename, mime_type, size_bytes, checksum,
                          document_type, status, storage_path, raw_text, metadata_json, preview_json, resume_json,
                          captured_at, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            doc_id, source_type, source_label, filename, mime_type, size_bytes, checksum,
                            document_type, status, storage_path, raw_text, metadata_json, preview_json, resume_json,
                            timestamp, timestamp
                        ),
                    )
                    conn.commit()
            return
        except Exception as exc:
            print(f"[Storage] Warning: Failed Postgres insert_document ({exc}), falling back to SQLite.")

    with sqlite3.connect(DB_PATH) as db:
        db.execute(
            """
            INSERT INTO documents (
              id, source_type, source_label, filename, mime_type, size_bytes, checksum,
              document_type, status, storage_path, raw_text, metadata_json, preview_json, resume_json,
              captured_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                doc_id, source_type, source_label, filename, mime_type, size_bytes, checksum,
                document_type, status, storage_path, raw_text, metadata_json, preview_json, resume_json,
                timestamp, timestamp
            ),
        )
        db.commit()


def update_document(
    document_id: str,
    status: str | None = None,
    preview: dict[str, Any] | None = None,
    resume: dict[str, Any] | None = None,
    actor: str = "workspace_user",
    action: str = "updated",
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    current = get_document(document_id)
    if current is None:
        raise KeyError(f"Document {document_id} not found")

    next_status = status or current["status"]
    next_document_type = current["document_type"]
    next_preview_json = encode_json(preview) if preview is not None else current["preview_json"]
    next_resume_json = encode_json(resume) if resume is not None else current["resume_json"]
    timestamp = now_iso()

    if HAS_POSTGRES:
        try:
            with psycopg2.connect(DATABASE_URL) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE documents SET
                          status = %s,
                          document_type = %s,
                          preview_json = %s,
                          resume_json = %s,
                          updated_at = %s
                        WHERE id = %s
                        """,
                        (next_status, next_document_type, next_preview_json, next_resume_json, timestamp, document_id),
                    )
                    conn.commit()
                insert_audit_pg(document_id, actor, action, current["status"], next_status, metadata)
            return get_document(document_id)
        except Exception:
            pass

    with sqlite3.connect(DB_PATH) as db:
        db.execute(
            """
            UPDATE documents SET
              status = ?,
              document_type = ?,
              preview_json = ?,
              resume_json = ?,
              updated_at = ?
            WHERE id = ?
            """,
            (next_status, next_document_type, next_preview_json, next_resume_json, timestamp, document_id),
        )
        db.commit()
    return get_document(document_id)


def insert_audit_pg(document_id: str, actor: str, action: str, from_status: str | None, to_status: str | None, metadata: dict[str, Any] | None = None) -> None:
    try:
        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO audit_events (document_id, actor, action, from_status, to_status, metadata_json, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (document_id, actor, action, from_status, to_status, encode_json(metadata), now_iso()),
                )
                conn.commit()
    except Exception:
        pass


def document_storage_path(document_id: str, filename: str) -> Path:
    safe_name = Path(filename).name.replace("/", "_")
    return UPLOAD_DIR / f"{document_id}-{safe_name}"


def get_all_entities() -> list[dict[str, Any]]:
    ensure_storage()
    if HAS_POSTGRES:
        try:
            with psycopg2.connect(DATABASE_URL) as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                    cur.execute("SELECT * FROM entities ORDER BY name ASC")
                    rows = cur.fetchall()
                    return [{"id": r["id"], "name": r["name"], "code": r["code"], "created_at": r["created_at"]} for r in rows]
        except Exception:
            pass

    with sqlite3.connect(DB_PATH) as db:
        db.row_factory = sqlite3.Row
        rows = db.execute("SELECT * FROM entities ORDER BY name ASC").fetchall()
        return [{"id": r["id"], "name": r["name"], "code": r["code"], "created_at": r["created_at"]} for r in rows]


def add_entity(name: str, created_by: str = "workspace_user") -> dict[str, Any]:
    ensure_storage()
    from uuid import uuid4
    entity_id = f"ent-{uuid4().hex[:8]}"
    now = now_iso()

    if HAS_POSTGRES:
        try:
            with psycopg2.connect(DATABASE_URL) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO entities (id, name, created_by, created_at) VALUES (%s, %s, %s, %s)",
                        (entity_id, name, created_by, now),
                    )
                    conn.commit()
            return {"id": entity_id, "name": name, "created_by": created_by, "created_at": now}
        except Exception:
            pass

    with sqlite3.connect(DB_PATH) as db:
        db.execute(
            "INSERT INTO entities (id, name, created_by, created_at) VALUES (?, ?, ?, ?)",
            (entity_id, name, created_by, now),
        )
        db.commit()
    return {"id": entity_id, "name": name, "created_by": created_by, "created_at": now}


def get_user_session(username: str) -> dict[str, Any]:
    ensure_storage()
    if HAS_POSTGRES:
        try:
            with psycopg2.connect(DATABASE_URL) as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                    cur.execute("SELECT * FROM user_sessions WHERE username = %s", (username,))
                    row = cur.fetchone()
                    if row:
                        return {
                            "username": row["username"],
                            "active_entity_id": row["active_entity_id"],
                            "active_entity_name": row["active_entity_name"],
                            "locale": row["locale"],
                            "theme": row["theme"],
                            "updated_at": row["updated_at"],
                        }
        except Exception:
            pass

    with sqlite3.connect(DB_PATH) as db:
        db.row_factory = sqlite3.Row
        row = db.execute("SELECT * FROM user_sessions WHERE username = ?", (username,)).fetchone()
        if not row:
            return {"username": username, "active_entity_id": None, "active_entity_name": None, "locale": "id", "theme": "system"}
        return {
            "username": row["username"],
            "active_entity_id": row["active_entity_id"],
            "active_entity_name": row["active_entity_name"],
            "locale": row["locale"],
            "theme": row["theme"],
            "updated_at": row["updated_at"],
        }


def save_user_session(username: str, active_entity_id: str | None, active_entity_name: str | None, locale: str = "id", theme: str = "system") -> dict[str, Any]:
    ensure_storage()
    now = now_iso()

    if HAS_POSTGRES:
        try:
            with psycopg2.connect(DATABASE_URL) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO user_sessions (username, active_entity_id, active_entity_name, locale, theme, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT(username) DO UPDATE SET
                          active_entity_id = EXCLUDED.active_entity_id,
                          active_entity_name = EXCLUDED.active_entity_name,
                          locale = EXCLUDED.locale,
                          theme = EXCLUDED.theme,
                          updated_at = EXCLUDED.updated_at
                        """,
                        (username, active_entity_id, active_entity_name, locale, theme, now),
                    )
                    conn.commit()
            return get_user_session(username)
        except Exception as exc:
            print(f"[Storage] Warning: Failed Postgres save_user_session ({exc}), falling back to SQLite.")

    with sqlite3.connect(DB_PATH) as db:
        db.execute(
            """
            INSERT INTO user_sessions (username, active_entity_id, active_entity_name, locale, theme, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET
              active_entity_id = excluded.active_entity_id,
              active_entity_name = excluded.active_entity_name,
              locale = excluded.locale,
              theme = excluded.theme,
              updated_at = excluded.updated_at
            """,
            (username, active_entity_id, active_entity_name, locale, theme, now),
        )
        db.commit()
    return get_user_session(username)


def list_documents(limit: int = 50) -> list[dict[str, Any]]:
    ensure_storage()
    if HAS_POSTGRES:
        try:
            with psycopg2.connect(DATABASE_URL) as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                    cur.execute("SELECT * FROM documents ORDER BY captured_at DESC LIMIT %s", (limit,))
                    rows = cur.fetchall()
                    return [dict(r) for r in rows]
        except Exception as exc:
            print(f"[Storage] Warning: Failed Postgres list_documents ({exc}), falling back to SQLite.")

    with sqlite3.connect(DB_PATH) as db:
        db.row_factory = sqlite3.Row
        rows = db.execute("SELECT * FROM documents ORDER BY captured_at DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]
