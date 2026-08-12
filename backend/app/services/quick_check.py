from __future__ import annotations

import json
import zipfile
from pathlib import Path
from typing import Any

from app.services.ledger_parser import parse_csv_ledger
from app.services.mcp_vision_client import call_mcp_ocr_receipt


def quick_check_document(row: Any) -> dict[str, Any]:
    path = Path(row["storage_path"]) if row["storage_path"] else None
    filename = row["filename"] or row["source_label"]
    mime_type = row["mime_type"] or "application/octet-stream"
    document_type = row["document_type"]
    metadata: dict[str, Any] = {
        "filename": filename,
        "mime_type": mime_type,
        "size_bytes": row["size_bytes"],
        "checksum": row["checksum"],
        "document_type": document_type,
    }

    if not path or not path.exists():
        markdown = _base_markdown(filename, document_type, metadata, ["File tidak ditemukan di draft storage."])
        return _response(row, markdown, metadata, provider="local", fallback=True)

    header = path.read_bytes()[:32]
    metadata["magic_header_hex"] = header.hex(" ")[:96]

    if document_type == "general_ledger" and filename.lower().endswith(".csv"):
        parsed = parse_csv_ledger(path, limit=5)
        metadata.update({
            "columns": parsed.get("columns", []),
            "sample_rows": parsed.get("rows", []),
            "row_count_sample": parsed.get("row_count", 0),
            "debit_total_sample": parsed.get("debit_total", 0),
            "credit_total_sample": parsed.get("credit_total", 0),
            "issues": parsed.get("issues", []),
        })
        markdown = _csv_markdown(filename, metadata)
        return _response(row, markdown, metadata, provider="local_csv_header")

    if document_type == "general_ledger" and filename.lower().endswith((".xlsx", ".xls")):
        workbook_info = _inspect_xlsx(path)
        metadata.update(workbook_info)
        markdown = _base_markdown(filename, document_type, metadata, [
            "Workbook dikenali dari header ZIP/XLSX.",
            f"Sheet terdeteksi: {', '.join(workbook_info.get('sheet_candidates', [])[:5]) or 'belum terbaca'}",
            "Parser detail XLSX akan dijalankan pada proses lanjut.",
        ])
        return _response(row, markdown, metadata, provider="local_xlsx_header")

    if document_type == "image_evidence":
        image_bytes = path.read_bytes()
        ocr = call_mcp_ocr_receipt(image_bytes, mime_type if mime_type.startswith("image/") else "image/jpeg")
        extracted_text = ocr.get("text", "")
        metadata["ocr_preview"] = _safe_json_or_text(extracted_text)
        markdown = _ocr_markdown(filename, metadata, extracted_text, bool(ocr.get("fallback")))
        return _response(row, markdown, metadata, provider=str(ocr.get("provider")), fallback=bool(ocr.get("fallback")), extracted_text=extracted_text)

    if document_type == "pdf_document":
        markdown = _base_markdown(filename, document_type, metadata, [
            "PDF dikenali dari ekstensi/MIME.",
            "Tahap quick-check saat ini belum melakukan render halaman PDF.",
            "Pada proses lanjut, PDF text-based akan diekstrak teksnya; PDF scan akan masuk jalur Vision.",
        ])
        return _response(row, markdown, metadata, provider="local_pdf_header")

    if document_type == "text_document":
        text = path.read_text(encoding="utf-8", errors="replace")[:1600]
        metadata["text_preview"] = text
        markdown = _base_markdown(filename, document_type, metadata, [
            "Dokumen teks berhasil dibaca sebagian.",
            f"Preview awal:\n\n```text\n{text[:700]}\n```",
        ])
        return _response(row, markdown, metadata, provider="local_text_header", extracted_text=text)

    markdown = _base_markdown(filename, document_type, metadata, [
        "File berhasil diterima sebagai draft.",
        "Jenis ini belum punya pembacaan detail pada tahap quick-check.",
    ])
    return _response(row, markdown, metadata, provider="local_header")


def _inspect_xlsx(path: Path) -> dict[str, Any]:
    info: dict[str, Any] = {"sheet_candidates": [], "xlsx_parts": []}
    try:
        with zipfile.ZipFile(path) as workbook:
            names = workbook.namelist()
            info["xlsx_parts"] = names[:20]
            info["sheet_candidates"] = [
                name.replace("xl/worksheets/", "").replace(".xml", "")
                for name in names
                if name.startswith("xl/worksheets/") and name.endswith(".xml")
            ]
    except zipfile.BadZipFile:
        info["issues"] = [{"code": "invalid_xlsx_zip", "message": "File tidak terbaca sebagai XLSX/ZIP valid."}]
    return info


