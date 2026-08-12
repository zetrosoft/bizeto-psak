# Rancangan AI Accounting Workspace

## 1. Ringkasan

**AI Accounting Workspace** adalah ruang kerja pemrosesan data akuntansi berbasis percakapan. Pengguna cukup mengunggah satu atau beberapa berkas—tanpa menulis narasi, prompt, atau command—lalu menekan **Proses**. Sistem mengenali jenis data, memilih alat yang sesuai, mengekstrak isi, menguji konsistensi angka, mengklasifikasikan transaksi, dan menyajikan resume yang dapat ditinjau.

Chat di sini bukan chatbot umum. Setiap pesan adalah objek kerja yang memiliki status, sumber data, hasil AI, validasi mesin, keputusan pengguna, dan jejak audit. AI boleh mengusulkan klasifikasi, tetapi tidak boleh mengubah buku besar final tanpa aturan akuntansi dan otorisasi manusia.

## 2. Ide pembeda: ruang proses, bukan kotak prompt

Layar utama dibuat seperti chat, tetapi setiap unggahan berubah menjadi **Processing Card** yang hidup. Kartu ini memperlihatkan perjalanan data secara visual:

`Masuk → Dibaca → Dipahami → Diuji → Diklasifikasi → Menunggu konfirmasi → Diposting ke tahap berikutnya`

Keunikan produk:

- **Zero-prompt processing**: tipe berkas dan tombol **Proses** sudah cukup untuk memulai.
- **Evidence-first**: setiap usulan AI selalu memiliki tautan ke halaman/baris/sel pada dokumen sumber.
- **Confidence bukan izin**: skor keyakinan hanya membantu prioritas review; izin posting ditentukan oleh validasi dan role.
- **Chat sebagai audit timeline**: percakapan tidak dihapus ketika proses berubah status.
- **Reversible sampai final**: draft dan hasil sementara dapat dikoreksi; dokumen final menjadi immutable dan hanya bisa dibatalkan melalui jurnal pembalik.
- **Human-in-the-loop yang ringan**: pengguna cukup mengonfirmasi field atau baris yang bermasalah, bukan mengetik ulang seluruh transaksi.

## 3. Target pengguna dan batasan peran

| Peran | Hak utama |
|---|---|
| Operator | Upload, menjalankan proses, melihat preview, memperbaiki metadata non-akuntansi |
| Staf Akuntansi | Menyetujui atau mengoreksi klasifikasi dan jurnal usulan |
| Reviewer/Manajer | Menyetujui batch yang melewati ambang materialitas atau risiko |
| Senior Akuntan AI | Mengekstrak, menjelaskan, mengusulkan, dan menandai anomali; tidak memiliki otorisasi manusia |
| Admin | Mengatur chart of accounts, periode, policy, role, retensi, dan konektor |
| Auditor | Read-only terhadap sumber, transformasi, jurnal, approval, dan proof hash |

