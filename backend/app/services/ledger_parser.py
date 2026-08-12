from __future__ import annotations

import csv
from io import StringIO
from pathlib import Path
from typing import Any


DATE_KEYS = {"tanggal", "date", "tgl", "transaction_date"}
ACCOUNT_CODE_KEYS = {"kode akun", "account code", "coa", "kode", "akun"}
ACCOUNT_NAME_KEYS = {"nama akun", "account name", "account"}
DEBIT_KEYS = {"debit", "db"}
CREDIT_KEYS = {"credit", "kredit", "cr"}
DESCRIPTION_KEYS = {"deskripsi", "description", "keterangan", "memo", "uraian"}
REFERENCE_KEYS = {"referensi", "reference", "ref", "no bukti", "voucher"}


def _clean_number(value: Any) -> float:
    if value is None:
        return 0.0
    text = str(value).strip()
    if not text:
        return 0.0
    text = text.replace("Rp", "").replace("IDR", "").replace(" ", "")
    if "," in text and "." in text:
        text = text.replace(".", "").replace(",", ".")
    elif "," in text:
        text = text.replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return 0.0


def _pick(row: dict[str, Any], candidates: set[str]) -> Any:
    normalized = {key.strip().lower(): value for key, value in row.items()}
    for key in candidates:
        if key in normalized:
            return normalized[key]
    for actual_key, value in normalized.items():
        if any(candidate in actual_key for candidate in candidates):
            return value
    return None


def parse_csv_ledger(path: Path, limit: int = 250) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8-sig", errors="replace")
    sample = text[:4096]
    try:
      dialect = csv.Sniffer().sniff(sample)
    except csv.Error:
      dialect = csv.excel

    reader = csv.DictReader(StringIO(text), dialect=dialect)
    columns = reader.fieldnames or []
    rows: list[dict[str, Any]] = []
    debit_total = 0.0
    credit_total = 0.0
    issues: list[dict[str, Any]] = []

    for index, row in enumerate(reader, start=1):
        debit = _clean_number(_pick(row, DEBIT_KEYS))
        credit = _clean_number(_pick(row, CREDIT_KEYS))
        debit_total += debit
        credit_total += credit
        rows.append({
            "row": index,
            "date": _pick(row, DATE_KEYS),
            "account_code": _pick(row, ACCOUNT_CODE_KEYS),
            "account_name": _pick(row, ACCOUNT_NAME_KEYS),
            "description": _pick(row, DESCRIPTION_KEYS),
            "reference": _pick(row, REFERENCE_KEYS),
            "debit": debit,
            "credit": credit,
        })
        if len(rows) >= limit:
            break

    gap = round(debit_total - credit_total, 2)
    if abs(gap) > 0.01:
        issues.append({
            "code": "debit_credit_unbalanced",
            "severity": "review_required",
            "message": "Debit dan kredit belum seimbang.",
            "amount_gap": gap,
        })

    return {
        "columns": columns,
        "rows": rows,
        "row_count": len(rows),
        "debit_total": round(debit_total, 2),
        "credit_total": round(credit_total, 2),
        "issues": issues,
    }


def unsupported_xlsx_preview(filename: str | None) -> dict[str, Any]:
    return {
        "columns": [],
        "rows": [],
        "row_count": 0,
        "debit_total": 0.0,
        "credit_total": 0.0,
        "issues": [{
            "code": "xlsx_parser_pending",
            "severity": "review_required",
            "message": f"{filename or 'Workbook'} sudah dikenali sebagai buku besar, tetapi parser XLSX detail belum aktif.",
        }],
    }
