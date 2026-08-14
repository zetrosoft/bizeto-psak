# GEMINI.md - Aturan Spesifik Proyek Bizeto PSAK

## 📜 Standard Operating Procedure (SOP) Ingestion & UI Lifecycle

Setiap proses pemrosesan dokumen (Excel, PDF, dan Gambar) di **Bizeto PSAK** WAJIB secara mutlak mengikuti skenario alur berikut agar selalu masuk context:

---

### 🔄 Skenario Alur Ingestion & Rendering (SOP Mutlak)

1. **Upload File**: User mengunggah berkas (`.xlsx`, `.xls`, `.csv`, `.pdf`, `.jpg`, `.png`).
2. **Cek Entitas Aktif**: 
   - Sistem WAJIB mengonfirmasi entitas aktif yang terpilih. 
   - Jika belum ada entitas aktif, sistem menolak pemrosesan dan meminta user memilih entitas atau menentukan entitas baru lebih dahulu.
3. **Proses Upload & Manual Native Parser (Tanpa AI di Tahap Awal)**:
   - File diproses oleh parser native backend (`excel_parser.py`, `pdf_parser.py`) secara presisi (0% halusinasi, 100% presisi angka).
   - Data langsung tersimpan di database server PostgreSQL `bizeto_psak_db` dengan status awal `DRAFT`.
4. **Tampilan Bubble Chat (Clean HTML Table)**:
   - Hasil ekstraksi WAJIB ditampilkan di dalam bubble chat menggunakan **HTML Table Murni (`<table>`)** yang rapi dan cantik (Soft Panel Border, Header Kontras, Nominal Rata Kanan, Alternating Rows).
5. **Posting & Report Lifecycle**:
   - Status awal: `DRAFT` (Bisa direvisi/diedit di UI).
   - User menyetujui ➔ Status: `POSTED` (Data dikunci di database).
   - Financial Engine memproses data `POSTED` ➔ `GENERATE REPORT` (Laporan Laba Rugi, Balance Sheet, Neraca Saldo).

---

## 🛡️ Aturan Penyimpanan Sesi & Transaksi
- **Sesi UI / Entitas**: Boleh disimpan di LocalStorage sebagai instant client-side cache tanpa flicker.
- **Data Transaksi & Akuntansi**: **100% Wajib Tersimpan Server-Side di PostgreSQL 16 VPS (`bizeto_psak_db`)**, 0% LocalStorage.
