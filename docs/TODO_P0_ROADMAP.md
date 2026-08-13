# Bizeto PSAK - TODO Master Execution Roadmap (Active Core Plan)

> **Standard Specification & Master Roadmap**  
> **Document Code:** `SPEC-MASTER-ROADMAP`  
> **Target Release:** Bizeto PSAK v2.0.0-alpha  
> **Status:** Active Execution Baseline (Core Focus Mode)  

---

## 1. Executive Summary

Dokumen ini memuat daftar tugas **Core Input & Accounting** yang menjadi fokus utama eksekusi **Bizeto PSAK V2 Accounting Workspace**. 

Seluruh fitur sekunder non-core (seperti *pricing rules*, *alias resolver*, *waste accounting*, dan *voice omnibar*) ditangguhkan (*postponed*) sementara agar tim fokus 100% pada **Core Intake, File Router, Akuntansi PSAK, Skema Kanonik, dan Integrasi Gateway MCP (`mcp.samkarsa.com`)**.

---

## 2. Active Core Task Breakdown & Technical Specifications

```text
[P0-DATA-001] Canonical Data Schema & Migrations (9-Table Chain) [ACTIVE CORE]
[P0-ROUT-002] Multi-Source File Type Router & Magic Bytes Validation [ACTIVE CORE]
[P0-GATE-003] Samkarsa MCP Server Gateway Integration (mcp.samkarsa.com) [ACTIVE CORE]
[P0-LIFE-004] Explicit 13-Stage Workspace State Lifecycle Engine [ACTIVE CORE]
[P0-POST-005] Zero-Auto-Post Enforcement & Immutable Ledger Rules [ACTIVE CORE]
[P0-EVID-006] High-Precision Evidence Locator Engine [ACTIVE CORE]
[P1-TAX-007] Configurable Default Tax (11%) & COGS (88%) via Natural Language Chat/Voice [ACTIVE CORE]
[P1-ISOL-008] 2-Tier Hybrid AI Learning Architecture (Global Base + Tenant Private) [ACTIVE CORE]
[P1-VEC-012] ONNX Local Vector Pre-Classifier (<10ms Zero-Latency Intent Gate) [ACTIVE CORE]
[P1-PRIC-014] Natural Language Multi-Tier & Bundle Pricing Contract Engine [POSTPONED]
[P1-ALIAS-015] AI-Powered Entity Resolution & Master Product Alias Engine [POSTPONED]
[P1-WASTE-016] PSAK Inventory Loss & Waste Accounting Engine [POSTPONED]
[P1-VOICE-017] Multimodal Voice-to-Accounting Omnibar Engine [POSTPONED]
[P1-TRAIN-018] Active Learning & Human Correction Loop [POSTPONED]
```

---

### Task P0-DATA-001: Canonical Data Schema & Database Migration [ACTIVE CORE]
- **Objective:** Menggantikan relasi `OCRTask` tunggal dengan 9 tabel kanonik berantai untuk melacak dokumen dari intake hingga posting final.
- **Specification:**
  - `processing_sessions`: Menampung konteks tenant, periode, dan user.
  - `source_documents`: Menyimpan metadata file mentah, checksum SHA-256, dan MIME type asli.
  - `processing_runs`: Melacak eksekusi tool/worker, model AI, latency, dan token cost.
  - `extracted_facts`: Hasil ekstraksi mentah dari AI/tool lengkap dengan confidence & evidence locator.
  - `normalized_transactions`: Objek transaksi terstandarisasi sebelum pembentukan jurnal.
  - `journal_proposals`: Usulan baris debit/kredit (COA, tax, cost center, amount).
  - `processing_exceptions`: Daftar anomali/error yang membutuhkan review manusia.
  - `approval_events`: Audit log eksplisit untuk tindakan konfirmasi/approval.
  - `final_packages`: Paket data terkunci dengan Merkle proof / immutable hash.

