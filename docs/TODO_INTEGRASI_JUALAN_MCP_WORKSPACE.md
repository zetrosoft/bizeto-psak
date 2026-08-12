# TODO integrasi Jualan dan MCP Server untuk Workspace Bizeto PSAK

Dokumen ini menjadi pegangan eksekusi awal fitur utama Workspace Bizeto PSAK: upload data tanpa prompt, proses otomatis sesuai jenis file, tampilkan resume dan preview, minta konfirmasi user, lalu naik ke tahap berikutnya sebelum finalisasi permanen.

Fokus awal bukan membuat laporan final, tetapi membangun ruang pemrosesan data yang rapi, dapat diaudit, dan sesuai pakem akuntansi.

## 0. Status eksekusi UI/UX saat ini

Update 2026-08-11:

- [x] Root aplikasi langsung masuk ke `/workspace`; landing page ditunda.
- [x] Workspace memakai dua mode utama: `start mode` dan `active mode`.
- [x] `Start mode` mengikuti pola Google AI Studio New app: sidebar navigasi, area tengah besar, composer utama, chip/template ide.
- [x] `Active mode` mengikuti pola ruang kerja: kiri sebagai process log dan evidence list, tengah sebagai artifact stream/chat, kanan sebagai inspector bukti terpilih.
- [x] Header memakai brand Bizeto PSAK, info entitas/periode, language switcher EN/ID, dan toggle inspector saat active.
- [x] Footer sidebar memakai account area seperti AI Studio, dengan dua tombol ringkas: settings dan theme switcher.
- [x] Theme switcher satu tombol model cycle `system -> light -> dark`.
- [x] Composer sudah mendukung tombol attach `+`, menu input source, textarea dinamis, dan tombol proses/send.
- [x] Badge input source berbentuk circle.
- [x] Hubungkan upload/file processing ke backend nyata baseline.
- [x] Hapus mock data UI; Workspace dimulai dari data kosong.
- [x] Terapkan intent gate: chat tanpa attachment/URL adalah diskusi, bukan proses data.
- [x] Terapkan source gate: attachment/URL hanya quick check, summary, dan rencana proses sebelum konfirmasi.
- [x] Koreksi scope UI: layout Workspace tetap mengikuti rancangan AI Studio-style; fitur intent-gate ditanam di balik UI tanpa redesign besar.
- [x] Hubungkan chat diskusi ke AI melalui backend `/api/chat` -> `https://mcp.samkarsa.com/api/chat`.
- [x] Tambahkan quick-check upload: baca header/jenis file, CSV header/sample, XLSX package header, PDF/text header, dan adapter OCR Vision untuk image.
- [x] Render hasil quick-check sebagai response chat markdown dengan tombol `Proses lanjut`.
- [ ] Hubungkan OCR, AI Vision, parser, mapping jurnal, dan MCP adapter nyata.
- [x] Implement preview isi file nyata untuk CSV baseline.
- [x] Implement konfirmasi/reject dengan draft storage dan audit trail baseline.

Catatan batasan: status centang pada bagian ini hanya menunjukkan implementasi UI/UX prototype di aplikasi Bizeto PSAK, bukan kesiapan backend akuntansi penuh.

## 1. Sumber codebase

### 1.1 Jualan / Sajen

Path sumber:

- `/Users/user/Kerjaan/jualan/sajen/app/workers/ocr_worker.py`
- `/Users/user/Kerjaan/jualan/sajen/app/api/v1/ocr.py`
- `/Users/user/Kerjaan/jualan/sajen/app/services/smart_parser.py`
- `/Users/user/Kerjaan/jualan/sajen/app/services/ai_engine.py`
- `/Users/user/Kerjaan/jualan/sajen/app/services/mcp_client.py`
- `/Users/user/Kerjaan/jualan/sajen/app/api/v1/accounting.py`
- `/Users/user/Kerjaan/jualan/sajen/app/services/vision_matcher.py`
- `/Users/user/Kerjaan/jualan/blonjo/src/pages/Transactions.tsx`
- `/Users/user/Kerjaan/jualan/blonjo/src/pages/transaction/SmartNoteTab.tsx`
- `/Users/user/Kerjaan/jualan/blonjo/src/pages/transaction/hooks/useSmartNote.ts`
- `/Users/user/Kerjaan/jualan/blonjo/src/pages/transaction/hooks/useOcrUpload.ts`
- `/Users/user/Kerjaan/jualan/blonjo/src/pages/transaction/hooks/useSmartConfirm.ts`
- `/Users/user/Kerjaan/jualan/blonjo/src/components/CameraModal.tsx`
- `/Users/user/Kerjaan/jualan/blonjo/src/components/VoiceRuleDialog.tsx`
- `/Users/user/Kerjaan/jualan/blonjo/src/lib/smartParser.ts`
- `/Users/user/Kerjaan/jualan/blonjo/src/lib/voiceRules.ts`
- `/Users/user/Kerjaan/jualan/blonjo/src/lib/i18n.ts`
- `/Users/user/Kerjaan/jualan/docs/SMARTNOTE_WORKFLOW.md`

