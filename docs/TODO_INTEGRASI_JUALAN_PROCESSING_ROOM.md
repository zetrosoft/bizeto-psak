# TODO Integrasi Codebase Jualan ke Bizeto PSAK Workspace

## 1. Kesimpulan audit

Codebase `/Users/user/Kerjaan/jualan` sudah memiliki fondasi pemrosesan yang dapat digunakan kembali:

- **Sajen** memiliki FastAPI, Celery, PostgreSQL, Redis, MCP client, OCR worker, parser, RAG, COA, dan accounting service.
- **Blonjo** memiliki upload nota, polling status OCR, Smart Note, preview hasil parsing, dialog konfirmasi jurnal, dan submit transaksi.
- Mapping jurnal sudah mendukung beberapa baris debit/kredit, `tax_amount`, `cogs_amount`, fallback tenant/global, pengalihan kas ke bank/utang/piutang, dan validasi double-entry.
- Siklus transaksi sudah mengenal `DRAFT` dan `POSTED`, termasuk pembuatan `Transaction`, `JournalEntry`, `InventoryLog`, dan feedback koreksi OCR.

Namun, kode tersebut belum dapat dipindahkan apa adanya ke Workspace karena pusat alurnya masih berupa **OCR nota retail**. Workspace membutuhkan pipeline lintas sumber: foto, PDF, XLSX/CSV, audio, email attachment, dan buku besar.

## 2. Temuan kode yang sudah tersedia

| Area | Implementasi saat ini | Nilai reuse |
|---|---|---|
| Upload OCR | `sajen/app/api/v1/ocr.py` route `/api/v1/ocr/upload` membuat `OCRTask` dan dispatch Celery | Tinggi; dapat menjadi adapter Intake |
| OCR async | `sajen/app/workers/ocr_worker.py::process_receipt_ocr` | Tinggi untuk gambar; perlu router tipe file |
| MCP | `sajen/app/services/mcp_client.py` dengan `ocr_receipt`, `parse_transaction`, alias search, dan template visual | Tinggi; perlu kontrak tool generik dan observability |
| Parser teks | `sajen/app/services/smart_parser.py` | Tinggi untuk normalisasi bahasa Indonesia, angka, tanggal, item, tipe transaksi |
| Parse route | `/api/v1/finance/transactions/parse` | Sedang; logic-nya perlu dipisahkan dari endpoint transaksi menjadi Processing Stage |
| RAG/few-shot | `get_rag_context`, `OCRFeedback`, alias item, template pembelajaran | Tinggi, tetapi harus dibatasi oleh tenant dan versi rule |
| Mapping jurnal | `JournalMapping`, `JournalMappingLine`, `get_auto_journal_entries` | Tinggi; cocok untuk Journal Proposal |
| Accounting commit | `create_transaction_with_journal` | Tinggi setelah status, approval, dan immutable rule diperbaiki |
| Draft/post | `TransactionStatus`, `/transactions/{id}/post` | Sedang; status perlu diperluas menjadi lifecycle Workspace |
| UI review | `useOcrUpload`, `SmartNoteTab`, `ConfirmJournalDialog`, `useSmartConfirm` | Sedang; pola review bisa diambil, tetapi UI harus session/card/inspector-based |
| Reporting | `services/reports.py`, general ledger, P&L, balance sheet, cash flow | Tinggi sebagai downstream dari posted ledger |

## 3. Alur aktual di codebase jualan

```text
Blonjo upload gambar
    ↓ POST /api/v1/ocr/upload
Sajen membuat OCRTask
    ↓ Celery process_receipt_ocr
MCP OCR / Gemini Vision
    ↓ raw_ocr_text atau JSON
RAG + LLM text structuring
    ↓ extracted_data
Frontend polling setiap 2 detik
    ↓ ubah hasil menjadi Smart Note text
POST /api/v1/finance/transactions/parse
    ↓ rule-based → RAG/cache → MCP/LLM
Preview transaksi + suggested_entries
    ↓ user edit/confirm
POST /api/v1/finance/transactions
    ↓ create_transaction_with_journal
Transaction + JournalEntry + InventoryLog
```

