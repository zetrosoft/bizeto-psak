from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import DATA_DIR, DB_PATH, UPLOAD_DIR


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_storage() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
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


def connect() -> sqlite3.Connection:
    ensure_storage()
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def encode_json(value: Any) -> str:
    return json.dumps(value or {}, ensure_ascii=False, default=str)


def decode_json(value: str | None, fallback: Any) -> Any:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def row_to_document(row: sqlite3.Row) -> dict[str, Any]:
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


def get_document(document_id: str) -> sqlite3.Row | None:
    with connect() as db:
        return db.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()


def insert_document(payload: dict[str, Any]) -> None:
    timestamp = now_iso()
    with connect() as db:
        db.execute(
            """
            INSERT INTO documents (
              id, source_type, source_label, filename, mime_type, size_bytes, checksum,
              document_type, status, storage_path, raw_text, metadata_json, preview_json,
              resume_json, captured_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["id"],
                payload["source_type"],
                payload["source_label"],
                payload.get("filename"),
                payload.get("mime_type"),
                payload.get("size_bytes", 0),
                payload.get("checksum"),
                payload.get("document_type", "unknown"),
                payload.get("status", "uploaded"),
                payload.get("storage_path"),
                payload.get("raw_text"),
                encode_json(payload.get("metadata")),
                encode_json(payload.get("preview")),
                encode_json(payload.get("resume")),
                timestamp,
                timestamp,
            ),
        )
        insert_audit(db, payload["id"], "system", "created", None, payload.get("status", "uploaded"), payload.get("metadata"))


def update_document(document_id: str, *, status: str | None = None, document_type: str | None = None, preview: Any | None = None, resume: Any | None = None, actor: str = "system", action: str = "updated", metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    with connect() as db:
        current = db.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
        if current is None:
            raise KeyError(document_id)
        next_status = status or current["status"]
        next_document_type = document_type or current["document_type"]
        db.execute(
            """
            UPDATE documents
            SET status = ?, document_type = ?, preview_json = ?, resume_json = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                next_status,
                next_document_type,
                encode_json(preview) if preview is not None else current["preview_json"],
                encode_json(resume) if resume is not None else current["resume_json"],
                now_iso(),
                document_id,
            ),
        )
        insert_audit(db, document_id, actor, action, current["status"], next_status, metadata)
        updated = db.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
        return row_to_document(updated)


def insert_audit(db: sqlite3.Connection, document_id: str, actor: str, action: str, from_status: str | None, to_status: str | None, metadata: dict[str, Any] | None = None) -> None:
    db.execute(
        """
        INSERT INTO audit_events (document_id, actor, action, from_status, to_status, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (document_id, actor, action, from_status, to_status, encode_json(metadata), now_iso()),
    )


def document_storage_path(document_id: str, filename: str) -> Path:
    safe_name = Path(filename).name.replace("/", "_")
    return UPLOAD_DIR / f"{document_id}-{safe_name}"
