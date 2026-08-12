# Bizeto PSAK backend

Backend awal untuk Workspace Bizeto PSAK.

Tujuan tahap ini:

- Menerima upload/source input sebagai draft.
- Menyimpan metadata, checksum, status, resume, preview, dan audit event di SQLite lokal.
- Menyediakan endpoint proses, preview, konfirmasi, dan reject.
- Menjadi fondasi sebelum OCR, MCP, parser XLSX, dan journal engine penuh disambungkan.

Jalankan lokal:

```bash
python3 -m uvicorn app.main:app --reload --port 2551 --app-dir backend
```

Health check:

```bash
curl http://localhost:2551/health
```
