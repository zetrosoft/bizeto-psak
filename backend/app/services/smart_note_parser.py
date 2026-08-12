from __future__ import annotations

import re
from datetime import date
from typing import Any


MULTIPLIERS = {
    "rb": 1_000,
    "ribu": 1_000,
    "jt": 1_000_000,
    "juta": 1_000_000,
    "m": 1_000_000,
    "miliar": 1_000_000_000,
}

NUMBER_WORDS = {
    "nol": 0,
    "satu": 1,
    "se": 1,
    "dua": 2,
    "tiga": 3,
    "empat": 4,
    "lima": 5,
    "enam": 6,
    "tujuh": 7,
    "delapan": 8,
    "sembilan": 9,
    "sepuluh": 10,
    "sebelas": 11,
    "dua belas": 12,
    "tiga belas": 13,
    "empat belas": 14,
    "lima belas": 15,
    "enam belas": 16,
    "tujuh belas": 17,
    "delapan belas": 18,
    "sembilan belas": 19,
    "dua puluh": 20,
}


def extract_amount(text: str) -> float:
    normalized = text.lower().replace("rp", " ").replace("idr", " ")
    shorthand = re.search(r"(\d+(?:[,.]\d+)?)\s*(rb|ribu|jt|juta|miliar)\b", normalized)
    if shorthand:
        value = float(shorthand.group(1).replace(",", "."))
        return value * MULTIPLIERS[shorthand.group(2)]
    number = re.search(r"(\d[\d.,]*)", normalized)
    if not number:
        word_amount = _extract_word_amount(normalized)
        return word_amount
    raw = number.group(1)
    if "," in raw and "." in raw:
        raw = raw.replace(".", "").replace(",", ".")
    else:
        raw = raw.replace(".", "").replace(",", "")
    try:
        return float(raw)
    except ValueError:
        return 0.0


def _extract_word_amount(text: str) -> float:
    for word, value in sorted(NUMBER_WORDS.items(), key=lambda item: len(item[0]), reverse=True):
        for multiplier_word, multiplier in MULTIPLIERS.items():
            if re.search(rf"\b{re.escape(word)}\s+{re.escape(multiplier_word)}\b", text):
                return float(value * multiplier)
    return 0.0


def classify_note(text: str) -> dict[str, Any]:
    body = text.lower()
    amount = extract_amount(text)

    if any(word in body for word in ["solar", "bensin", "bbm", "bahan bakar"]):
        debit_account = "Beban Operasional Kendaraan"
        classification = "vehicle_operating_expense"
    elif any(word in body for word in ["sewa", "rental"]):
        debit_account = "Beban Sewa"
        classification = "rental_expense"
    elif any(word in body for word in ["bahan baku", "material", "supplier", "faktur"]):
        debit_account = "Persediaan Bahan Baku"
        classification = "raw_material_purchase"
    elif any(word in body for word in ["mesin", "alat berat", "kendaraan", "aset"]):
        debit_account = "Aset Tetap"
        classification = "fixed_asset_candidate"
    else:
        debit_account = "Beban Operasional"
        classification = "operational_expense_candidate"

    credit_account = "Kas" if any(word in body for word in ["tunai", "cash"]) else "Kas/Bank/Utang"
    confidence = 0.78 if amount > 0 else 0.52
    issues = []
    if amount <= 0:
        issues.append({
            "code": "amount_not_found",
            "severity": "review_required",
            "message": "Nominal belum terdeteksi dari catatan.",
        })

    return {
        "transaction_date": str(date.today()),
        "classification": classification,
        "amount": amount,
        "description": text,
        "journal_candidates": [
            {"side": "debit", "account": debit_account, "amount": amount, "reason": "Klasifikasi awal dari kata kunci transaksi."},
            {"side": "credit", "account": credit_account, "amount": amount, "reason": "Akun lawan ditentukan dari metode pembayaran."},
        ] if amount > 0 else [],
        "issues": issues,
        "confidence": confidence,
    }