Peran:

- Menjadi referensi workflow OCR yang sudah berjalan.
- Menjadi referensi parsing transaksi dan mapping jurnal.
- Menjadi referensi pola task processing, polling, dan fallback.
- Menjadi referensi Smart Note, Voice Note, Camera Capture, upload OCR, konfirmasi jurnal, dan i18n.
- Tidak dicopy mentah karena masih terikat domain Blonjo/Jualan: produk, inventory, supplier retail, pricing, dan posting transaksi langsung.

### 1.2 MCP Server

Path sumber:

- `/Users/user/Kerjaan/mcp-server/src/tools/ocrTool.ts`
- `/Users/user/Kerjaan/mcp-server/src/tools/transactionParser.ts`
- `/Users/user/Kerjaan/mcp-server/src/tools/visualTemplateTool.ts`
- `/Users/user/Kerjaan/mcp-server/src/tools/ragAssembler.ts`
- `/Users/user/Kerjaan/mcp-server/src/services/aiProviderService.ts`
- `/Users/user/Kerjaan/mcp-server/src/services/vectorService.ts`
- `/Users/user/Kerjaan/mcp-server/src/services/ingestionService.ts`
- `/Users/user/Kerjaan/mcp-server/src/index.ts`

Peran:

- Menjadi referensi AI gateway.
- Menjadi referensi provider fallback.
- Menjadi referensi tool contract.
- Menjadi referensi RAG, prompt assembly, ingestion, embedding, dan monitoring.
- Tidak dicopy mentah karena prompt dan tool saat ini masih spesifik ke Blonjo/UMKM retail.

### 1.3 Bizeto PSAK

Path target:

- `/Users/user/Kerjaan/bizeto-psak`

Peran:

- Menjadi aplikasi baru untuk pemrosesan data akuntansi PSAK.
- Menggunakan UI Workspace sebagai pusat interaksi user.
- Semua hasil AI wajib masuk status draft lebih dulu.
- Finalisasi hanya terjadi setelah validasi dan konfirmasi user.

## 2. Arsitektur target

```text
Next.js Workspace UI
  -> Bizeto PSAK Backend
      -> Document Router
      -> Deterministic Parser
      -> MCP Client Adapter
          -> ocr_receipt
          -> parse_transaction
          -> rag/search
          -> rag/embed
      -> Accounting Normalizer
      -> Journal Candidate Engine
      -> Review and Confirmation Engine
      -> Draft SQLite Storage
      -> Final Storage and Audit Trail
```

Prinsip utama:

- User cukup upload file dan klik `Proses`.
- User tidak wajib menulis prompt, narasi, atau command.
- User juga bisa memakai Smart Note, Voice Note, Camera Capture, dan scan QR/barcode sebagai sumber data.
- Sistem menentukan jenis data dari file.
- Sistem membuat resume yang mudah dipahami.
- User dapat memilih `Preview` atau `Konfirmasi`.
- Data belum permanen sebelum final.
- Data final wajib memiliki audit trail.
- Semua label, empty state, error, status, dan resume harus memakai i18n EN/ID.

## 3. Pipeline pemrosesan

```text
Upload file
  -> Detect file type
  -> Route by document type
  -> Extract raw content
  -> Normalize accounting schema
  -> Validate structure and arithmetic
  -> Classify with rules and AI
  -> Generate processing resume
  -> Show preview and confirmation
  -> Move to stage 2 draft
  -> Finalize after approval
```

Untuk input non-file, pipeline tetap sama setelah tahap ekstraksi:

