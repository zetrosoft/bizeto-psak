# Cerita Alur AI Accounting Workspace

## Satu Ruang untuk Semua Bukti Transaksi

Pagi itu, pabrik PT Manufaktur Nusantara sudah ramai. Mesin produksi berjalan, truk datang dan pergi, dan berbagai transaksi terjadi hampir bersamaan.

Sopir membeli solar dan memfoto struknya. Bagian pembelian menerima faktur bahan baku melalui email. Manajer lapangan mengirim rekaman suara:

> “Tolong catat, baru saja bayar sewa mesin las lima juta rupiah tunai untuk lokasi B.”

Dahulu, semua bukti itu harus dikumpulkan di meja akuntan. Ada foto, PDF, rekaman suara, dan file Excel. Akuntan kemudian mengetik ulang isinya satu per satu.

Sekarang, semua bukti tersebut masuk ke satu tempat bernama **AI Accounting Workspace**.

## Andi Membuka Sesi Baru

Andi adalah staf akuntansi. Ia membuka aplikasi dan menekan tombol **Sesi Baru**.

Bagi Andi, sesi baru seperti membuka satu map kerja khusus. Ia bisa memberi nama:

> “Transaksi Operasional Lokasi B — Juli 2026”

Satu sesi ini dapat berisi beberapa bukti yang berhubungan. Misalnya foto struk solar, rekaman suara manajer, dan faktur sewa alat.

Sistem kemudian menanyakan dua hal penting: perusahaan mana dan periode akuntansi mana.

## Memilih Entitas

Andi memilih entitas **PT Manufaktur Nusantara** dan periode **Juli 2026**.

Nama entitas bukan hanya tulisan di bagian atas layar. Pilihan ini menentukan aturan yang harus digunakan sistem.

PT Manufaktur Nusantara memiliki daftar akun, kebijakan pajak, mata uang, batas materialitas, dan aturan persetujuan sendiri. Karena itu, transaksi PT Manufaktur Nusantara tidak boleh tercampur dengan transaksi perusahaan lain.

Setelah entitas dipilih, sistem memahami bahwa semua data yang dimasukkan Andi harus diproses untuk perusahaan dan periode tersebut.

## Mengunggah Bukti

Andi menyeret tiga file ke dalam ruang kerja:

- `struk-solar.jpg`
- `sewa-mesin-las.mp3`
- `invoice-bahan-baku.pdf`

Setiap file berubah menjadi sebuah **kartu proses** di dalam percakapan. Kartu itu menunjukkan nama file, jenis file, ukuran, dan statusnya.

Andi tidak perlu menulis perintah seperti “bacakan file ini” atau “buatkan jurnal”. Ia cukup menekan tombol **Proses**.

## Senior Akuntan AI Mulai Bekerja

Setelah tombol **Proses** ditekan, Senior Akuntan AI mulai membaca setiap file dengan cara yang berbeda.

Untuk foto struk, sistem menggunakan pembaca gambar. Sistem mencari nama SPBU, tanggal, jumlah liter, dan total pembayaran.

Untuk PDF, sistem membaca teks dan tabel faktur. Sistem memisahkan harga bahan baku, PPN, total invoice, dan nama pemasok.

Untuk rekaman suara, sistem mengubah suara menjadi teks. Setelah itu, sistem memahami bahwa:

```text
Keperluan : sewa mesin las
Nilai     : Rp5.000.000
Pembayaran: tunai
Lokasi    : Lokasi B
```

Di layar, Andi dapat melihat prosesnya berjalan:

```text
Masuk → Dibaca → Dipahami → Diuji → Diklasifikasi
```

Jika sistem menemukan suara yang kurang jelas atau angka yang meragukan, sistem tidak mengarang jawaban. Sistem menandainya sebagai **Perlu Review**.

## Workspace Menjadi Papan Kendali

