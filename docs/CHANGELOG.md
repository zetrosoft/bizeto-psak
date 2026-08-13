# Catatan Perubahan Resmi Bizeto PSAK (Changelog & History Versi)

> **Standar Catatan Perubahan & Catatan Rilis Kelas Dunia**  
> **Repositori:** `bizeto-psak`  
> **Standar Format:** Format Standar Changelog / Semantic Versioning (SemVer 2.0.0)  

Semua perubahan penting pada proyek Bizeto PSAK AI Accounting Workspace didokumentasikan dalam file ini.

---

## [2.0.0-alpha.1] - 2026-08-13

### 🏛️ Arsitektur & Fondasi V2 (Jualan V1 ➔ Bizeto PSAK V2)
- **Refaktorisasi Arsitektur**: Mengubah cakupan proyek dari aplikasi OCR nota retail (*Jualan V1*) menjadi **AI Accounting Workspace (V2)** tingkat enterprise yang patuh pada Pernyataan Standar Akuntansi Keuangan (PSAK) dan siap diaudit.
- **Paradigma Tanpa Perintah (Zero-Prompt)**: Menetapkan alur pemrosesan data tanpa prompt yang dikendalikan oleh *document type router* dan aturan kebijakan entitas.
- **Active Core Execution Roadmap**: Menyusun daftar tugas **Core Focus Plan** mencakup skema kanonik 9-tabel, router file multi-source, integrasi MCP Gateway, siklus status 13-tahap, *zero-auto-post*, *evidence locator*, **pengaturan default PPN 11% & HPP 88% via perintah bahasa alami (chat/voice note)**, **Arsitektur Pembelajaran AI 2-Tingkat (Global Base + Tenant Private Isolation)**, dan **ONNX Local Pre-Classifier (<10ms)**. *(Fitur sekunder non-core ditangguhkan sementara).*
- **Suite Spesifikasi**: Mendokumentasikan rancangan induk:
  - `docs/RANCANGAN_AI_ACCOUNTING_PROCESSING_ROOM.md` (Spesifikasi Pipeline 6-Tahap)
  - `docs/DESIGN_SYSTEM_PROCESSING_ROOM.md` (Prinsip UI/UX & Aturan Penulisan i18n)
  - `docs/CERITA_ALUR_AI_ACCOUNTING_PROCESSING_ROOM.md` (Alur Operasional & Cerita Pengguna)
  - `docs/TODO_INTEGRASI_JUALAN_PROCESSING_ROOM.md` (Hasil Audit V1 & Rencana Migrasi)
  - `docs/TODO_P0_ROADMAP.md` (Roadmap Eksekusi Active Core Plan)

### ⚙️ Core Intake & Accounting Engine Focus
- **Active Focus**: Memprioritaskan eksekusi pada 9 tugas **Core Intake & Accounting Engine** untuk membentuk fondasi pipeline data akuntansi yang aman dan presisi.
- **Postponed Non-Core Features**: Menangguhkan fitur pendukung (*Pricing Rules*, *Product Alias Resolver*, *Waste Journal Accounting*, dan *Multimodal Voice Omnibar*) agar fokus 100% pada *Core Intake & PSAK Accounting*.

### 💬 Natural Language Policy Configuration (Chat & Voice Note)
- **`P1-TAX-007` Natural Language Policy Updates**: Pengguna dapat mengubah aturan pajak (PPN), HPP, atau margin usaha secara intuitif cukup dengan instruksi teks atau pesan suara (*voice note*), misal: *“Gunakan PPN 11% dan HPP 90%”*.
- **Smart Conversational Intent Engine**: Backend otomatis mengenali intent `POLICY_CONFIGURATION`, meng-update tabel database kebijakan tenant (`tenant_accounting_policies`), dan memberikan konfirmasi balasan yang ramah.

### 🧠 Arsitektur Pembelajaran AI 2-Tingkat
- **`P1-ISOL-008` 2-Tier Hybrid AI Learning**:
  - *Level 1 Global Base Knowledge*: Pembelajaran anonim dari seluruh pengguna (format struk, OCR teks umum) yang membuat tenant baru langsung menikmati AI cerdas sejak hari pertama.
  - *Level 2 Tenant Private Isolation*: Perlindungan 100% data rahasia bisnis (nama supplier, COA khusus, harga beli, & transaksi internal) yang terikat pada `tenant_id`.

### 🤝 Integrasi AI Gateway & Garansi Kompatibilitas V1
- **Integrasi MCP Gateway**: Menghubungkan pemrosesan AI (Chat Diskusi, Vision OCR, & Smart Parser) ke AI Gateway terpusat **MCP Server Samkarsa (`https://mcp.samkarsa.com`)**.
- **Garansi Kompatibilitas V1**: Menerapkan pemisahan *namespace tool* dan *Circuit Breaker Fallback* mandiri sehingga pengembangan Bizeto V2 **tidak mengganggu operasional Jualan V1**.