## 4. Layout halaman utama

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Workspace      | Periode: Jul 2026 | Entitas: PT Contoh | [Help]     │
├───────────────┬──────────────────────────────────────┬─────────────────┤
│ SESI & FILTER  │ FEED PROSES AI                       │ INSPECTOR       │
│                │                                      │                 │
│ + Sesi baru    │ AI: Siap memproses data              │ [Sumber]        │
│ Draft          │                                      │ [Resume]        │
│ Menunggu saya  │ [Upload] struk.jpg                   │ [Jurnal]        │
│ Perlu perhatian│ 1 file | 2.4 MB | Foto struk         │ [Validasi]      │
│ Final          │                                      │                 │
│                │ ┌─ Processing Card ───────────────┐ │ Bukti terpilih  │
│                │ │ Struk SPBU · 1 transaksi        │ │ halaman 1, ROI  │
│                │ │ [Preview] [Proses]              │ │ nominal: ...    │
│                │ │ Belum diproses                  │ │                 │
│                │ └─────────────────────────────────┘ │                 │
│                │                                      │                 │
│                │ [📎 Tambah data] [☷ Pilih dari inbox]│                 │
│                │ ┌──────────────────────────────────┐│                 │
│                │ │ Tulis catatan opsional...      ↑  ││                 │
│                │ └──────────────────────────────────┘│                 │
└───────────────┴──────────────────────────────────────┴─────────────────┘
```

### Perilaku tombol

- **Proses** muncul pada kartu yang belum diproses. Tanpa teks pengguna, sistem memakai `file_type`, metadata upload, dan policy entitas.
- Saat berjalan, tombol berubah menjadi **Lihat proses** dan menampilkan langkah real-time.
- Setelah analisis, kartu menampilkan **Preview hasil**, **Konfirmasi**, atau **Perlu koreksi**.
- **Preview** selalu read-only terhadap sumber asli. Preview dapat berupa gambar/PDF, tabel spreadsheet, atau baris buku besar.
- **Konfirmasi** mengunci hasil tahap tersebut dan membuat event approval; konfirmasi tidak langsung berarti final posting.
- Kolom chat bersifat opsional untuk konteks tambahan, misalnya “ini untuk lokasi B”. Konteks tersebut tidak boleh menghapus fakta yang diekstrak dari bukti.

## 5. Alur tanpa command: contoh upload buku besar

1. Pengguna menyeret `buku-besar-juli.xlsx` ke feed.
2. Sistem membuat `session`, `source_document`, dan kartu status **Siap diproses**. File draft disimpan sementara secara lokal/encrypted staging.
3. Pengguna menekan **Proses**.
4. Orchestrator mendeteksi `XLSX → General Ledger Tool`, membaca sheet dan header, lalu menampilkan progress.
5. AI mengelompokkan kolom, normalisasi tanggal/nominal, memetakan akun ke chart of accounts, dan menandai baris yang tidak seimbang atau ambigu.
6. Mesin akuntansi menghitung ulang debit/kredit dan total batch. AI tidak boleh “membetulkan” angka tanpa menampilkan koreksi dan alasannya.
7. Kartu hasil menampilkan resume: jumlah baris, periode, total debit, total kredit, akun baru, duplikat, anomali, dan tingkat review.
8. Pengguna membuka **Preview** untuk melihat isi asli dan hasil normalisasi berdampingan.
9. Pengguna menekan **Konfirmasi hasil ekstraksi**. Jika ada pengecualian, sistem meminta koreksi hanya pada field/baris terkait.
10. Setelah semua exception diselesaikan dan role berwenang menyetujui, data naik ke **Tahap 2: Accounting Mapping & Journal Proposal**.
11. Tahap 2 menghasilkan draft jurnal. Posting ke buku besar hanya terjadi setelah approval policy terpenuhi.
12. Setelah periode ditutup atau dokumen ditetapkan final, sistem menyimpan paket final, hash, dan audit trail immutable.

## 6. Pipeline bertahap

| Tahap | Tujuan | Output | Gate |
|---|---|---|---|
| 0. Intake | Menerima file/foto/audio/email | Sumber asli, hash sementara, metadata | File aman dan dapat dibaca |
| 1. Decode & Extract | Memilih tool sesuai tipe dan mengambil data | Field terstruktur + evidence locator | MIME, ukuran, encoding, OCR/transkrip tervalidasi |
| 2. Clean & Reconcile | Normalisasi dan uji matematika | Dataset bersih, daftar exception | Total, format, duplikat, periode |
| 3. Accounting Mapping | Mengusulkan akun, pajak, proyek, cost center | Journal Proposal | Rule PSAK, tax policy, confidence, materiality |
| 4. Review & Approval | Manusia memeriksa hal berisiko | Approved batch/journal | Semua exception selesai dan approval role terpenuhi |
| 5. Post & Report | Membentuk jurnal dan laporan | Posted ledger, laporan turunan | Balanced entry, periode terbuka |
| 6. Seal & Proof | Mengunci fakta final | Paket final, SHA-256/Merkle root, blockchain proof | Finalisasi eksplisit dan hash tercatat |

Status minimum: `draft`, `queued`, `processing`, `needs_review`, `ready_for_confirmation`, `confirmed`, `approved`, `posted`, `final`, `rejected`, `failed`, `superseded`.

## 7. Router tool berdasarkan jenis data

| Input | Tool utama | Pemeriksaan khusus | Contoh output |
|---|---|---|---|
| JPG/PNG foto struk | OCR layout + image quality | blur, crop, confidence nominal/tanggal | merchant, item, subtotal, PPN, total |
| PDF faktur | PDF text/table parser, OCR fallback | halaman, tabel, nomor faktur, PPN | supplier, invoice, lines, tax, due date |
| XLSX/CSV buku besar | Spreadsheet parser | header, formula, merged cell, balance | normalized ledger rows |
| Audio WAV/MP3 | Speech-to-text + entity parser | bahasa, noise, speaker, angka rupiah | draft transaction + transcript evidence |
| Email/EML | Mail parser + attachment extractor | sender, thread, attachment hash | invoice source package |
| ZIP dokumen | Archive scanner | path traversal, nested file, malware scan | child documents |
| API/bank export | Schema adapter | signature, idempotency, periode | bank transaction batch |

Tool mengembalikan struktur standar, bukan teks bebas. Jika tool gagal, kartu menyimpan alasan teknis dan rekomendasi tindakan; sistem tidak membuat jurnal dari hasil parsial yang tidak ditandai.

## 8. Model data inti

```text
processing_session
  id, company_id, period_id, created_by, status, created_at