Di sebelah kiri terdapat **Workspace**. Workspace adalah tempat Andi melihat semua pekerjaan yang sedang ia tangani.

Di sana terdapat beberapa kelompok:

- **Semua Sesi**: seluruh pekerjaan Andi.
- **Draft Lokal**: pekerjaan yang belum dikirim permanen ke server.
- **Menunggu Saya**: pekerjaan yang membutuhkan konfirmasi Andi.
- **Perlu Perhatian**: pekerjaan yang memiliki masalah atau angka tidak cocok.
- **Final**: pekerjaan yang sudah disetujui dan dikunci.

Workspace membantu Andi mengetahui apa yang harus dilakukan berikutnya. Ia tidak perlu mencari-cari file di banyak folder atau mengingat proses mana yang belum selesai.

## Resume Hasil Pemrosesan

Setelah bekerja, AI menampilkan resume yang mudah dibaca:

```text
3 file diproses
4 transaksi ditemukan
2 transaksi cocok otomatis
1 transaksi perlu review
1 transaksi menunggu informasi tanggal
```

Untuk file buku besar, resume dapat berisi:

```text
2.431 baris terbaca
Total debit  : Rp4.820.000.000
Total kredit : Rp4.819.750.000
Selisih      : Rp250.000
```

AI juga menjelaskan bahwa ada dua baris yang belum memiliki pasangan akun. Andi dapat melihat masalah itu sebelum data masuk ke jurnal.

Resume bukan keputusan final. Resume adalah laporan singkat agar Andi dapat memahami hasil kerja AI dan menentukan langkah berikutnya.

## Inspector Menunjukkan Bukti Terpilih

Andi melihat angka Rp5.000.000 pada resume dan mengkliknya.

Di sebelah kanan terbuka panel **Inspector — Bukti Terpilih**.

Inspector seperti kaca pembesar. Panel ini menunjukkan dari mana angka tersebut berasal dan bagaimana AI memahaminya.

Inspector menampilkan:

```text
Sumber asli       : sewa-mesin-las.mp3
Hasil transkrip   : bayar sewa mesin las lima juta rupiah
Nilai             : Rp5.000.000
Lokasi            : Lokasi B
Usulan akun       : Beban Sewa Peralatan
Metode pembayaran : Kas
Status            : Perlu konfirmasi
```

Jika sumbernya adalah Excel, Inspector menunjukkan sheet dan nomor baris. Jika sumbernya PDF, Inspector menunjukkan halaman. Jika sumbernya foto, Inspector menunjukkan area gambar tempat angka ditemukan.

Dengan cara ini, Andi tidak hanya melihat hasil AI. Ia juga dapat memeriksa bukti aslinya.

## AI Mengusulkan Bahasa Akuntansi

Setelah memahami bukti, AI mengusulkan jurnal.

Untuk sewa mesin las:

```text
Debit  Beban Sewa Peralatan   Rp5.000.000
Kredit Kas                    Rp5.000.000
```

Untuk invoice bahan baku:

```text
Debit  Persediaan Bahan Baku  Rp12.500.000
Debit  PPN Masukan            Rp 1.375.000
Kredit Utang Usaha            Rp13.875.000
```

AI tidak langsung memasukkan jurnal tersebut ke buku besar. Jurnal itu masih berupa **usulan**.

Sistem memeriksa apakah jumlah debit dan kredit seimbang, apakah akun tersedia, apakah periode masih terbuka, apakah invoice pernah diproses sebelumnya, dan apakah perlakuan pajaknya sesuai kebijakan perusahaan.

## Saat Ada Masalah

Misalnya angka pada buku besar menunjukkan debit Rp5.000.000, tetapi kredit hanya Rp4.750.000.

Sistem tidak mengubah angka secara diam-diam. Sistem menampilkan pesan:

> “Debit dan kredit belum seimbang. Terdapat selisih Rp250.000 pada baris 87.”