Rute dan implementasi ini membuktikan parsing sudah berjalan, tetapi ada dua lapisan parsing yang berurutan:

1. Worker sudah mengubah OCR menjadi JSON.
2. Frontend mengubah JSON menjadi teks Smart Note.
3. Backend mem-parsing teks tersebut lagi menjadi transaksi.

Untuk Workspace, lapisan kedua dan ketiga perlu dipersatukan melalui **canonical normalized schema**, agar data tidak kehilangan evidence, confidence, dan lokasi sumber ketika diubah kembali menjadi teks.

## 4. Reuse yang disarankan

### 4.1 Reuse langsung dengan adapter

- `smart_parser.py`: gunakan normalisasi angka Indonesia, suffix `rb/jt/k`, satuan, tanggal, keyword transaction type, dan ekstraksi item.
- `mcp_client.py`: gunakan pola fallback MCP → AI lokal, tetapi kembalikan metadata provider/model/warning.
- `get_rag_context` dan feedback correction: gunakan sebagai sumber contoh tenant, bukan sebagai satu-satunya validator.
- `JournalMapping` dan `JournalMappingLine`: jadikan sumber rule pembentukan Journal Proposal.
- `_validate_double_entry`: pertahankan sebagai hard gate sebelum posting.
- `create_transaction_with_journal`: gunakan sebagai commit service setelah proposal lolos approval.
- `Transaction`, `JournalEntry`, `Account`: pertahankan sebagai ledger core.
- `InventoryLog` dan product/contact resolution: gunakan hanya jika transaksi memang berdampak pada persediaan atau kontak.
- `reports.py`: tetap membaca transaksi `POSTED`/final setelah aturan status diperketat.

### 4.2 Reuse dengan refactor

- `process_receipt_ocr` harus dipecah menjadi beberapa stage kecil: `detect`, `extract`, `normalize`, `classify`, `map_journal`, `validate`.
- `_map_rich_schema_to_frontend` harus diganti menjadi schema adapter terpusat, bukan mapping khusus ke format lama UI.
- `get_auto_journal_entries` harus menerima context transaksi lengkap: tax facts, payment method, inventory cost, project/cost center, dan evidence.
- `useOcrUpload` harus diubah dari hook khusus satu nota menjadi `useProcessingSession` yang mendukung banyak source dan banyak run.
- `useSmartConfirm` harus dipisah menjadi konfirmasi ekstraksi, approval mapping, approval jurnal, dan posting.
- `ConfirmJournalDialog` dapat menjadi komponen `JournalProposalInspector`, tetapi tidak boleh menyimpan hasil hanya di state frontend.

## 5. Gap utama yang wajib diselesaikan

### P0 — Kontrak data kanonik

Model saat ini memiliki `OCRTask.extracted_data` JSON dan `Transaction`, tetapi belum memiliki hubungan eksplisit antara file, fakta hasil AI, usulan jurnal, approval, dan evidence.

Tambahkan model minimum:

```text
processing_sessions
source_documents
processing_runs
extracted_facts
normalized_transactions
journal_proposals
processing_exceptions
approval_events
final_packages
```

`OCRTask` dapat dipertahankan sementara sebagai legacy adapter dengan kolom `processing_session_id` dan `source_document_id`, tetapi data baru harus menggunakan model kanonik.

### P0 — File type router

Route upload saat ini mengizinkan PDF, tetapi worker hanya menerima JPG, JPEG, dan PNG. Implementasi `process_receipt_ocr` secara eksplisit menolak non-image.

Todo:

- Validasi MIME berdasarkan magic bytes, bukan hanya `content_type` dan extension.
- Tambahkan adapter PDF text/table parser serta OCR fallback per halaman.
- Tambahkan XLSX/CSV parser untuk General Ledger.
- Tambahkan audio transcription adapter.
- Tambahkan email/attachment extractor.
- Simpan `tool`, `model`, `provider`, `input_hash`, dan `output_hash` pada setiap run.

### P0 — Status lifecycle dan approval

