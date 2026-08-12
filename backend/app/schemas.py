from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


SourceType = Literal[
    "file_upload",
    "url",
    "smart_note",
    "voice_note",
    "camera_capture",
    "qr_barcode_scan",
    "manual_adjustment",
]

DocumentStatus = Literal[
    "uploaded",
    "processing",
    "review_required",
    "confirmed",
    "rejected",
    "failed",
    "finalized",
]


class RawInputEnvelope(BaseModel):
    source_type: SourceType
    source_label: str
    content: str | None = None
    mime_type: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class UploadedDocument(BaseModel):
    id: str
    source_type: SourceType
    source_label: str
    filename: str | None = None
    mime_type: str | None = None
    size_bytes: int = 0
    checksum: str | None = None
    document_type: str = "unknown"
    status: DocumentStatus
    captured_at: datetime
    updated_at: datetime


class ProcessingResume(BaseModel):
    document_id: str
    status: DocumentStatus
    document_type: str
    summary: str
    confidence: float = Field(ge=0, le=1)
    row_count: int = 0
    debit_total: float = 0
    credit_total: float = 0
    issues: list[dict[str, Any]] = Field(default_factory=list)
    journal_candidates: list[dict[str, Any]] = Field(default_factory=list)
    next_action: str


class PreviewResponse(BaseModel):
    document_id: str
    document_type: str
    columns: list[str] = Field(default_factory=list)
    rows: list[dict[str, Any]] = Field(default_factory=list)
    raw_text: str | None = None
    note: str | None = None


class ProcessResponse(BaseModel):
    document: UploadedDocument
    resume: ProcessingResume


class ReviewDecisionRequest(BaseModel):
    actor: str = "workspace_user"
    reason: str | None = None


class SmartNoteRequest(BaseModel):
    text: str
    source_label: str = "Smart note"
    metadata: dict[str, Any] = Field(default_factory=dict)


class VoiceNoteRequest(BaseModel):
    transcript: str
    source_label: str = "Voice note"
    metadata: dict[str, Any] = Field(default_factory=dict)


class CodeScanRequest(BaseModel):
    payload: str
    source_label: str = "QR / barcode scan"
    metadata: dict[str, Any] = Field(default_factory=dict)


class UrlInputRequest(BaseModel):
    url: str
    source_label: str = "URL"
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    message: str
    locale: Literal["en", "id"] = "id"
    has_source: bool = False
    source_summary: str | None = None
    phase: str = "discussion"
    history: list[dict[str, str]] = Field(default_factory=list)


class ChatResponse(BaseModel):
    response: str
    provider: str
    fallback: bool = False