def _response(row: Any, markdown: str, metadata: dict[str, Any], provider: str, fallback: bool = False, extracted_text: str | None = None) -> dict[str, Any]:
    return {
        "document_id": row["id"],
        "document_type": row["document_type"],
        "source_label": row["source_label"],
        "markdown": markdown,
        "provider": provider,
        "fallback": fallback,
        "extracted_text": extracted_text,
        "metadata": metadata,
    }


def _base_markdown(filename: str, document_type: str, metadata: dict[str, Any], bullets: list[str]) -> str:
    bullet_text = "\n".join(f"- {item}" for item in bullets)
    return f"""### Cek cepat dokumen

**File:** `{filename}`  
**Jenis awal:** `{document_type}`  
**MIME:** `{metadata.get('mime_type')}`  
**Ukuran:** {metadata.get('size_bytes')} bytes

{bullet_text}

### Rencana proses

1. Baca konten sesuai jenis dokumen.
2. Normalisasi ke schema akuntansi Bizeto PSAK.
3. Validasi angka dan bukti asal.
4. Tampilkan preview dan resume untuk review user.

Belum ada data yang diproses ke tahap jurnal. Klik **Proses lanjut** jika ingin melanjutkan."""


def _csv_markdown(filename: str, metadata: dict[str, Any]) -> str:
    columns = metadata.get("columns", [])
    rows = metadata.get("sample_rows", [])
    sample = "\n".join(
        f"- Baris {row.get('row')}: {row.get('date') or '-'} · {row.get('account_code') or '-'} · debit {row.get('debit')} · kredit {row.get('credit')}"
        for row in rows[:5]
    ) or "- Belum ada baris sampel terbaca."
    return f"""### Cek cepat buku besar

**File:** `{filename}`  
**Jenis awal:** `general_ledger`  
**Header terbaca:** {', '.join(f'`{col}`' for col in columns) or '-'}

### Sampel awal

{sample}

### Catatan

- File dikenali sebagai buku besar CSV.
- Pembacaan ini baru membaca header dan beberapa baris awal.
- Belum ada posting jurnal atau finalisasi.

### Rencana proses

1. Mapping kolom tanggal, akun, debit, kredit, deskripsi, dan referensi.
2. Validasi debit/kredit.
3. Buat preview tabel lengkap.
4. Buat resume issue untuk review.

Klik **Proses lanjut** jika ingin membaca dan memvalidasi data penuh."""


def _ocr_markdown(filename: str, metadata: dict[str, Any], extracted_text: str, fallback: bool) -> str:
    parsed = _safe_json_or_text(extracted_text)
    preview = _ocr_table(parsed)
    return f"""### Hasil pembacaan OCR Vision

{preview}"""


def _safe_json_or_text(text: str | None) -> Any:
    if not text:
        return ""
    clean = text.strip().replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        return clean


def _ocr_table(parsed: Any) -> str:
    if isinstance(parsed, dict):
        rows: list[tuple[str, str]] = []
        for key, value in parsed.items():
            if isinstance(value, (dict, list)):
                value_text = json.dumps(value, ensure_ascii=False)
            else:
                value_text = "" if value is None else str(value)
            rows.append((_human_key(key), value_text))
        return _markdown_table(["Field", "Hasil OCR"], rows[:30])

    if isinstance(parsed, list):
        rows = [(str(index + 1), json.dumps(item, ensure_ascii=False) if isinstance(item, (dict, list)) else str(item)) for index, item in enumerate(parsed[:30])]
        return _markdown_table(["No", "Hasil OCR"], rows)

    text = str(parsed or "").strip()
    if not text:
        return _markdown_table(["Field", "Hasil OCR"], [("Status", "Belum ada teks terbaca dari OCR.")])

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if len(lines) > 1:
        return _markdown_table(["Baris", "Teks terbaca"], [(str(index + 1), line) for index, line in enumerate(lines[:30])])

    return _markdown_table(["Field", "Hasil OCR"], [("Teks terbaca", text[:1800])])


def _markdown_table(headers: list[str], rows: list[tuple[str, str]]) -> str:
    safe_headers = [_escape_cell(header) for header in headers]
    body = "\n".join(
        f"| {_escape_cell(left)} | {_escape_cell(right)} |"
        for left, right in rows
    )
    return "\n".join([
        f"| {' | '.join(safe_headers)} |",
        f"| {' | '.join('---' for _ in safe_headers)} |",
        body or f"| {' | '.join('-' for _ in safe_headers)} |",
    ])


def _escape_cell(value: str) -> str:
    return str(value).replace("|", "\\|").replace("\n", "<br>")


def _human_key(value: str) -> str:
    return str(value).replace("_", " ").replace("-", " ").strip().title()