Status saat ini hanya `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `CORRECTED` untuk OCR serta `DRAFT`/`POSTED` untuk transaksi.

Gunakan lifecycle Workspace:

```text
draft
queued
processing
needs_review
ready_for_confirmation
confirmed
mapping_ready
approved
posted
final
rejected
failed
superseded
```

Pisahkan dengan jelas:

- selesai diekstrak;
- dikonfirmasi sebagai data benar;
- jurnal disetujui;
- jurnal diposting;
- dokumen ditetapkan final.

### P0 — Jangan auto-post default

`create_transaction_with_journal` saat ini membaca setting `auto_post_journal` dan default-nya `true` jika setting tidak ada. Ini bertentangan dengan Workspace yang membutuhkan draft dan approval.

Todo:

- Default baru harus `DRAFT`.
- Posting harus endpoint/action terpisah setelah approval.
- `POSTED` tidak boleh diedit atau diubah kembali ke draft.
- `unpost_transaction` harus diganti dengan reversal/void formal.
- Laporan resmi hanya membaca transaksi `POSTED`/final.

### P0 — Evidence locator

Saat ini `raw_ocr_text` dan `extracted_data` disimpan, tetapi field belum memiliki lokasi bukti seperti halaman PDF, sheet/baris Excel, region gambar, atau timestamp audio.

Tambahkan setiap fakta:

```json
{
  "field": "total_amount",
  "raw_value": "Rp 5.000.000",
  "normalized_value": 5000000,
  "confidence": 0.91,
  "evidence_locator": {
    "source_id": "SRC-001",
    "page": 1,
    "region": [0.62, 0.78, 0.96, 0.91]
  }
}
```

Ini menjadi sumber data panel Inspector.

### P1 — Hilangkan reparsing JSON menjadi teks

`useOcrUpload` saat ini menyusun `extracted_data` menjadi Smart Note text, lalu memanggil parser lagi. Alur baru:

```text
extracted_data
    ↓ schema adapter
normalized_facts
    ↓ classifier
normalized_transaction
    ↓ journal mapper