Andi dapat membuka **Preview** untuk melihat data asli dan hasil AI secara berdampingan.

Ia mungkin menemukan bahwa angka pada file memang salah. Ia kemudian memperbaikinya melalui proses koreksi resmi, bukan dengan menghapus jejak lama.

## Preview dan Konfirmasi

Saat menekan **Preview**, Andi melihat dua sisi:

```text
Sisi kiri  : dokumen atau file asli
Sisi kanan : hasil pembacaan dan klasifikasi AI
```

Andi membandingkan keduanya. Jika sudah benar, ia menekan **Konfirmasi Ekstraksi**.

Konfirmasi ini berarti:

> “Saya sudah memeriksa hasil pembacaan data ini dan menyatakan bahwa hasil ekstraksinya dapat diteruskan.”

Konfirmasi ekstraksi belum sama dengan persetujuan jurnal. Setelah itu data masih harus melewati tahap mapping akun, review, approval, dan posting.

## Dari Data Mentah Menjadi Jurnal

Perjalanan data Andi adalah:

```text
Foto / PDF / Audio / Excel
          ↓
Data yang dibaca sistem
          ↓
Data yang sudah dibersihkan
          ↓
Klasifikasi akun dan pajak
          ↓
Usulan jurnal
          ↓
Konfirmasi dan approval
          ↓
Buku besar resmi
          ↓
Laporan keuangan
```

Data mentah tidak langsung menjadi laporan. Ada beberapa pemeriksaan dan persetujuan di antaranya.

## Data Draft dan Data Final

Selama Andi masih memeriksa, data disimpan sebagai draft. Draft dapat berada di local storage atau SQLite agar sesi tidak hilang jika browser ditutup.

Namun draft belum boleh memengaruhi laporan keuangan.

Setelah jurnal disetujui dan diposting, data masuk ke buku besar resmi. Setelah dokumen atau batch ditetapkan final, sistem membuat paket final yang berisi dokumen asli, hasil AI, jurnal, approval, dan hash.

Data final tidak diedit langsung. Jika terjadi kesalahan, sistem membuat jurnal pembalik atau versi koreksi baru.

## Mengapa Ada Blockchain?

Setelah data final selesai, sistem membuat sidik jari digital dari dokumen, jurnal, dan laporan.

Sidik jari tersebut disimpan ke blockchain. Dokumen asli tetap berada di penyimpanan perusahaan, sedangkan blockchain menyimpan bukti bahwa data final pernah memiliki isi tertentu.

Jika seseorang mengubah nilai transaksi dari Rp5.000.000 menjadi Rp5.000.001, sidik jarinya berubah. Sistem dapat mengetahui bahwa data internal tidak lagi sama dengan data yang sudah disegel.

## Kesimpulan Cerita

Dalam aplikasi ini:

- **Sesi Baru** adalah map kerja untuk satu batch pekerjaan.
- **Entitas** menentukan perusahaan dan aturan akuntansi yang digunakan.
- **Workspace** adalah papan kendali seluruh pekerjaan.
- **Processing Card** menunjukkan perjalanan setiap file.
- **Resume AI** menjelaskan hasil pemrosesan dengan bahasa sederhana.
- **Inspector** menunjukkan bukti asli dan asal setiap angka.
- **Preview** membantu pengguna membandingkan sumber dan hasil AI.
- **Konfirmasi** meneruskan data ke tahap berikutnya.
- **Accounting Engine** memastikan jurnal seimbang dan sesuai aturan.
- **Approval** memastikan manusia tetap memegang keputusan penting.
- **Final Package dan Blockchain** mengunci bukti serta jejak perubahan.

Dengan demikian, aplikasi ini bukan hanya tempat mengunggah buku besar. Aplikasi ini adalah ruang kerja yang mengubah foto, suara, PDF, email, dan spreadsheet menjadi data akuntansi yang dapat diperiksa, disetujui, diposting, dan dipertanggungjawabkan.