- **Checklist Executions:**
  - [ ] Implementasi Pydantic Schemas di `backend/app/schemas.py`.
  - [ ] Buat file migrasi SQL/ORModel untuk 9 tabel kanonik.
  - [ ] Hubungkan `storage.py` agar menyimpan file mentah dengan penamaan berdasar SHA-256.

---

### Task P0-ROUT-002: Multi-Source File Type Router & Magic Bytes Validation [ACTIVE CORE]
- **Objective:** Menerima dan memproses berbagai format file secara aman berdasarkan *magic bytes*, bukan hanya ekstensi nama file.
- **Supported Formats & Tools:**
  - `Image (JPG/PNG/WEBP)` ➔ Vision OCR Engine via MCP Gateway.
  - `PDF Document` ➔ PDF Text/Table Extractor + Fallback OCR per halaman.
  - `Spreadsheet (XLSX/CSV)` ➔ General Ledger Parser (`ledger_parser.py`).
  - `Audio (MP3/WAV/M4A)` ➔ Speech-to-Text Transcriber Adapter.
  - `Email (EML/MSG)` ➔ Header & Attachment Extractor.

- **Checklist Executions:**
  - [ ] Implementasi fungsi `detect_mime_by_magic_bytes()` di `backend/app/services/document_router.py`.
  - [ ] Tambahkan handler async per-tipe file di `document_router.py`.
  - [ ] Tambahkan error handler untuk file terenkripsi / korup dengan menaikkan exception `EXC_FILE_UNREADABLE`.

---

### Task P0-GATE-003: Samkarsa MCP Server Gateway Integration (`https://mcp.samkarsa.com`) [ACTIVE CORE]
- **Objective:** Mengintegrasikan seluruh pemrosesan AI (Chat Diskusi, OCR Vision, Smart Parser, & RAG COA Context) melalui AI Gateway terpusat **MCP Server Samkarsa**.
- **Target Endpoints & Protocols:**
  - **Chat & Discussion**: `POST https://mcp.samkarsa.com/api/chat` (Digunakan oleh `mcp_chat_client.py` untuk intent-gate & tanya jawab).
  - **Vision OCR & Document Parsing**: `POST https://mcp.samkarsa.com/api/tools/ocr` / `parse_transaction` (Digunakan oleh `mcp_vision_client.py`).
  - **RAG & Vector Retrieval**: Embedding & RAG Context per-tenant untuk pemetaan Chart of Accounts (COA) dan historical feedback.
- **Resilience & Fallback Strategy:**
  - Implemen **Provider Fallback** (Gemini ➔ Claude ➔ OpenAI / Fallback Parser) jika endpoint MCP mengalami error/timeout.
  - Simpan `mcp_server_version`, `model_name`, `provider`, `input_tokens`, `output_tokens`, dan `latency_ms` pada setiap record `processing_runs`.

- **Checklist Executions:**
  - [x] Hubungkan `mcp_chat_client.py` ke endpoint prod `https://mcp.samkarsa.com/api/chat`.
  - [ ] Hubungkan `mcp_vision_client.py` ke MCP tool `ocr_receipt` & `parse_transaction` di `https://mcp.samkarsa.com`.
  - [ ] Tambahkan header autentikasi `X-MCP-API-KEY` & `X-Tenant-ID` pada setiap outgoing HTTP request.
  - [ ] Implemen retry policy dengan exponential backoff (max 3 retry) untuk request gateway.

---

### Task P0-LIFE-004: Explicit 13-Stage Workspace State Lifecycle Engine [ACTIVE CORE]
- **Objective:** Memisahkan status "Selesai dibaca AI" dengan "Disetujui Manusia" dan "Diposting ke Buku Besar".
- **State Transition Flow:**
  ```text
  DRAFT ──► QUEUED ──► PROCESSING ──► NEEDS_REVIEW ──► READY_FOR_CONFIRMATION
                                           │                        │
                                           ▼                        ▼
                                       REJECTED            CONFIRMED
                                                                    │
                                                                    ▼
                                                            MAPPING_READY
                                                                    │
                                                                    ▼
  FINAL ◄── POSTED ◄── APPROVED ◄──────────────────────────────────┘
    │
    └──► SUPERSEDED (jika ada Jurnal Pembalik)
  ```