```text
Smart Note / Voice Note / Camera Capture / QR Scan
  -> Input Orchestrator
  -> Convert to canonical raw input
  -> Parse text, image, audio, or code
  -> Normalize accounting schema
  -> Validate structure and arithmetic
  -> Classify with rules and AI
  -> Generate processing resume
  -> Show preview and confirmation
```

## 3.1 Input Orchestrator

TODO:

- [ ] Buat `InputOrchestrator` sebagai pintu masuk semua sumber data.
- [ ] Dukung source type `file_upload`.
- [ ] Dukung source type `smart_note`.
- [ ] Dukung source type `voice_note`.
- [ ] Dukung source type `camera_capture`.
- [ ] Dukung source type `qr_barcode_scan`.
- [ ] Dukung source type `manual_adjustment` sebagai fallback tahap berikutnya.
- [ ] Setiap source type harus menghasilkan `UploadedDocument` atau `RawInputEnvelope`.
- [ ] Setiap input harus punya `source_channel`, `source_label`, `captured_at`, `checksum` jika berbentuk file/blob.
- [ ] Input yang belum dikonfirmasi hanya boleh menjadi draft.

Source type awal:

| Source type | Contoh | Jalur proses |
| --- | --- | --- |
| `file_upload` | Buku besar XLSX, invoice PDF, receipt image | Document Router |
| `smart_note` | "Bayar sewa mesin las 5 juta tunai lokasi B" | Text parser dan journal candidate |
| `voice_note` | Rekaman ucapan manajer lapangan | STT lalu Text parser |
| `camera_capture` | Foto struk langsung dari kamera | OCR/AI Vision |
| `qr_barcode_scan` | Kode bukti, QR invoice, barcode dokumen | Code resolver atau append ke note |

## 3.2 Keputusan UX Workspace

Workspace Bizeto PSAK tidak diperlakukan sebagai landing page, dashboard statis, atau chat kosong. Workspace diperlakukan sebagai ruang kerja profesional: seperti meeting room tempat user membawa bukti, AI memproses, akuntan manusia meninjau, lalu sistem menaikkan data ke tahap akuntansi berikutnya.

Alur UX yang disepakati:

```text
User membuka aplikasi
  -> langsung masuk /workspace
  -> Start mode
      -> user upload file / tulis smart note / rekam voice note / ambil foto / scan QR
      -> user bisa klik Proses tanpa narasi
  -> Active mode
      -> kiri: process log, evidence list, checkpoint
      -> tengah: diskusi, artifact proses, resume, tombol preview/konfirmasi
      -> kanan: inspector bukti terpilih, locator, metadata, status, issue
  -> Jika dikonfirmasi
      -> data naik ke tahap berikutnya sebagai draft terkonfirmasi
  -> Jika belum final
      -> data tetap temporary/draft
  -> Jika final
      -> data baru disimpan permanen dan masuk audit trail
```

Prinsip UX:

- Start mode harus terasa ringan, modern, dan mengundang user memulai proses.
- Active mode harus terasa seperti ruang review akuntansi, bukan sekadar chatbot.
- Chat tetap menjadi pusat interaksi, tetapi bukti, status, dan inspector tidak boleh tersembunyi.
- User tidak wajib menulis command; tombol `Proses` harus cukup untuk memulai pipeline.
- Jika user chat tanpa attachment atau URL, AI wajib merespons sebagai diskusi.
- Jika user memberi attachment atau URL, respons pertama AI hanya: respons chat, quick check sumber, summary awal, dan rencana proses.
- Attachment atau URL tidak boleh diproses sampai user klik `Konfirmasi proses` atau menulis instruksi eksplisit seperti `proses file ini`.
- AI boleh memberi analisis dan resume, tetapi posting/finalisasi tetap menunggu konfirmasi manusia.
- Data yang belum final hanya boleh disimpan sebagai draft sementara.
- Label aplikasi memakai istilah global dan profesional: `Workspace`, `Preview`, `Confirm`, `Evidence`, `Inspector`, `Process log`, `Draft`.

## 4. Canonical schema awal

TODO:

- [ ] Buat schema `UploadedDocument`.
- [ ] Buat schema `DocumentProcessingJob`.
- [ ] Buat schema `ExtractionResult`.
- [ ] Buat schema `LedgerLine`.
- [ ] Buat schema `InvoiceLine`.
- [ ] Buat schema `EvidenceLocator`.
- [ ] Buat schema `AccountingValidationIssue`.
- [ ] Buat schema `JournalCandidate`.
- [ ] Buat schema `ProcessingResume`.
- [ ] Buat schema `ProcessingReviewDecision`.
- [ ] Buat schema `RawInputEnvelope`.
- [ ] Buat schema `VoiceTranscript`.
- [ ] Buat schema `CameraCapture`.
- [ ] Buat schema `CodeScanResult`.

