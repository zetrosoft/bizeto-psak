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
            # Render Tabel Khusus Buku Besar Multi-Kolom Presisi 7 Kolom Lengkap dengan Auto Scroll & Border Halus
            html_buffer.append('  <div class="max-h-80 overflow-auto border-t border-line/40">')
            html_buffer.append('    <table class="w-full text-left text-xs border-collapse whitespace-nowrap">')
            html_buffer.append('      <thead>')
            html_buffer.append('        <tr class="sticky top-0 z-10 bg-muted/90 text-ink font-semibold border-b border-line shadow-xs">')
            html_buffer.append('          <th class="px-3 py-2 w-10 border-r border-line/40">Hal.</th>')
            html_buffer.append('          <th class="px-3 py-2 w-24 border-r border-line/40">Tanggal</th>')
            html_buffer.append('          <th class="px-3 py-2 w-28 border-r border-line/40">No. Ref</th>')
            html_buffer.append('          <th class="px-3 py-2 border-r border-line/40">Deskripsi / Keterangan</th>')
            html_buffer.append('          <th class="px-3 py-2 text-right border-r border-line/40">Debit (IDR)</th>')
            html_buffer.append('          <th class="px-3 py-2 text-right border-r border-line/40">Credit (IDR)</th>')
            html_buffer.append('          <th class="px-3 py-2 text-right">Saldo (IDR)</th>')
            html_buffer.append('        </tr>')
            html_buffer.append('      </thead>')
            html_buffer.append('      <tbody class="divide-y divide-line/40 text-ink">')

            # Algoritma Pengelompokan Baris Transaksi (Grouping Multiline Records)
            gl_records: list[dict[str, Any]] = []
            
            for p in extracted_pages:
                page_num = p["page"]
                lines = p["lines"]
                
                for line in lines:
                    line_str = line.strip()
                    if not line_str:
                        continue
                    # Abaikan header/footer sistem berulang
                    if any(ign in line_str for ign in ["TOKO SEMBAKO", "GENERAL LEDGER", "Period", "dalam IDR", "Account Name", "Tanggal No. Ref", "Report automatically generated", "Jl. Sandang Lawe"]):
                        continue

                    parts = line_str.split()
                    is_new_tx = len(parts) >= 2 and "/" in parts[0] and len(parts[0]) == 10 and parts[0][:2].isdigit()

                    if is_new_tx:
                        # Buat record baru
                        tgl = parts[0]
                        ref = parts[1] if (len(parts) > 1 and ("-" in parts[1] or parts[1].isalnum()) and not parts[1].replace(".", "").replace(",", "").isdigit()) else "-"
                        remains = parts[2:] if ref != "-" else parts[1:]

                        gl_records.append({
                            "page": page_num,
                            "tgl": tgl,
                            "ref": ref,
                            "tokens": remains,
                            "raw_lines": [line_str],
                        })
                    else:
                        # Sambungkan ke record sebelumnya jika baris lanjutan
                        if gl_records:
                            gl_records[-1]["tokens"].extend(parts)
                            gl_records[-1]["raw_lines"].append(line_str)
                        else:
                            gl_records.append({
                                "page": page_num,
                                "tgl": "-",
                                "ref": "-",
                                "tokens": parts,
                                "raw_lines": [line_str],
                            })

            # Proses Pemisahan Kolom (Debit, Kredit, Saldo, Deskripsi) dari gabungan tokens
            for idx, rec in enumerate(gl_records):
                bg_cls = "bg-panel" if idx % 2 == 0 else "bg-muted/20 hover:bg-gold/5"
                tokens = rec["tokens"]
                
                tgl = rec["tgl"]
                ref = rec["ref"]
                debit = "-"
                kredit = "-"
                saldo = "-"
                desc = " ".join(tokens)

                # Cari token angka nominal di bagian akhir
                num_tokens = []
                non_num_tokens = []
                for tok in tokens:
                    clean_tok = tok.replace(".", "").replace(",", "").replace("-", "").replace("(", "").replace(")", "")
                    if clean_tok.isdigit() and len(tok) >= 3:
                        num_tokens.append(tok)
                    else:
                        non_num_tokens.append(tok)

                if num_tokens:
                    if len(num_tokens) >= 3:
                        saldo = num_tokens[-1]
                        kredit = num_tokens[-2]
                        debit = num_tokens[-3]
                    elif len(num_tokens) == 2:
                        saldo = num_tokens[-1]
                        nom = num_tokens[-2]
                        if any(k in desc.upper() for k in ["PEMBELIAN", "PUR-", "EXP-", "PELUNASAN", "UTANG"]):
                            kredit = nom
                        else:
                            debit = nom
                    elif len(num_tokens) == 1:
                        saldo = num_tokens[0]

                    desc = " ".join(non_num_tokens)

                html_buffer.append(f'        <tr class="{bg_cls} transition-colors">')
                html_buffer.append(f'          <td class="px-3 py-2 text-muted-foreground font-mono text-[11px] border-r border-line/30">{rec["page"]}</td>')
                html_buffer.append(f'          <td class="px-3 py-2 font-mono text-[11px] whitespace-nowrap border-r border-line/30">{html.escape(tgl)}</td>')
                html_buffer.append(f'          <td class="px-3 py-2 font-mono text-[11px] text-gold font-semibold whitespace-nowrap border-r border-line/30">{html.escape(ref)}</td>')
                html_buffer.append(f'          <td class="px-3 py-2 font-mono text-[11px] whitespace-nowrap border-r border-line/30">{html.escape(desc)}</td>')
                html_buffer.append(f'          <td class="px-3 py-2 font-mono text-[11px] text-right text-emerald-600 font-semibold border-r border-line/30">{html.escape(debit)}</td>')
                html_buffer.append(f'          <td class="px-3 py-2 font-mono text-[11px] text-right text-amber-600 font-semibold border-r border-line/30">{html.escape(kredit)}</td>')
                html_buffer.append(f'          <td class="px-3 py-2 font-mono text-[11px] text-right text-ink font-semibold">{html.escape(saldo)}</td>')
                html_buffer.append('        </tr>')

            html_buffer.append('      </tbody>')
            html_buffer.append('    </table>')
            html_buffer.append('  </div>')
        else:
            # Render Tabel Umum Teks Baris PDF dengan scrollbar & border halus
            html_buffer.append('  <div class="max-h-80 overflow-auto border-t border-line/40">')
            html_buffer.append('    <table class="w-full text-left text-xs border-collapse whitespace-nowrap">')
            html_buffer.append('      <thead>')
            html_buffer.append('        <tr class="sticky top-0 z-10 bg-muted/90 text-ink font-semibold border-b border-line shadow-xs">')
            html_buffer.append('          <th class="px-3.5 py-2.5 w-16 border-r border-line/40">Hal.</th>')
            html_buffer.append('          <th class="px-3.5 py-2.5">Ekstraksi Baris / Teks Terbaca</th>')
            html_buffer.append('        </tr>')
            html_buffer.append('      </thead>')
            html_buffer.append('      <tbody class="divide-y divide-line/40 text-ink">')
            row_counter = 0
            for p in extracted_pages:
                for line in p["lines"][:12]:
                    row_counter += 1
                    bg_cls = "bg-panel" if row_counter % 2 == 0 else "bg-muted/20 hover:bg-gold/5"
                    html_buffer.append(f'        <tr class="{bg_cls} transition-colors">')
                    html_buffer.append(f'          <td class="px-3.5 py-2 whitespace-nowrap text-muted-foreground font-mono text-[11px] border-r border-line/30">{p["page"]}</td>')
                    html_buffer.append(f'          <td class="px-3.5 py-2 font-mono text-[11px] whitespace-nowrap">{html.escape(line)}</td>')
                    html_buffer.append('        </tr>')
            html_buffer.append('      </tbody>')
            html_buffer.append('    </table>')
            html_buffer.append('  </div>')
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
