# Format Export PDF Supervisi Farmasi RSUP Surakarta & Validasi Tanda Tangan

Penyesuaian menyeluruh terhadap tampilan export dan pratinjau PDF formulir supervisi farmasi agar persis menyerupai format resmi standar dokumen RSUP Surakarta: tanpa logo, integrasi nomor segel troli (Kunci Lama & Kunci Baru), checklist tabel vector, serta fleksibilitas tanda tangan manual dan digital QR berbasis nomor NIP.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Ringkasan keputusan berdasarkan jawaban klarifikasi pengguna:
> - **Cakupan Dokumen**: Perubahan tampilan difokuskan khusus pada **Laporan Supervisi Farmasi** (Supervision View) agar persis menyerupai contoh dokumen `SUPERVISI_ICU_2025_-_Google_Spreadsheet_31e7a978.pdf`.
> - **Aturan QR & Tanda Tangan**: Nama penandatangan dapat diisi bebas. **QR code TIDAK dibuat secara otomatis**. QR code **HANYA** dibuat dan dicetak jika NIP pegawai diisi. Jika NIP kosong, ruang di atas nama dibiarkan kosong untuk tanda tangan manual / tanda tangan basah.
> - **Kunci Troli Emergensi**: Disediakan form isian **Kunci Lama** dan **Kunci Baru** pada formulir supervisi di aplikasi, dan dicetak di bagian kanan atas kop dokumen PDF.
> - **Tanpa Logo**: Header bersih dari logo Kemenkes/RSUP sesuai instruksi pengguna.

---

## 1. Overview & Core Concept

Implementasi ini menghadirkan standarisasi dokumen supervisi farmasi rawat inap RSUP Surakarta dengan rincian:
1. **Kop Dokumen Resmi**:
   - Judul tengah:
     ```
     SUPERVISI INSTALASI FARMASI DALAM PELAYANAN KEFARMASIAN
     DI RUANG RAWAT INAP RUMAH SAKIT UMUM PUSAT SURAKARTA
     ```
   - Baris metadata:
     - Sisi Kiri: `RUANG : [Nama Ruang]` dan `WAKTU : [Tanggal/Bulan/Tahun]`
     - Sisi Kanan: `KUNCI LAMA : [Nomor Segel]` dan `KUNCI BARU : [Nomor Segel]`
   - Tanpa logo di sudut manapun.

2. **Struktur Tabel Evaluasi**:
   - Kolom:
     1. `Tanggal Supervisi` (lebar ~22mm)
     2. `Uraian` (lebar ~76mm)
     3. `Sesuai` (lebar ~14mm, dengan kotak checkbox vector)
     4. `Tidak Sesuai` (lebar ~14mm, dengan kotak checkbox vector)
     5. `Temuan` (lebar ~30mm)
     6. `Tindak Lanjut` (lebar ~30mm)
   - Judul seksi (A. PENYIMPANAN OBAT/ BMHP DI RUANG PERAWATAN, B. LEMBAR MONITORING, C. TROLI EMERGENSI, D. HIGH ALERT & LASA, E. PENYIMPANAN B3) merentang selebar tabel (*full colSpan*) dengan huruf tebal berbingkai rapi.

3. **Tata Letak Lembar Pengesahan (3 Penandatangan)**:
   - **Baris Atas**:
     - Kiri: **Kepala Ruang**
     - Kanan: **Petugas Supervisi**
   - **Baris Bawah (Tengah)**:
     - **Mengetahui,**
     - **Kepala Instalasi Farmasi**
   - **Logika Tanda Tangan**:
     - *Jika NIP terisi*: QR Code verifikasi digenerate dan diletakkan di antara jabatan dan nama, lalu NIP dicetak di bawah nama tebal.
     - *Jika NIP kosong*: Tidak ada QR Code yang digenerate (area dibiarkan lapang untuk tanda tangan basah/manual), nama dicetak di bawahnya, dan baris NIP tidak ditampilkan.

---

## 2. User Experience & Visual Design

### A. Formulir Web Supervisi (`SupervisionForm.tsx`)
- **Metadata Bar Tambahan**: Di bagian atas formulir supervisi, ditambahkan kartu isian praktis:
  - Input `Kunci Lama` (placeholder: "Nomor segel lama...")
  - Input `Kunci Baru` (placeholder: "Nomor segel baru...")
  - Input `Waktu Supervisi` (tanggal pelaksanaan, default ke tanggal hari ini)