journal_proposal
```

Teks tetap dapat ditampilkan untuk manusia, tetapi bukan lagi format pertukaran internal utama.

### P1 — Mapping jurnal yang sadar konteks

`JournalMappingLine.value_type` saat ini mengenal `total_amount`, `cogs_amount`, dan `tax_amount`. Ini sudah baik sebagai fondasi, tetapi belum cukup untuk semua jenis dokumen.

Tambahkan value resolver:

```text
subtotal
grand_total
tax_amount
withholding_tax
inventory_cost
payment_amount
outstanding_amount
depreciation_amount
manual_adjustment
```

Setiap hasil mapping harus menyimpan:

- mapping ID dan versi mapping;
- rule version;
- alasan pemilihan akun;
- sumber nilai debit/kredit;
- confidence dan exception;
- apakah akun berasal dari tenant mapping atau global fallback.

### P1 — Pajak dan HPP jangan bergantung pada tebakan default

Kode saat ini memakai asumsi PPN 11% dan default COGS rate 85%/88% pada kondisi tertentu. Ini boleh menjadi fallback eksplisit, tetapi tidak boleh dipresentasikan sebagai fakta dokumen.

Todo:

- Bedakan `extracted_tax`, `configured_tax`, dan `estimated_tax`.
- Jika PPN tidak ditemukan, status menjadi `tax_review`, bukan otomatis nihil atau 11%.
- Jika HPP aktual tidak tersedia, tandai sebagai estimasi dan minta policy/approval.
- Jangan membuat jurnal aset tetap, sewa, atau akrual hanya dari keyword tanpa rule dan bukti pendukung.

### P1 — Penyimpanan source dan penghapusan

Endpoint `DELETE /ocr/tasks/{task_id}` saat ini menghapus file fisik dan record OCR. Untuk Workspace, dokumen final dan bukti approval tidak boleh dihapus secara biasa.

Todo:

- Draft boleh dihapus sesuai TTL.
- Source staging boleh dihapus setelah retention policy terpenuhi.
- Source final diberi status archived/deleted-by-policy, bukan hard delete tanpa audit.
- Catat actor, waktu, alasan, dan hash ketika dokumen diarsipkan.

### P1 — Tenant boundary dan RAG

Sebagian query sudah menggunakan `tenant_id`, tetapi `_build_few_shot_examples` pada worker mengambil feedback terbaru tanpa filter tenant. Ini berisiko mencampurkan pola bisnis antar perusahaan.

Todo:

- Wajib filter `OCRFeedback` berdasarkan `tenant_id` melalui relasi task.
- Versikan template dan rule per tenant.
- Jangan memasukkan data sensitif mentah ke prompt/log.
- Tambahkan test isolasi tenant untuk COA, feedback, alias, mapping, dan dokumen.

### P1 — Progress dan observability

Frontend sekarang polling `/ocr/tasks/{id}` setiap 2 detik. Pertahankan polling sebagai fallback, tetapi tambahkan progress stage.

Event minimum:

```text
source_received
tool_selected
extraction_started
extraction_completed
normalization_completed
classification_completed
journal_proposal_created
exception_created
confirmation_recorded
approval_recorded
posted
failed
```

Jangan menyimpulkan provider berhasil hanya dari HTTP 200. Response harus membedakan provider AI, local rule engine, fallback, warning, dan error.

## 6. Routing target untuk Workspace

### Route yang dapat dipertahankan

```text
POST /api/v1/ocr/upload
GET  /api/v1/ocr/tasks/:id
POST /api/v1/finance/transactions/parse
GET  /api/v1/finance/accounts
POST /api/v1/finance/transactions
POST /api/v1/finance/transactions/:id/post
```

### Route baru yang disarankan

```text
POST /api/v1/processing/sessions
GET  /api/v1/processing/sessions
GET  /api/v1/processing/sessions/:id
POST /api/v1/processing/sessions/:id/sources
POST /api/v1/processing/sources/:id/process
GET  /api/v1/processing/runs/:id/events
GET  /api/v1/processing/sources/:id/preview
GET  /api/v1/processing/sources/:id/summary
POST /api/v1/processing/sources/:id/confirm
GET  /api/v1/processing/sessions/:id/journal-proposals
POST /api/v1/processing/journal-proposals/:id/approve
POST /api/v1/processing/sessions/:id/post
POST /api/v1/processing/sessions/:id/finalize
GET  /api/v1/processing/sessions/:id/audit
```

Rute lama dapat menjadi compatibility layer selama migrasi. UI Workspace sebaiknya hanya memanggil route baru agar tidak bergantung pada format Smart Note lama.

## 7. Peta file yang dipakai saat implementasi

### Backend yang menjadi sumber reuse

```text
sajen/app/workers/ocr_worker.py
sajen/app/services/mcp_client.py
sajen/app/services/smart_parser.py
sajen/app/services/accounting.py
sajen/app/services/ai_engine.py
sajen/app/services/ai_context.py
sajen/app/models/accounting.py
sajen/app/models/ocr.py
sajen/app/schemas/accounting.py
sajen/app/schemas/ocr.py
sajen/app/api/v1/ocr.py
sajen/app/api/v1/accounting.py
sajen/app/migrations/versions/
```

### Frontend yang menjadi sumber pola UX

```text
blonjo/src/pages/transaction/hooks/useOcrUpload.ts
blonjo/src/pages/transaction/hooks/useSmartNote.ts
blonjo/src/pages/transaction/hooks/useSmartConfirm.ts
blonjo/src/pages/transaction/SmartNoteTab.tsx
blonjo/src/pages/transaction/ConfirmJournalDialog.tsx
blonjo/src/pages/transaction/components/TransactionDetailDialog.tsx
blonjo/src/lib/smartParser.ts
blonjo/src/store/accounting.ts
```

## 8. Urutan pekerjaan teknis

### Phase 0 — Kontrak dan keputusan arsitektur

- [ ] Tetapkan canonical JSON schema untuk source, fact, transaction, journal proposal, exception, approval, dan final package.
- [ ] Tetapkan status machine dan transisi yang sah.
- [ ] Tetapkan policy `DRAFT → APPROVED → POSTED → FINAL`.
- [ ] Tetapkan apakah target app memakai backend Python dari `jualan` sebagai baseline atau port logic ke backend baru.
- [ ] Tetapkan source of truth untuk COA, tax policy, mapping, dan rule PSAK.

### Phase 1 — Fondasi Workspace

- [ ] Buat session/source/run schema dan migration.
- [ ] Buat intake endpoint dengan hash, size, MIME verification, tenant, user, dan period.
- [ ] Tambahkan file storage abstraction: local draft, server staging, final archive.
- [ ] Buat processing job state dan event log.
- [ ] Buat API summary, preview, dan exception.

### Phase 2 — Port pipeline OCR dan parser

- [ ] Port `process_receipt_ocr` menjadi `extract_document` dengan tool router.
- [ ] Reuse MCP/Gemini/Ollama fallback melalui adapter yang mencatat provider sebenarnya.
- [ ] Tambahkan PDF, XLSX/CSV, audio, dan email attachment parser.
- [ ] Reuse `smart_parser` untuk normalisasi bahasa Indonesia dan angka.
- [ ] Hilangkan reparsing JSON ke teks sebagai jalur internal.
- [ ] Simpan evidence locator per field.

### Phase 3 — Accounting mapping

- [ ] Port `JournalMapping` sebagai versioned mapping policy.
- [ ] Port `get_auto_journal_entries` menjadi `build_journal_proposal` tanpa commit.
- [ ] Tambahkan resolver pajak, HPP aktual/estimasi, payment method, project, dan cost center.
- [ ] Jalankan validator debit/kredit, akun leaf, periode terbuka, duplicate, dan materiality.
- [ ] Buat exception queue untuk hasil ambigu.

### Phase 4 — Review, approval, dan posting

- [ ] Buat Workspace UI berbasis session dan processing card.
- [ ] Buat Preview sumber vs normalized result.
- [ ] Buat Inspector evidence locator.
- [ ] Buat konfirmasi per tahap, bukan satu tombol yang langsung menyimpan transaksi.
- [ ] Ubah default submit menjadi draft.
- [ ] Pisahkan approval jurnal dari posting.
- [ ] Ganti unpost dengan reversal/void formal.

### Phase 5 — Trust dan laporan

- [ ] Buat immutable audit event untuk upload, process, correct, confirm, approve, post, finalize, archive.
- [ ] Hubungkan final journal ke reports yang sudah ada.
- [ ] Buat final package dan hash verification.
- [ ] Tambahkan blockchain adapter yang menyimpan proof hash saja.
- [ ] Tampilkan status `proof_pending` jika blockchain gagal tanpa mengubah status akuntansi.

### Phase 6 — QA dan migrasi

- [ ] Test fixture foto struk, PDF faktur, XLSX buku besar, audio transaksi, dan email attachment.
- [ ] Test parser angka Indonesia, diskon, PPN, tanggal, HPP, retur, tempo, dan transfer.
- [ ] Test journal mapping single pair dan compound entry.
- [ ] Test tenant isolation untuk COA, RAG, feedback, mapping, dan file.
- [ ] Test duplicate upload menggunakan source hash/idempotency key.
- [ ] Test provider failure dan local fallback dengan warning yang benar.
- [ ] Test data final tidak dapat diedit atau dihapus langsung.
- [ ] Test laporan hanya membaca transaksi posted/final.

## 9. Prioritas implementasi pertama

Urutan paling aman untuk mulai coding:

1. `SourceDocument + ProcessingRun + canonical schema`.
2. Adapter dari `OCRTask` ke schema baru.
3. Gambar sebagai source pertama menggunakan worker jualan yang sudah terbukti berjalan.
4. Normalized facts dan evidence locator.
5. Reuse `JournalMapping` untuk membuat proposal, bukan langsung transaksi.
6. Konfirmasi user dan approval terpisah.
7. Baru tambahkan PDF, XLSX, audio, dan email.

Dengan urutan ini, kemampuan parsing yang sudah berjalan dapat dimanfaatkan sejak awal, tetapi desain baru tetap memiliki jalur yang benar menuju Workspace, audit trail, dan laporan akuntansi final.