### 🎨 Identitas Brand & Sistem Visual
- **Peluncuran Identitas Brand**: Merancang identitas visual gabungan **Huruf B + Balanced Ledger + Evidence Mark** untuk Bizeto PSAK.
- **Sistem Token Warna**:
  - `Champagne Gold` (#D4AF37): Identitas utama brand, kepercayaan, dan otoritas profesional PSAK.
  - `Teal/Cyan` (#00A896): Status AI aktif, eksekusi pemrosesan, dan validasi.
  - `Graphite/Slate` (#0E171F): Permukaan dasar ruang kerja (workspace).
  - `Amber/Merah`: Peringatan peninjauan dan status pengecualian (*exception*).
- **Suite Aset Visual**: Menambahkan vektor SVG resolusi tinggi di bawah `public/brand/` (`favicon.svg`, `navbrand.svg`, `navbrand-dark.svg`, `splash.svg`, `og-image.svg`).

### 💻 Frontend Workspace UI (`app/workspace`)
- **Tata Letak Dual-Mode Workspace**: Mengintegrasikan workspace bergaya Google AI Studio yang terdiri dari:
  - `Start Mode`: Area composer utama di tengah, ide chip/template, pemilih entitas, dan sidebar navigasi.
  - `Active Mode`: Tata letak 3-panel yang terdiri dari Log Proses (Kiri), Stream Artifak (Tengah), dan Inspector Bukti Terpilih (Kanan).
- **Kontrol Header & Navigasi**: Menambahkan pemilih entitas & periode, pengubah bahasa i18n Inggris/Indonesia, serta sakelar tema satu tombol (`Sistem` ➔ `Terang` ➔ `Gelap`).
- **Peningkatan Composer**: Membangun area teks dinamis dengan tombol lampiran (`+`), badge sumber input melingkar, dan pemicu pemrosesan.

### ⚙️ Layanan Backend & Orchestrator (`backend/app`)
- **Layanan Core FastAPI**: Membangun layanan backend berbasis Python FastAPI di bawah `backend/app/main.py`.
- **Router Tipe Dokumen**: Mengimplementasikan deteksi awal untuk gambar, PDF, dan spreadsheet (`backend/app/services/document_router.py`).
- **Parser Buku Besar**: Membangun `ledger_parser.py` untuk membaca dataset Buku Besar Excel/CSV.
- **Klien Gateway MCP**: Menambahkan `mcp_chat_client.py` dan `mcp_vision_client.py` untuk berkomunikasi dengan MCP Server Samkarsa.
- **Mesin Pemeriksaan Cepat (Quick Check)**: Mengimplementasikan `quick_check.py` untuk inspeksi cepat header & struktur file sebelum eksekusi pipeline penuh.

---

## [1.2.0] - 2026-08-11

### 🔧 Perbaikan
- **Kalkulasi Saldo Token**: Memperbaiki bug penggabungan string yang menyebabkan saldo token menampilkan `"100300"` alih-alih `400` akibat agregasi SQLite mengembalikan tipe data string. Mengimplementasikan `normalizeRow()` pada `SqliteD1Wrapper`.
- **Penerjemah Otomatis SQL**: Menambahkan aturan penerjemahan otomatis SQLite ke PostgreSQL untuk `LIKE` ➔ `ILIKE`, `strftime()` ➔ `TO_CHAR()`, `AUTOINCREMENT` ➔ `SERIAL`, dan nilai default boolean.

### 🚀 Penambahan
- **Sinkronisasi Skema**: Menambahkan script CLI `sync-schema-to-postgres.js` untuk migrasi skema DDL yang aman antara AI Studio SQLite dan PostgreSQL Produksi.

---

## [1.1.0] - 2026-08-07

### 🚀 Penambahan
- **Fondasi Akuntansi Multi-Tenant**: Memperkenalkan batasan isolasi tenant pada seluruh transaksi, chart of accounts (COA), dan entri buku besar.
- **Siklus Hidup Draf & Posting**: Memisahkan status transaksi menjadi status eksplisit `DRAFT` dan `POSTED`.

---

## [1.0.0] - 2026-07-22

### 🎉 Rilis Perdana (Legacy Jualan V1)
- **Mesin OCR Retail**: Rilis perdana pengunggahan OCR nota retail, parser teks pintar, dan pembentukan jurnal berpasangan (*double-entry*) tingkat dasar.
