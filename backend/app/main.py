from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import MAX_UPLOAD_BYTES, SUPPORTED_EXTENSIONS
from app.schemas import (
    ChatRequest,
    ChatResponse,
    CodeScanRequest,
    OcrDraftRequest,
    PreviewResponse,
    ProcessResponse,
    ProcessingResume,
    QuickCheckResponse,
    ReviewDecisionRequest,
    SmartNoteRequest,
    UrlInputRequest,
    UploadedDocument,
    VoiceNoteRequest,
)
from app.services.checksum import sha256_bytes
from app.services.document_router import detect_document_type
from app.services.ledger_parser import parse_csv_ledger, unsupported_xlsx_preview
from app.services.mcp_chat_client import build_bizeto_chat_system_prompt, call_mcp_chat
from app.services.quick_check import quick_check_document
from app.services.smart_note_parser import classify_note
from app.storage import decode_json, document_storage_path, get_document, insert_document, row_to_document, update_document


app = FastAPI(title="Bizeto PSAK Processing API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:2550", "http://127.0.0.1:2550"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "bizeto-psak-backend"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> dict:
    system_prompt = build_bizeto_chat_system_prompt(
        locale=request.locale,
        has_source=request.has_source,
        phase=request.phase,
        source_summary=request.source_summary,
    )
    history = "\n".join(
        f"{item.get('role', 'user')}: {item.get('content', '')}"
        for item in request.history[-8:]
    )
    prompt = f"Riwayat percakapan:\n{history}\n\nPesan user terbaru:\n{request.message}".strip()
    return call_mcp_chat(prompt, system_prompt)


@app.post("/api/documents/upload", response_model=UploadedDocument)
async def upload_document(file: UploadFile = File(...)) -> dict:
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File terlalu besar.")

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Jenis file belum didukung.")

    document_id = str(uuid4())
    checksum = sha256_bytes(data)
    storage_path = document_storage_path(document_id, file.filename or "upload.bin")
    storage_path.write_bytes(data)
    document_type = detect_document_type(file.filename, file.content_type)

    insert_document({
        "id": document_id,
        "source_type": "file_upload",
        "source_label": file.filename or "Uploaded document",
        "filename": file.filename,
        "mime_type": file.content_type,
        "size_bytes": len(data),
        "checksum": checksum,
        "document_type": document_type,
        "status": "uploaded",
        "storage_path": str(storage_path),
        "metadata": {"ingestion": "workspace_upload"},
    })
    row = get_document(document_id)
    return row_to_document(row)


@app.post("/api/inputs/smart-note", response_model=UploadedDocument)
def create_smart_note(request: SmartNoteRequest) -> dict:
    document_id = str(uuid4())
    document_type = detect_document_type(None, "text/plain", request.text)
    insert_document({
        "id": document_id,
        "source_type": "smart_note",
        "source_label": request.source_label,
        "mime_type": "text/plain",
        "size_bytes": len(request.text.encode("utf-8")),
        "checksum": sha256_bytes(request.text.encode("utf-8")),
        "document_type": document_type,
        "status": "uploaded",
        "raw_text": request.text,
        "metadata": request.metadata,
    })
    row = get_document(document_id)
    return row_to_document(row)


@app.post("/api/inputs/url", response_model=UploadedDocument)
def create_url_input(request: UrlInputRequest) -> dict:
    document_id = str(uuid4())
    insert_document({
        "id": document_id,
        "source_type": "url",
        "source_label": request.source_label or request.url,
        "mime_type": "text/uri-list",
        "size_bytes": len(request.url.encode("utf-8")),
        "checksum": sha256_bytes(request.url.encode("utf-8")),
        "document_type": "url_reference",
        "status": "uploaded",
        "raw_text": request.url,
        "metadata": {**request.metadata, "url": request.url, "content_fetch_status": "pending"},
    })
    row = get_document(document_id)
    return row_to_document(row)


@app.post("/api/inputs/voice-note", response_model=UploadedDocument)
def create_voice_note(request: VoiceNoteRequest) -> dict:
    document_id = str(uuid4())
    insert_document({
        "id": document_id,
        "source_type": "voice_note",
        "source_label": request.source_label,
        "mime_type": "text/plain",
        "size_bytes": len(request.transcript.encode("utf-8")),
        "checksum": sha256_bytes(request.transcript.encode("utf-8")),
        "document_type": "audio_transcript",
        "status": "uploaded",
        "raw_text": request.transcript,
        "metadata": {**request.metadata, "stt_status": "provided_transcript"},
    })
    row = get_document(document_id)
    return row_to_document(row)


@app.post("/api/inputs/code-scan", response_model=UploadedDocument)
def create_code_scan(request: CodeScanRequest) -> dict:
    document_id = str(uuid4())
    insert_document({
        "id": document_id,
        "source_type": "qr_barcode_scan",
        "source_label": request.source_label,
        "mime_type": "text/plain",
        "size_bytes": len(request.payload.encode("utf-8")),
        "checksum": sha256_bytes(request.payload.encode("utf-8")),
        "document_type": "code_reference",
        "status": "uploaded",
        "raw_text": request.payload,
        "metadata": request.metadata,
    })
    row = get_document(document_id)
    return row_to_document(row)


@app.post("/api/documents/{document_id}/process", response_model=ProcessResponse)
def process_document(document_id: str) -> dict:
    row = get_document(document_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")

    update_document(document_id, status="processing", action="processing_started")
    row = get_document(document_id)
    document_type = row["document_type"]
    preview: dict

    if row["source_type"] in {"smart_note", "voice_note"}:
        parsed = classify_note(row["raw_text"] or "")
        preview = {
            "columns": [],
            "rows": [],
            "raw_text": row["raw_text"],
            "parsed": parsed,
        }
        status = "review_required" if parsed["issues"] else "review_required"
        resume = _resume_from_smart_note(document_id, document_type, parsed, status)
    elif document_type == "general_ledger" and (row["filename"] or "").lower().endswith(".csv"):
        preview = parse_csv_ledger(Path(row["storage_path"]))
        status = "review_required" if preview["issues"] else "review_required"
        resume = _resume_from_ledger(document_id, document_type, preview, status)
    elif document_type == "general_ledger":
        preview = unsupported_xlsx_preview(row["filename"])
        status = "review_required"
        resume = _resume_from_ledger(document_id, document_type, preview, status)
    else:
        preview = {
            "columns": [],
            "rows": [],
            "raw_text": row["raw_text"],
            "note": "Dokumen sudah diterima. Parser detail untuk jenis ini belum aktif.",
        }
        status = "review_required"
        resume = {
            "document_id": document_id,
            "status": status,
            "document_type": document_type,
            "summary": "Dokumen berhasil diterima sebagai draft, tetapi membutuhkan parser/OCR tahap berikutnya.",
            "confidence": 0.45,
            "row_count": 0,
            "debit_total": 0,
            "credit_total": 0,
            "issues": [{"code": "parser_pending", "severity": "review_required", "message": "Parser detail belum aktif."}],
            "journal_candidates": [],
            "next_action": "Preview dokumen, lalu tunggu integrasi parser/OCR tahap berikutnya.",
        }

    document = update_document(
        document_id,
        status=status,
        preview=preview,
        resume=resume,
        action="processing_completed",
        metadata={"processor": "bizeto_psak_local_baseline"},
    )
    return {"document": document, "resume": resume}


@app.post("/api/documents/{document_id}/quick-check", response_model=QuickCheckResponse)
def quick_check(document_id: str) -> dict:
    row = get_document(document_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")
    result = quick_check_document(row)
    update_document(
        document_id,
        preview={"quick_check": result},
        action="quick_check_completed",
        metadata={"provider": result.get("provider"), "fallback": result.get("fallback")},
    )
    return result


@app.get("/api/documents/{document_id}/status", response_model=UploadedDocument)
def document_status(document_id: str) -> dict:
    row = get_document(document_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")
    return row_to_document(row)


@app.get("/api/documents/{document_id}/preview", response_model=PreviewResponse)
def document_preview(document_id: str) -> dict:
    row = get_document(document_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")
    preview = decode_json(row["preview_json"], {})
    return {
        "document_id": document_id,
        "document_type": row["document_type"],
        "columns": preview.get("columns", []),
        "rows": preview.get("rows", []),
        "raw_text": preview.get("raw_text"),
        "note": preview.get("note"),
    }


@app.get("/api/documents/{document_id}/resume", response_model=ProcessingResume)
def document_resume(document_id: str) -> dict:
    row = get_document(document_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")
    resume = decode_json(row["resume_json"], {})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume belum tersedia.")
    return resume


@app.post("/api/documents/{document_id}/confirm", response_model=UploadedDocument)
def confirm_document(document_id: str, request: ReviewDecisionRequest) -> dict:
    if get_document(document_id) is None:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")
    return update_document(document_id, status="confirmed", actor=request.actor, action="confirmed", metadata={"reason": request.reason})


@app.post("/api/documents/{document_id}/ocr-draft", response_model=UploadedDocument)
def save_ocr_draft(document_id: str, request: OcrDraftRequest) -> dict:
    row = get_document(document_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")
    preview = decode_json(row["preview_json"], {})
    preview["ocr_review_markdown"] = request.markdown
    return update_document(
        document_id,
        preview=preview,
        actor=request.actor,
        action="ocr_draft_saved",
        metadata={"draft_length": len(request.markdown)},
    )


@app.post("/api/documents/{document_id}/reject", response_model=UploadedDocument)
def reject_document(document_id: str, request: ReviewDecisionRequest) -> dict:
    if get_document(document_id) is None:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")
    return update_document(document_id, status="rejected", actor=request.actor, action="rejected", metadata={"reason": request.reason})


def _resume_from_ledger(document_id: str, document_type: str, preview: dict, status: str) -> dict:
    issues = preview.get("issues", [])
    return {
        "document_id": document_id,
        "status": status,
        "document_type": document_type,
        "summary": f"Buku besar dikenali. {preview.get('row_count', 0)} baris dibaca. Debit Rp {preview.get('debit_total', 0):,.2f}, kredit Rp {preview.get('credit_total', 0):,.2f}.",
        "confidence": 0.72 if issues else 0.86,
        "row_count": preview.get("row_count", 0),
        "debit_total": preview.get("debit_total", 0),
        "credit_total": preview.get("credit_total", 0),
        "issues": issues,
        "journal_candidates": [],
        "next_action": "Buka Preview untuk melihat baris sumber, lalu konfirmasi jika data sudah sesuai.",
    }


def _resume_from_smart_note(document_id: str, document_type: str, parsed: dict, status: str) -> dict:
    return {
        "document_id": document_id,
        "status": status,
        "document_type": document_type,
        "summary": f"Catatan dipahami sebagai {parsed['classification']} dengan nominal Rp {parsed['amount']:,.2f}.",
        "confidence": parsed["confidence"],
        "row_count": 1,
        "debit_total": parsed["amount"],
        "credit_total": parsed["amount"],
        "issues": parsed["issues"],
        "journal_candidates": parsed["journal_candidates"],
        "next_action": "Preview teks asli dan kandidat jurnal, lalu konfirmasi jika klasifikasi sudah benar.",
    }