Catatan:

- Semua schema harus menyimpan `confidence`.
- Semua hasil AI harus menyimpan `source`.
- Semua angka penting harus punya bukti asal: row, cell, page, bounding box, atau raw text.
- Semua file harus punya checksum.

## 5. Backend Bizeto PSAK

TODO:

- [x] Buat folder `backend/`.
- [x] Setup FastAPI ringan untuk service pemrosesan.
- [x] Setup konfigurasi environment baseline.
- [x] Setup SQLite untuk draft storage tahap awal.
- [x] Buat storage lokal sementara untuk file upload.
- [x] Buat service checksum untuk dokumen.
- [x] Buat model status job: `uploaded`, `processing`, `review_required`, `confirmed`, `rejected`, `failed`, `finalized`.
- [ ] Buat endpoint input terpadu untuk Smart Note, Voice Note, Camera Capture, dan File Upload secara penuh.

Endpoint awal:

- [x] `POST /api/documents/upload`
- [x] `POST /api/documents/{document_id}/process`
- [x] `GET /api/documents/{document_id}/status`
- [x] `GET /api/documents/{document_id}/preview`
- [x] `GET /api/documents/{document_id}/resume`
- [x] `POST /api/documents/{document_id}/confirm`
- [x] `POST /api/documents/{document_id}/reject`
- [x] `POST /api/inputs/smart-note`
- [x] `POST /api/inputs/voice-note`
- [ ] `POST /api/inputs/camera-capture`
- [x] `POST /api/inputs/code-scan`
- [ ] `POST /api/inputs/{input_id}/process`

## 6. MCP Client Adapter

TODO:

- [x] Buat adapter pemanggil MCP REST bridge untuk chat.
- [ ] Tambahkan health check MCP.
- [x] Tambahkan timeout baseline untuk chat MCP.
- [ ] Tambahkan limit ukuran payload.
- [ ] Tambahkan fallback jika MCP tidak tersedia.
- [ ] Simpan metadata provider: model, tool, latency, token usage jika tersedia.

Target MCP endpoints:

- [x] `POST /api/chat`
- [ ] `POST /tools/ocr_receipt` production. Adapter sudah dibuat, tetapi route `https://mcp.samkarsa.com/tools/ocr_receipt` saat dicek masih fallback ke SPA HTML, belum JSON API.
- [ ] `POST /tools/parse_transaction`
- [ ] `POST /api/v1/rag/search`
- [ ] `POST /api/v1/rag/embed`

Catatan:

- Jangan kirim data ke MCP jika jenis file bisa diproses deterministik.
- Jangan gunakan hasil MCP sebagai final truth.
- Hasil MCP wajib melewati normalizer dan validator Bizeto PSAK.

## 7. Document Router

TODO:

- [x] Deteksi ekstensi file.
- [x] Deteksi MIME type.
- [x] Validasi ukuran file.
- [x] Bedakan file spreadsheet, PDF, image, text, dan audio secara baseline.
- [x] Kembalikan `unsupported_type` untuk jenis file yang belum didukung.

Routing awal:

| Jenis file | Jalur proses utama | Catatan |
| --- | --- | --- |
| `.xlsx`, `.csv` | Deterministic ledger parser | Prioritas tahap awal |
| `.pdf` | Text extraction, lalu Vision jika perlu | Untuk invoice dan bukti scan |
| `.jpg`, `.jpeg`, `.png` | OCR/AI Vision via MCP | Untuk struk dan nota |
| `.txt`, `.md` | Text parser | Untuk catatan transaksi |
| Audio | STT lalu Text parser | Voice Note tahap awal |

## 7.1 Smart Note

TODO:

- [ ] Refactor pola `SmartNoteTab`.
- [ ] Refactor pola `useSmartNote`.
- [ ] Refactor pola `smartParser.ts`.
- [x] Buat textarea/chat input untuk catatan bebas.
- [x] Tombol `Proses` berjalan tanpa command tambahan.
- [ ] Deteksi nominal, tanggal, pihak terkait, metode pembayaran, lokasi, dan tujuan transaksi secara penuh.
- [x] Hasil Smart Note masuk ke `ProcessingResume` baseline.
- [ ] Hasil Smart Note bisa dipreview sebagai teks asli dan hasil parsing.
- [x] Hasil Smart Note wajib dikonfirmasi sebelum menjadi draft tahap 2 secara baseline.