source_document
  id, session_id, original_name, mime_type, size, sha256,
  storage_state, source_channel, retention_until

processing_run
  id, source_id, stage, tool, model, provider, status,
  started_at, finished_at, warnings, input_hash, output_hash

extracted_fact
  id, run_id, field, value, normalized_value, confidence,
  evidence_locator, correction_status

journal_proposal
  id, session_id, line_no, account_id, debit, credit, tax_code,
  project_id, description, psak_basis, confidence, exception_code

approval_event
  id, target_id, action, actor_id, reason, occurred_at, evidence_hash

final_package
  id, session_id, ledger_hash, report_hash, merkle_root,
  blockchain_network, tx_id, finalized_at
```

Nilai yang tidak tersedia disimpan sebagai `null`/**Belum tercatat**, bukan ditebak.

## 9. Resume hasil AI

Resume bukan sekadar ringkasan bahasa natural. Ia adalah panel keputusan yang dapat ditelusuri:

```text
HASIL PEMROSESAN · Buku Besar Juli
2.431 baris | 1 periode | 0 file rusak
Debit Rp 4.820.000.000 | Kredit Rp 4.819.750.000 | Selisih Rp 250.000

Klasifikasi: 2.120 cocok otomatis · 278 perlu review · 33 ditolak
Risiko: 4 duplikat · 2 akun belum dipetakan · 1 periode tertutup