- **Checklist Executions:**
  - [ ] Definisikan `WorkspaceStageEnum` di `backend/app/schemas.py`.
  - [ ] Buat *State Transition Guard* untuk mencegah lompatan status ilegal (misal: `DRAFT` langsung ke `POSTED`).
  - [ ] Tampilkan badge status real-time di UI Frontend Workspace.

---

### Task P0-POST-005: Zero-Auto-Post Enforcement & Immutable Ledger Rules [ACTIVE CORE]
- **Objective:** Menjamin AI tidak pernah melakukan posting otomatis dan transaksi yang sudah *posted* tidak bisa diedit/dihapus secara langsung.
- **Specification:**
  - Seluruh transaksi baru yang dibuat AI wajib berstatus awal `DRAFT` atau `JOURNAL_PROPOSAL`.
  - Posting hanya bisa dipicu oleh aksi manusia berwenang (Staf/Manajer Akuntansi).
  - Dilarang menyediakan fungsi `unpost` atau `DELETE` pada transaksi `POSTED`. Pembatalan/koreksi wajib melalui **Jurnal Pembalik (*Reversal Journal*)**.

- **Checklist Executions:**
  - [ ] Matikan flag `auto_post_journal` di seluruh service backend.
  - [ ] Buat endpoint khusus `POST /api/v1/sessions/{id}/approve-and-post`.
  - [ ] Buat service `create_reversal_journal()` untuk menangani transaksi yang perlu dibatalkan.

---

### Task P0-EVID-006: High-Precision Evidence Locator Engine [ACTIVE CORE]
- **Objective:** Menghubungkan setiap angka/fakta hasil AI dengan koordinat visual/lokasi di dokumen asli untuk keperluan inspeksi audit.
- **Schema Locator:**
  ```json
  {
    "field_name": "grand_total",
    "extracted_value": 5000000,
    "confidence_score": 0.96,
    "evidence": {
      "source_id": "DOC-2026-0813-001",
      "page_number": 1,
      "bounding_box": [0.62, 0.78, 0.96, 0.91],
      "raw_text_snippet": "TOTAL BAYAR: Rp 5.000.000,-"
    }
  }
  ```

- **Checklist Executions:**
  - [ ] Update `mcp_vision_client.py` agar mengembalikan Bounding Box ROI (Region of Interest) dari gateway MCP.
  - [ ] Update `ledger_parser.py` agar mengembalikan koordinat Cell (misal: `Sheet1!C14`).
  - [ ] Sediakan payload evidence ke Frontend untuk menyorot (*highlight*) dokumen pada panel Inspector.

---

### Task P1-TAX-007: Configurable Tax (11%) & COGS Rate (88%) via Natural Language Chat/Voice [ACTIVE CORE]
- **Objective:** Mengizinkan pemilik toko mengubah pengaturan PPN & HPP secara fleksibel kapan saja melalui perintah chat atau voice note secara alami.
- **Specification:**
  - **Default Global**: PPN **11%** dan HPP/COGS Rate **88%** (margin retail **12%**).
  - **Natural Language Configuration Engine**:
    - Pengguna dapat mengetik atau mengirimkan voice note (misal: *"Gunakan PPN 11% dan HPP 90%"* atau *"Set margin toko 15% dan PPN 0%"*).
    - AI Intent Parser mendeteksi `POLICY_CONFIGURATION` dan otomatis memperbarui tabel `tenant_accounting_policies` & config file tenant.
    - AI memberikan respon balasan konfirmasi rinci & ramah.
  - **Execution Policy**:
    1. Jika bukti transaksi mencantumkan PPN/HPP eksplisit, gunakan fakta dokumen (`extracted_fact`).
    2. Jika PPN/HPP tidak tertera di bukti transaksi, AI otomatis menerapkan **Configured Tenant Default** tanpa memblokir alur dengan konfirmasi manual berulang.