Contoh:

```text
Tolong catat, baru bayar sewa mesin las listrik lima juta rupiah tunai untuk lokasi B.
```

Output awal:

- `source_type = smart_note`
- `document_type = natural_language_transaction`
- candidate transaksi biaya sewa alat
- candidate jurnal debit/kredit
- confidence dan alasan klasifikasi

## 7.2 Voice Note

TODO:

- [ ] Refactor pola `voiceRules.ts`.
- [ ] Refactor pola `VoiceRuleDialog`.
- [ ] Buat tombol rekam suara di Workspace.
- [ ] Simpan audio sebagai draft blob sementara.
- [ ] Buat service STT.
- [ ] Terapkan voice rules sebelum parsing.
- [ ] Tampilkan transcript.
- [ ] Tampilkan confidence transcript.
- [ ] Izinkan user preview transcript sebelum konfirmasi.
- [ ] Kirim transcript ke Smart Note parser.

Catatan:

- Voice Note tidak boleh langsung posting jurnal.
- Kesalahan STT harus masuk `review_required`.
- Voice rules harus tenant/entity-specific.

## 7.3 Camera Capture

TODO:

- [ ] Refactor pola `CameraModal`.
- [ ] Buat modal camera capture di Workspace.
- [ ] Pilih kamera depan/belakang jika tersedia.
- [ ] Capture foto menjadi file `.jpg`.
- [ ] Kirim hasil capture ke upload pipeline.
- [ ] Tampilkan preview foto.
- [ ] Kirim foto ke OCR/AI Vision via MCP.
- [ ] Simpan bukti foto sebagai draft sampai konfirmasi.

## 7.4 QR dan barcode scan

TODO:

- [ ] Refactor pola scan dari `CameraModal`.
- [ ] Dukung QR code.
- [ ] Dukung barcode jika library memungkinkan.
- [ ] Hasil scan bisa menjadi referensi dokumen.
- [ ] Hasil scan bisa ditambahkan ke Smart Note.
- [ ] Hasil scan bisa dipakai untuk mencari dokumen/vendor/template di RAG.

Catatan:

- QR/barcode bukan sumber akuntansi final sendiri.
- QR/barcode hanya resolver/referensi kecuali payload berisi data transaksi lengkap.

## 8. Parser buku besar

TODO:

- [ ] Baca workbook `.xlsx`.
- [x] Baca `.csv`.
- [ ] Deteksi sheet utama.
- [ ] Deteksi header.
- [x] Mapping kolom tanggal baseline.
- [x] Mapping kolom kode akun baseline.
- [x] Mapping kolom nama akun baseline.
- [x] Mapping kolom debit baseline.
- [x] Mapping kolom kredit baseline.
- [ ] Mapping kolom saldo.
- [x] Mapping kolom referensi baseline.
- [x] Mapping kolom deskripsi baseline.
- [ ] Normalize tanggal.
- [x] Normalize angka baseline.
- [x] Validasi debit dan kredit baseline.
- [ ] Deteksi baris kosong.
- [ ] Deteksi duplikasi.
- [ ] Deteksi saldo tidak wajar.
- [x] Buat resume buku besar baseline untuk CSV.

Output:

- `document_type = general_ledger`
- daftar `LedgerLine`
- `validation_issues`
- `processing_resume`

Catatan:

- Buku besar tidak boleh langsung dibuat ulang menjadi jurnal final.
- Buku besar diproses sebagai sumber data akuntansi yang akan dianalisis, diklasifikasi, dan divalidasi.

## 9. OCR dan AI Vision

TODO:

- [ ] Refactor pola dari `ocrTool.ts`.
- [ ] Buat prompt baru untuk dokumen akuntansi Bizeto PSAK.
- [ ] Hilangkan prompt yang terlalu retail-specific.
- [ ] Gunakan Gemini Vision melalui MCP jika tersedia.
- [ ] Tambahkan status `TIDAK_TERBACA` atau `readability_failed`.
- [ ] Tambahkan field evidence dari hasil OCR.
- [ ] Tambahkan confidence per field.
- [ ] Tambahkan arithmetic validation untuk invoice/receipt.

