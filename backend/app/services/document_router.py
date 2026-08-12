from pathlib import Path


def detect_document_type(filename: str | None, mime_type: str | None = None, content: str | None = None) -> str:
    suffix = Path(filename or "").suffix.lower()
    mime = (mime_type or "").lower()
    body = (content or "").lower()

    if any(keyword in body for keyword in ["bayar", "dibayar", "sewa", "tunai", "transfer", "ppn", "invoice", "faktur", "pembelian"]):
        return "natural_language_transaction"
    if suffix in {".xlsx", ".xls", ".csv"}:
        return "general_ledger"
    if suffix == ".pdf" or "pdf" in mime:
        return "pdf_document"
    if suffix in {".jpg", ".jpeg", ".png"} or mime.startswith("image/"):
        return "image_evidence"
    if suffix in {".txt", ".md"} or mime.startswith("text/"):
        return "text_document"
    if suffix in {".m4a", ".mp3", ".wav"} or mime.startswith("audio/"):
        return "audio_note"
    return "unknown"