[Preview sumber] [Lihat exception] [Konfirmasi ekstraksi]
```

Setiap angka pada resume dapat diklik menuju baris sumber dan hasil transformasinya. Kalimat AI harus membedakan **fakta**, **asumsi**, dan **rekomendasi**.

## 10. Pakem accounting dan PSAK

- Sistem selalu menggunakan double-entry; setiap jurnal harus `total_debit = total_credit` sebelum posting.
- Pemilihan akun berasal dari chart of accounts perusahaan dan rule version yang berlaku pada tanggal transaksi.
- PPN Masukan/Keluaran dipisahkan berdasarkan tax code dan konfigurasi pajak; AI tidak menetapkan perlakuan pajak hanya dari kemiripan teks.
- Aset tetap, seperti mesin, diarahkan ke register aset dan jadwal penyusutan sesuai kebijakan perusahaan serta basis PSAK yang dikonfigurasi. Sistem menampilkan usulan, masa manfaat, nilai residu, dan alasan; approval tetap diperlukan.
- Transaksi sewa, akrual, prepaid, persediaan, foreign exchange, dan cut-off memiliki rule khusus serta harus menampilkan exception bila data pendukung kurang.
- Buku besar sumber tidak pernah ditimpa. Koreksi dilakukan melalui adjustment/reversal dengan referensi ke versi sebelumnya.
- Periode tertutup menolak posting baru dan mengarahkan pengguna ke jurnal koreksi periode berjalan.
- Materialitas, toleransi pembulatan, approval bertingkat, dan pemisahan tugas dikonfigurasi per entitas—bukan ditanam sebagai asumsi AI.
- Laporan Laba Rugi, Posisi Keuangan, Arus Kas, dan Catatan atas Laporan Keuangan hanya membaca jurnal berstatus `posted`/`final`, bukan hasil chat mentah.

## 11. Penyimpanan draft sampai final

### Draft/local staging

File dan hasil antara dapat disimpan di SQLite/IndexedDB atau local encrypted cache dengan `storage_state = local_draft`. Draft memiliki TTL, dapat dihapus oleh pengguna, dan tidak masuk laporan maupun audit final. Server hanya menerima metadata minimum bila mode offline dipakai.

### Server staging

Saat pengguna memilih sinkronisasi, file dipindahkan ke object storage private. Setiap versi diberi hash dan status. AI run bersifat append-only sehingga hasil yang baru tidak menimpa hasil lama.

### Final persistence

Hanya setelah approval dan finalisasi eksplisit, sistem membuat `final_package` yang berisi dokumen sumber, normalized facts, journal, laporan, approval events, hash chain/Merkle root, serta proof blockchain bila fitur diaktifkan. Data final read-only; perubahan bisnis dilakukan dengan reversal dan versi baru.

## 12. Keamanan, privasi, dan reliabilitas

- Scan malware, validasi MIME berdasarkan magic bytes, batas ukuran, rate limit, dan isolasi parser.
- PII/NPWP/rekening disensor pada log aplikasi dan prompt provider; secret provider hanya berada di server.
- Idempotency key berbasis `source_sha256 + company_id + period_id` mencegah upload ganda.
- Provider AI dapat failover, tetapi response harus menyebut provider/model, warning, dan apakah hasil berasal dari rule engine lokal. HTTP 200 tidak otomatis berarti provider AI berhasil.
- Retry hanya untuk pekerjaan idempotent; job memiliki timeout, cancellation, dead-letter queue, dan resumable stage.
- Audit trail mencatat actor, waktu, status sebelum/sesudah, tool/model, versi rule, hash input/output, alasan koreksi, dan proof metadata.
- Blockchain menyimpan proof hash, bukan dokumen sensitif. Kegagalan blockchain tidak boleh mengubah angka akuntansi yang sudah approved; status menjadi `proof_pending` dan dapat di-retry.

## 13. Kontrak API konseptual

```text
POST /api/processing/sessions
POST /api/processing/sessions/:id/sources
POST /api/processing/sources/:id/process
GET  /api/processing/runs/:id/events       # SSE/WebSocket progress
GET  /api/processing/sources/:id/preview
GET  /api/processing/sources/:id/summary
POST /api/processing/sources/:id/confirm
POST /api/processing/sessions/:id/mapping/approve
POST /api/processing/sessions/:id/post
POST /api/processing/sessions/:id/finalize
GET  /api/processing/sessions/:id/audit
```

`confirm` menerima daftar koreksi eksplisit dan `expected_output_hash`. Jika hash berubah karena proses lain, server menolak request agar pengguna tidak mengonfirmasi hasil yang sudah kedaluwarsa.

## 14. Acceptance criteria MVP

- User dapat upload JPG, PDF, XLSX/CSV, audio, dan email attachment dari chat tanpa command.
- Tombol **Proses** menjalankan router tool yang berbeda sesuai MIME/schema dan memperlihatkan progress per tahap.
- Preview sumber dan preview hasil dapat dibuka berdampingan; sumber asli tidak berubah.
- Resume menampilkan jumlah data, total debit/kredit, exception, confidence, dan link evidence.
- User dapat mengonfirmasi hasil tanpa mengetik ulang seluruh file; baris ambigu wajib ditangani sebelum lanjut.
- Sistem menolak jurnal tidak seimbang, periode tertutup, duplicate idempotency key, dan posting tanpa approval.
- Draft dapat dipulihkan dari local staging; draft tidak muncul di laporan.
- Final package memiliki versi, hash, actor, timestamp, rule/model metadata, dan audit trail immutable.
- Simulasi perubahan satu rupiah pada sumber final menghasilkan hash mismatch dan status verifikasi gagal.
- Setiap kegagalan provider/parser terlihat oleh user dan tidak diam-diam dipresentasikan sebagai hasil AI yang valid.

## 15. Tahapan implementasi

1. **Foundation**: schema session/source/run, upload card, local draft, preview dasar, dan status machine.
2. **Extraction**: tool router untuk spreadsheet, PDF, OCR gambar, audio, dan email attachment.
3. **Accounting intelligence**: normalized facts, chart-of-accounts mapping, tax policy, exception queue, dan journal proposal.
4. **Approval & posting**: role policy, materiality threshold, double-entry validator, reversal, dan laporan berbasis posted ledger.
5. **Trust layer**: immutable audit history, hash chain/Merkle root, verifier, blockchain adapter, dan final package.
6. **Hardening**: parser isolation, PII controls, provider observability, load test file besar, recovery, serta audit/UAT PSAK.

## 16. Keputusan desain yang harus dikunci sebelum coding

- Chart of accounts dan mapping akun per entitas.
- Versi rule PSAK, kebijakan pajak, materialitas, toleransi pembulatan, dan masa retensi draft.
- Apakah audio menjadi bukti pendukung atau dapat menjadi sumber transaksi setelah approval.
- Provider AI yang diizinkan, lokasi pemrosesan, dan kebijakan data sensitif.
- Blockchain network, biaya gas, operator wallet, dan kebijakan `proof_pending`.
- Definisi “final”: per dokumen, per batch, per jurnal, atau setelah tutup periode.