Dokumen target:

- Struk bahan bakar.
- Nota pembelian.
- Faktur supplier.
- Bukti kas keluar.
- Bukti kas masuk.
- Bukti pembayaran pajak.

## 10. PDF parser

TODO:

- [ ] Ekstrak teks PDF terlebih dahulu.
- [ ] Deteksi apakah PDF adalah text-based atau scan.
- [ ] Jika text-based, parsing teks secara deterministik.
- [ ] Jika scan, render page ke image lalu kirim ke OCR/AI Vision.
- [ ] Simpan page locator untuk preview.
- [ ] Buat resume hasil ekstraksi.

## 11. Accounting Normalizer

TODO:

- [ ] Ubah semua hasil ekstraksi ke schema akuntansi Bizeto.
- [ ] Normalize currency.
- [ ] Normalize tanggal.
- [ ] Normalize pihak transaksi.
- [ ] Normalize pajak.
- [ ] Normalize akun kandidat.
- [ ] Tandai field yang berasal dari AI.
- [ ] Tandai field yang berasal dari parser deterministik.

Prinsip:

- Normalizer tidak boleh posting.
- Normalizer hanya menyusun data bersih.
- Semua ketidakpastian dikirim ke review.

## 12. Journal Candidate Engine

TODO:

- [ ] Ambil pola mapping dari `jualan/sajen/app/api/v1/accounting.py`.
- [ ] Pisahkan dari dependency produk, inventory, dan pricing.
- [ ] Buat rule akun dasar untuk PSAK.
- [ ] Buat candidate debit/kredit.
- [ ] Tambahkan alasan klasifikasi.
- [ ] Tambahkan confidence.
- [ ] Tambahkan balance check.
- [ ] Tandai jika perlu konfirmasi staf akuntansi.

Contoh:

```text
Pembelian solar
  -> Debit Beban Operasional Kendaraan
  -> Kredit Kas/Bank/Utang

Pembelian bahan baku
  -> Debit Persediaan Bahan Baku
  -> Debit PPN Masukan
  -> Kredit Utang Usaha/Kas/Bank

Pembelian mesin
  -> Debit Aset Tetap
  -> Kredit Kas/Bank/Utang
  -> Buat kandidat jadwal penyusutan
```

## 13. RAG dan learning

TODO:

- [ ] Gunakan MCP RAG untuk knowledge internal perusahaan.
- [ ] Simpan koreksi user sebagai learning candidate.
- [ ] Bedakan knowledge global dan tenant/entity-specific.
- [ ] Buat metadata `app_context = bizeto_psak`.
- [ ] Buat role `accounting_processor`.
- [ ] Buat role `psak_reviewer`.
- [ ] Buat mekanisme ingestion untuk mapping akun historis.
- [ ] Simpan voice rules sebagai knowledge entity-specific.
- [ ] Simpan template camera/OCR sebagai learning candidate.
- [ ] Simpan koreksi Smart Note sebagai kandidat aturan parsing.
- [ ] Simpan pola QR/barcode vendor jika terbukti stabil.

Catatan:

- RAG tidak boleh menyimpan data transaksi real-time sebagai sumber kebenaran.
- RAG hanya menyimpan aturan, pola, template, koreksi, dan knowledge.

## 13.1 i18n EN/ID

TODO:

- [x] Buat struktur dictionary i18n untuk Workspace.
- [x] Terapkan locale `en` dan `id`.
- [x] Default locale mengikuti preferensi sistem/browser jika belum dipilih.
- [x] Simpan pilihan bahasa user di local storage.
- [x] Semua label tombol utama Workspace prototype masuk dictionary.
- [x] Semua title panel utama Workspace prototype masuk dictionary.
- [x] Status processing utama Workspace prototype masuk dictionary.
- [x] Empty state utama Workspace prototype masuk dictionary.
- [ ] Semua error message harus masuk dictionary.
- [ ] Semua toast harus masuk dictionary.
- [ ] Semua resume template harus punya versi EN/ID.
- [ ] Semua confirmation dialog harus punya versi EN/ID.
- [ ] Semua audit action label harus punya versi EN/ID.
- [ ] Gunakan diksi profesional, modern, singkat, dan bersih.

Key group awal:

- `workspace.*`
- `workspace.input.*`
- `workspace.smartNote.*`
- `workspace.voiceNote.*`
- `workspace.camera.*`
- `workspace.scan.*`
- `workspace.processing.*`
- `workspace.preview.*`
- `workspace.confirmation.*`
- `workspace.audit.*`
- `workspace.errors.*`

Contoh diksi:

| ID | EN |
| --- | --- |
| `Proses` | `Process` |
| `Preview` | `Preview` |
| `Konfirmasi` | `Confirm` |
| `Catatan pintar` | `Smart note` |
| `Catatan suara` | `Voice note` |
| `Ambil foto` | `Capture` |
| `Bukti terpilih` | `Selected evidence` |
| `Perlu review` | `Needs review` |
| `Draf terkonfirmasi` | `Confirmed draft` |

## 14. Workspace UI integration

TODO:

- [x] Hubungkan tombol upload ke endpoint backend.
- [x] Hubungkan tombol `Proses` ke job processing.
- [x] Hubungkan Smart Note ke endpoint input terpadu baseline.
- [ ] Hubungkan Voice Note ke STT dan Smart Note parser.
- [ ] Hubungkan Camera Capture ke OCR upload pipeline.
- [ ] Hubungkan QR/barcode scan ke input resolver.
- [ ] Tampilkan status proses real-time atau polling.
- [x] Tampilkan resume hasil proses versi prototype UI.
- [x] Tampilkan tombol `Preview` versi prototype UI.
- [x] Tampilkan tombol `Konfirmasi` versi prototype UI.
- [ ] Tampilkan tombol `Tolak`.
- [x] Tampilkan inspector bukti terpilih versi prototype UI.
- [x] Tampilkan confidence dan issue versi prototype UI.
- [ ] Tampilkan audit mini timeline.
- [ ] Terapkan semua label melalui i18n secara penuh sampai error, toast, dialog, dan audit label.

State UI:

- `empty`
- `file_selected`
- `uploaded`
- `processing`
- `review_required`
- `confirmed`
- `failed`
- `finalized`

Mode input UI:

- `upload`
- `smart_note`
- `voice_note`
- `camera`
- `scan`
- `manual_review`

## 15. Preview

TODO:

- [x] Preview spreadsheet CSV sebagai tabel baseline.
- [ ] Preview PDF per halaman.
- [ ] Preview image receipt.
- [ ] Preview camera capture.
- [x] Preview Smart Note original text baseline via API.
- [ ] Preview Voice Note transcript.
- [ ] Preview QR/barcode payload.
- [ ] Highlight field yang berhasil diekstrak.
- [ ] Highlight field yang bermasalah.
- [ ] Tampilkan sumber baris/cell/page.

## 16. Confirmation workflow

TODO:

- [x] `Preview` hanya membuka isi dan hasil ekstraksi baseline API.
- [x] `Konfirmasi` menaikkan data ke tahap berikutnya baseline API.
- [x] `Tolak` menyimpan alasan penolakan baseline API.
- [ ] `Edit correction` ditunda setelah baseline stabil.
- [ ] Setelah konfirmasi, data belum final permanen kecuali masuk tahap finalisasi.

## 17. Audit trail

TODO:

- [x] Simpan actor baseline.
- [x] Simpan timestamp baseline.
- [x] Simpan action baseline.
- [x] Simpan status sebelum dan sesudah baseline.
- [x] Simpan checksum file.
- [ ] Simpan model/provider/tool yang dipakai.
- [ ] Simpan versi prompt.
- [ ] Simpan confidence summary.

Catatan:

- Blockchain anchoring belum dikerjakan pada tahap ini.
- Tahap ini cukup menyiapkan hash dan audit trail.

## 18. Testing

TODO:

- [ ] Test upload `.xlsx`.
- [x] Test upload `.csv`.
- [ ] Test upload PDF text-based.
- [ ] Test upload PDF scan.
- [ ] Test upload image receipt.
- [x] Test Smart Note.
- [ ] Test Voice Note STT.
- [ ] Test Camera Capture.
- [ ] Test QR/barcode scan.
- [ ] Test i18n EN.
- [ ] Test i18n ID.
- [ ] Test language switch tidak merusak state Workspace.
- [ ] Test MCP offline fallback.
- [ ] Test invalid file type.
- [ ] Test debit/kredit tidak balance.
- [ ] Test duplicate rows.
- [x] Test confirm workflow.
- [ ] Test reject workflow.
- [ ] Test UI state transitions.