- **Kartu Tanda Tangan Modern**:
  - Input Nama Lengkap (bebas diketik kapan saja).
  - Input Nomor NIP (dengan keterangan jelas: *"Isi NIP untuk mengaktifkan QR Verification; kosongkan untuk tanda tangan manual"*).
  - Tampilan visual responsif: Jika NIP terisi, kotak QR menampilkan kode QR verifikasi dengan status *"Digital Verified"*. Jika NIP kosong, kotak menampilkan siluet pena tanda tangan dengan keterangan *"Tanda Tangan Manual"*.

### B. Pratinjau & Ekspor PDF (`PdfPreviewModal.tsx` & `pdfGenerator.ts`)
- Ketika tombol **Cetak PDF** atau **Download PDF** ditekan pada mode Supervisi, modal langsung merender dokumen format A4 portrait yang presisi sesuai acuan.
- Tabel checklist digambar dengan vector sharp paths (`doc.rect` dan `doc.lines`) sehingga hasil cetak tetap tajam di semua jenis printer dan PDF reader.

---

## 3. Key Product Decisions & Trade-Offs

1. **Vector Drawing untuk Checkbox**:
   - *Pendekatan*: Menggunakan fungsi `didDrawCell` pada `jspdf-autotable` untuk menggambar kotak persegi 3.5mm x 3.5mm dan tanda centang (checkmark) vector.
   - *Alasan*: Karakter Unicode seperti `☑` atau `☐` sering kali mengalami distorsi font atau hilang (*missing glyph*) pada beberapa versi library PDF standar Helvetica. Vector drawing 100% konsisten di semua platform.
2. **Kondisional Penuh untuk QR Code**:
   - *Pendekatan*: Pemeriksaan ketat `const hasNip = Boolean(sig.nip && sig.nip.trim().length > 0)`.
   - *Alasan*: Menjamin sistem tidak pernah membuat QR secara sembarangan jika petugas ruangan belum memasukkan NIP.
3. **Penyimpanan State Kunci Troli**:
   - *Pendekatan*: Menambahkan field `kunciLama`, `kunciBaru`, dan `waktuSupervisi` pada state supervisi di `App.tsx` serta sinkronisasi otomatis ke Firestore/LocalStorage agar data tidak hilang saat beralih tab atau me-refresh halaman.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                        App.tsx                         │
│  - supervisionSections, signatures                    │
│  - kunciLama, kunciBaru, waktuSupervisi               │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│   SupervisionForm.tsx     │ │   PdfPreviewModal.tsx     │
│  - Input Kunci Lama/Baru  │ │  - IFrame Live Preview    │
│  - Input Nama & NIP       │ │  - Download & Print Handlers
│  - Dynamic QR vs Manual   │ └─────────────┬─────────────┘
└───────────────────────────┘               │
                                            ▼
                              ┌───────────────────────────┐
                              │     pdfGenerator.ts       │
                              │  - Header resmi RSUP      │
                              │  - Vector Table Checkbox  │
                              │  - 3-Way Dynamic Signatures
                              └───────────────────────────┘
```

### Rencana File yang Dimodifikasi:
1. `types.ts`: Menambahkan tipe untuk metadata supervisi (`kunciLama`, `kunciBaru`, `waktuSupervisi`).
2. `utils/pdfGenerator.ts`: Menulis ulang generator PDF mode `supervision` agar identik dengan contoh dokumen lampiran:
   - Header teks center tanpa logo
   - Metadata `RUANG`, `WAKTU`, `KUNCI LAMA`, `KUNCI BARU`
   - Tabel 6 kolom dengan checkbox vector
   - Tata letak 3 tanda tangan (Kepala Ruang kiri, Petugas Supervisi kanan, Kepala Instalasi Farmasi tengah bawah) dengan aturan QR hanya aktif jika NIP diinputkan.
3. `components/SupervisionForm.tsx`: Menambahkan input field untuk Kunci Lama & Kunci Baru, serta mengupdate kartu tanda tangan agar menjelaskan status tanda tangan manual vs digital QR.
4. `App.tsx`: Mengelola state `kunciLama`, `kunciBaru`, dan meneruskannya ke form serta modal PDF.
