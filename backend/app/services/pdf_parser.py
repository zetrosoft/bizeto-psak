from __future__ import annotations

import html
from pathlib import Path
from typing import Any

try:
    import pypdf
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False


def parse_pdf_native(file_path: Path, max_pages: int = 5) -> dict[str, Any]:
    """
    Parser Native untuk Dokumen PDF (.pdf).
    Membaca teks stream & tabel PDF tanpa AI di tahap awal.
    Mengembalikan data terstruktur dan HTML Table murni (<table>).
    """
    if not HAS_PYPDF:
        return {
            "success": False,
            "error": "pypdf library not installed",
            "html_table": "<p class='text-red-500'>Library pypdf belum terpasang di backend.</p>",
            "is_scan": False,
            "text": "",
        }

    try:
        reader = pypdf.PdfReader(file_path)
        total_pages = len(reader.pages)
        extracted_pages: list[dict[str, Any]] = []
        full_text = ""

        for page_idx in range(min(total_pages, max_pages)):
            page = reader.pages[page_idx]
            page_text = page.extract_text() or ""
            full_text += page_text + "\n"

            # Coba ekstrak tabel jika ada dari pypdf (atau baris terpisah newline)
            lines = [line.strip() for line in page_text.split("\n") if line.strip()]
            extracted_pages.append({
                "page": page_idx + 1,
                "text": page_text,
                "lines": lines,
            })

        is_scan = len(full_text.strip()) < 50

        # Jika PDF Scan (tidak ada teks vektor), kembalikan penanda scan
        if is_scan:
            return {
                "success": True,
                "is_scan": True,
                "total_pages": total_pages,
                "filename": file_path.name,
                "text": "",
                "html_table": (
                    '<div class="my-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-ink">'
                    '  <p class="font-bold flex items-center gap-1.5 text-amber-600">📷 PDF Hasil Scan / Gambar Terdeteksi</p>'
                    '  <p class="mt-1 text-muted-foreground">PDF ini berupa citra gambar (bukan teks digital). Sistem akan mengalihkan ke jalur Vision OCR.</p>'
                    '</div>'
                ),
            }

        # Deteksi apakah ini Laporan Buku Besar (General Ledger Report)
        is_gl_report = "GENERAL LEDGER" in full_text.upper() or "BUKU BESAR" in full_text.upper() or "ACCOUNT NAME" in full_text.upper()

        html_buffer = []
        html_buffer.append('<div class="overflow-x-auto my-3 rounded-xl border border-gold/30 shadow-sm bg-panel">')
        html_buffer.append('  <div class="bg-gold/10 px-4 py-2 border-b border-gold/20 flex items-center justify-between">')
        html_buffer.append(f'    <span class="text-xs font-bold text-ink flex items-center gap-1.5">📄 Preview Dokumen PDF ({html.escape(file_path.name)})</span>')
        html_buffer.append(f'    <span class="text-[10px] font-semibold text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/30">{ "Laporan Buku Besar (GL)" if is_gl_report else "PDF Terstruktur" } · {total_pages} Halaman</span>')
        html_buffer.append('  </div>')

        if is_gl_report:
            # Render Tabel Khusus Buku Besar Multi-Kolom Presisi
            html_buffer.append('  <table class="w-full text-left text-xs border-collapse">')
            html_buffer.append('    <thead>')
            html_buffer.append('      <tr class="bg-muted/80 text-ink font-semibold border-b border-line">')
            html_buffer.append('        <th class="px-3 py-2 w-10">Hal.</th>')
            html_buffer.append('        <th class="px-3 py-2 w-24">Tanggal</th>')
            html_buffer.append('        <th class="px-3 py-2 w-28">No. Ref</th>')
            html_buffer.append('        <th class="px-3 py-2">Deskripsi / Keterangan</th>')
            html_buffer.append('        <th class="px-3 py-2 text-right">Debit (IDR)</th>')
            html_buffer.append('        <th class="px-3 py-2 text-right">Credit (IDR)</th>')
            html_buffer.append('      </tr>')
            html_buffer.append('    </thead>')
            html_buffer.append('    <tbody class="divide-y divide-line/40 text-ink">')

            row_idx = 0
            for p in extracted_pages:
                for line in p["lines"]:
                    # Abaikan header/footer berulang
                    if any(ign in line for ign in ["TOKO SEMBAKO", "GENERAL LEDGER", "Period", "dalam IDR", "Account Name", "Tanggal No. Ref", "Report automatically generated", "Jl. Sandang Lawe"]):
                        continue
                    
                    row_idx += 1
                    bg_cls = "bg-panel" if row_idx % 2 == 0 else "bg-muted/20 hover:bg-gold/5"
                    
                    # Parsing Regex Cerdas Baris Transaksi Buku Besar
                    # Format tipikal: DD/MM/YYYY [REF_NO] [Deskripsi...] [Debit/Credit] [Saldo]
                    parts = line.split()
                    tgl = "-"
                    ref = "-"
                    deskripsi = line
                    debit = "-"
                    kredit = "-"
                    saldo = "-"

                    if len(parts) >= 3 and "/" in parts[0] and len(parts[0]) == 10:
                        tgl = parts[0]
                        ref = parts[1] if ("-" in parts[1] or parts[1].isalnum()) else "-"
                        
                        # Ambil angka-angka nominal di ujung baris
                        num_parts = [p for p in parts[2:] if p.replace(".", "").replace(",", "").replace("-", "").replace("(", "").replace(")", "").isdigit()]
                        if len(num_parts) >= 2:
                            saldo = num_parts[-1]
                            nominal = num_parts[-2]
                            # Tentukan Debit vs Kredit dari kata kunci Deskripsi atau struktur angka
                            if any(k in line.upper() for k in ["PEMBELIAN", "PUR-", "EXP-", "PELUNASAN", "TRANSAKSI"]):
                                kredit = nominal
                            else:
                                debit = nominal
                            
                            # Deskripsi adalah sisa kata di tengah
                            desc_words = [w for w in parts[2:] if w not in num_parts]
                            deskripsi = " ".join(desc_words) if desc_words else line
                        elif len(num_parts) == 1:
                            saldo = num_parts[0]
                            desc_words = [w for w in parts[2:-1]]
                            deskripsi = " ".join(desc_words) if desc_words else line

                    html_buffer.append(f'      <tr class="{bg_cls} transition-colors">')
                    html_buffer.append(f'        <td class="px-3 py-2 text-muted-foreground font-mono text-[11px]">{p["page"]}</td>')
                    html_buffer.append(f'        <td class="px-3 py-2 font-mono text-[11px] whitespace-nowrap">{html.escape(tgl)}</td>')
                    html_buffer.append(f'        <td class="px-3 py-2 font-mono text-[11px] text-gold font-semibold whitespace-nowrap">{html.escape(ref)}</td>')
                    html_buffer.append(f'        <td class="px-3 py-2 font-mono text-[11px]">{html.escape(deskripsi)}</td>')
                    html_buffer.append(f'        <td class="px-3 py-2 font-mono text-[11px] text-right text-emerald-600 font-semibold">{html.escape(debit)}</td>')
                    html_buffer.append(f'        <td class="px-3 py-2 font-mono text-[11px] text-right text-amber-600 font-semibold">{html.escape(kredit)}</td>')
                    html_buffer.append('      </tr>')
            html_buffer.append('    </tbody>')
            html_buffer.append('  </table>')
        else:
            # Render Tabel Umum Teks Baris PDF
            html_buffer.append('  <table class="w-full text-left text-xs border-collapse">')
            html_buffer.append('    <thead>')
            html_buffer.append('      <tr class="bg-muted/80 text-ink font-semibold border-b border-line">')
            html_buffer.append('        <th class="px-3.5 py-2.5 w-16">Hal.</th>')
            html_buffer.append('        <th class="px-3.5 py-2.5">Ekstraksi Baris / Teks Terbaca</th>')
            html_buffer.append('      </tr>')
            html_buffer.append('    </thead>')
            html_buffer.append('    <tbody class="divide-y divide-line/40 text-ink">')
            row_counter = 0
            for p in extracted_pages:
                for line in p["lines"][:12]:
                    row_counter += 1
                    bg_cls = "bg-panel" if row_counter % 2 == 0 else "bg-muted/20 hover:bg-gold/5"
                    html_buffer.append(f'      <tr class="{bg_cls} transition-colors">')
                    html_buffer.append(f'        <td class="px-3.5 py-2 whitespace-nowrap text-muted-foreground font-mono text-[11px]">{p["page"]}</td>')
                    html_buffer.append(f'        <td class="px-3.5 py-2 font-mono text-[11px]">{html.escape(line)}</td>')
                    html_buffer.append('      </tr>')
            html_buffer.append('    </tbody>')
            html_buffer.append('  </table>')
        if total_pages > max_pages:
            html_buffer.append(f'  <div class="px-4 py-1.5 text-[10px] text-muted-foreground bg-muted/30 border-t border-line text-center">Menampilkan preview {max_pages} halaman pertama dari total {total_pages} halaman PDF</div>')
        html_buffer.append('</div>')

        return {
            "success": True,
            "is_scan": False,
            "total_pages": total_pages,
            "filename": file_path.name,
            "text": full_text[:2000],
            "html_table": "".join(html_buffer),
        }
    except Exception as exc:
        return {
            "success": False,
            "error": str(exc),
            "html_table": f"<p class='text-red-500'>Gagal membaca file PDF: {html.escape(str(exc))}</p>",
            "is_scan": False,
            "text": "",
        }