## 19. Urutan eksekusi yang disarankan

### Phase 0 - Persiapan

- [ ] Finalkan kontrak data canonical.
- [ ] Finalkan struktur backend.
- [ ] Pastikan frontend Workspace tetap berjalan di port `2550`.

### Phase 1 - Baseline upload dan draft storage

- [x] Buat backend FastAPI.
- [x] Buat SQLite draft storage.
- [x] Buat endpoint upload.
- [x] Buat document router baseline.
- [x] Hubungkan UI upload ke backend.
- [ ] Buat input orchestrator terpadu penuh.
- [x] Siapkan dictionary i18n awal EN/ID untuk prototype Workspace.

### Phase 2 - Buku besar

- [ ] Implement parser `.xlsx`.
- [x] Implement parser `.csv` baseline.
- [x] Buat resume buku besar baseline.
- [x] Buat preview tabel baseline.
- [x] Buat validasi debit/kredit baseline.

### Phase 3 - Smart Note, Voice Note, dan Camera Capture

- [ ] Implement Smart Note input.
- [ ] Implement Voice Note recording.
- [ ] Implement STT service.
- [ ] Implement voice rules.
- [ ] Implement Camera Capture.
- [ ] Implement QR/barcode scan dasar.
- [ ] Semua mode input masuk ke pipeline yang sama.

### Phase 4 - MCP dan OCR

- [ ] Implement MCP client adapter.
- [ ] Integrasi `ocr_receipt`.
- [ ] Buat prompt dokumen akuntansi Bizeto.
- [ ] Parsing image receipt.
- [ ] Parsing PDF scan melalui Vision.

### Phase 5 - Klasifikasi dan jurnal kandidat

- [ ] Implement accounting normalizer.
- [ ] Implement journal candidate engine.
- [ ] Tambahkan COA mapping dasar.
- [ ] Tambahkan confidence dan reasoning.

### Phase 6 - Review dan konfirmasi

- [ ] Tampilkan resume.
- [ ] Tampilkan preview.
- [ ] Implement confirm.
- [ ] Implement reject.
- [ ] Simpan audit trail.

## 20. Definisi selesai tahap awal

Tahap awal dianggap selesai jika:

- [x] User bisa membuka Workspace.
- User bisa upload buku besar `.xlsx` atau `.csv`. Saat ini CSV baseline sudah jalan, XLSX baru dikenali.
- [x] User bisa klik `Proses` tanpa menulis command.
- [x] User bisa mengetik Smart Note dan klik `Proses`.
- User bisa merekam Voice Note dan melihat transcript.
- User bisa mengambil foto bukti lewat Camera Capture.
- User bisa scan QR/barcode sebagai referensi bukti.
- Sistem bisa membaca dan mengklasifikasi isi file.
- [x] Sistem bisa membuat resume yang mudah dipahami baseline.
- [x] User bisa melihat preview isi file baseline untuk CSV/Smart Note API.
- [x] User bisa mengonfirmasi hasil baseline.
- [x] Data tersimpan sebagai draft terkonfirmasi baseline.
- [x] Semua proses meninggalkan audit trail dasar baseline.
- [x] UI bisa berpindah bahasa EN/ID tanpa mengubah state data.

Status saat ini:

- Selesai di sisi UI prototype: membuka Workspace, start mode, active mode, i18n awal, theme switcher, composer, preview/confirm mock, inspector mock.
- Selesai di sisi backend baseline: FastAPI, SQLite draft storage, upload file, smart note, voice transcript envelope, QR/code envelope, CSV ledger parser awal, resume, preview, confirm/reject, audit trail dasar.
- Belum selesai di sisi fungsi nyata lanjutan: OCR, AI Vision, parser XLSX detail, mapping jurnal PSAK penuh, MCP adapter, preview PDF/image/audio nyata, STT, camera capture API khusus, finalisasi, dan blockchain anchoring.

## 21. Prinsip produk

- Workspace adalah ruang diskusi, kelas, meeting, dan review data.
- AI bekerja seperti asisten akuntan senior, bukan tombol sulap.
- Setiap hasil harus bisa dijelaskan.
- Setiap angka harus bisa ditelusuri.
- Setiap ketidakpastian harus masuk review.
- Finalisasi harus eksplisit.
- PSAK compliance dibangun sebagai guardrail, bukan dekorasi.