- **Checklist Executions:**
  - [ ] Implementasi `IntentEngine` untuk mendeteksi `POLICY_CONFIGURATION` pada chat/voice.
  - [ ] Buat skema konfigurasi `tenant_accounting_policies` (default `tax_rate=0.11`, `cogs_rate=0.88`).
  - [ ] Update `smart_note_parser.py` & mapper jurnal untuk menggunakan fallback dari tenant policy jika fakta tidak ditemukan.

---

### Task P1-ISOL-008: 2-Tier Hybrid AI Learning Architecture (Global Base + Tenant Private) [ACTIVE CORE]
- **Objective:** Menggabungkan kecerdasan kolektif global (*semakin dipakai semakin cerdas*) dengan isolasi data rahasia perusahaan.
- **Specification:**
  - **Level 1 — Global Base Knowledge (Kecerdasan Kolektif)**: Pembelajaran pola OCR nota umum, format struk Indonesia, dan istilah akuntansi umum di-anonimkan (*sanitized & anonymized*) sehingga tenant baru langsung menikmati AI yang sudah cerdas sejak awal tanpa belajar dari nol.
  - **Level 2 — Tenant Private Isolation (Data Rahasia Perusahaan)**: Data sensitif (nama supplier/pelanggan khusus, daftar COA internal, harga beli rahasia, dan riwayat koreksi kasir) dikunci 100% rapat per `tenant_id`.

- **Checklist Executions:**
  - [ ] Buat sanitization pipeline untuk menganonimkan feedback OCR umum ke dalam Global Base RAG.
  - [ ] Tambahkan filter `tenant_id` wajib untuk data sensitif (COA, supplier, customer, & transaksi internal).

---

### Task P1-VEC-012: ONNX Local Vector Pre-Classifier (<10ms Zero-Latency Intent Gate) [ACTIVE CORE]
- **Objective:** Menggunakan model ONNX embedding lokal (`onnx_embed.py`) untuk memprediksi intent transaksi (Penjualan, Pembelian, atau Kas Global) dalam <10ms sebelum memanggil MCP Gateway.
- **Checklist Executions:**
  - [ ] Integrasikan `classify_via_vector_similarity` ke `backend/app/services/quick_check.py`.
  - [ ] Tambahkan cache vector anchors lokal di backend Python FastAPI.

---

## 3. Active Core Progress Tracking & Definition of Done (DoD)

| Task ID | Item Pekerjaan | Target Completion | Verification Method | Status |
|---|---|---|---|---|
| `P0-DATA-001` | Canonical 9-Table Schema | Sprint 1 | Migration Test & DB Inspector | ⏳ In Progress |
| `P0-ROUT-002` | Multi-Source File Router | Sprint 1 | Unit Test PDF/XLSX/Audio/Image | ⏳ In Progress |
| `P0-GATE-003` | MCP Server Gateway Integration | Sprint 1 | E2E API Test mcp.samkarsa.com | ⏳ In Progress |
| `P0-LIFE-004` | 13-Stage Lifecycle Engine | Sprint 1 | State Machine Assertion | 📅 Active Plan |
| `P0-POST-005` | Zero-Auto-Post & Reversal Rule | Sprint 2 | Audit Trail & Accounting Rule Test | 📅 Active Plan |
| `P0-EVID-006` | Evidence Bounding Box Locator | Sprint 2 | UI Inspector Highlight Verification | 📅 Active Plan |
| `P1-TAX-007` | Configurable Tax/HPP via Chat/Voice | Sprint 2 | Natural Language Intent Test | 📅 Active Plan |
| `P1-ISOL-008` | 2-Tier Hybrid AI Learning Architecture | Sprint 2 | Security & Collective Learning Test | 📅 Active Plan |
| `P1-VEC-012` | ONNX Local Vector Pre-Classifier | Sprint 2 | Latency & Intent Benchmark Test | 📅 Active Plan |
