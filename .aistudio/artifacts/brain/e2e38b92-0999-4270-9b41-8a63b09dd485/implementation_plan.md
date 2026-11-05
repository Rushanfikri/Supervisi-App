# Penambahan Tombol Opsi QR Tanda Tangan & Baris Periode pada Kop PDF

Rencana implementasi perubahan kendali tanda tangan dan penambahan informasi Periode pada formulir supervisi dan dokumen export PDF RSUP Surakarta.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Ringkasan penyesuaian baru:
> - **Kop Dokumen PDF**: Di atas baris `RUANG` dan `WAKTU`, ditambahkan baris teks tebal: `PERIODE : [BULAN TAHUN]` (contoh: `PERIODE : AGUSTUS 2026`) yang nilainya otomatis tersinkronisasi dengan periode bulan dan tahun yang dipilih di aplikasi.
> - **Opsi Tombol QR Terpisah**:
>   - Nomor NIP tetap dapat diisi kapan saja oleh pengguna.
>   - Disediakan tombol saklar/toggle terpisah di setiap kartu penandatangan di aplikasi: **"Gunakan QR Digital"** vs **"Tanda Tangan Manual"**.
>   - Jika tombol QR **aktif**: Sistem men-generate QR verification dan mencetaknya di atas nama lengkap, disertai NIP di bawah nama.
>   - Jika tombol QR **nonaktif**: Dokumen mencetak area kosong tanda tangan basah di atas nama, nama lengkap tetap dicetak tebal, dan nomor NIP yang telah diisi tetap dicetak rapi di bawah nama.

---

## 1. Overview & Core Concept

1. **Tata Letak Kop PDF Terbaru**:
   - Judul Tengah:
     ```
     SUPERVISI INSTALASI FARMASI DALAM PELAYANAN KEFARMASIAN
     DI RUANG RAWAT INAP RUMAH SAKIT UMUM PUSAT SURAKARTA
     ```
   - Baris Metadata:
     - Sisi Kiri:
       ```
       PERIODE : AGUSTUS 2026
       RUANG   : NAKULA
       WAKTU   : 12/08/2026
       ```
     - Sisi Kanan:
       ```
       KUNCI LAMA : B-4019
       KUNCI BARU : B-4020
       ```
     - Tanpa logo di sudut mana pun.

2. **Mekanisme Opsi QR & Tanda Tangan Mandiri**:
   - Model data `Signatory` / `SupervisionSignatures` diperkaya dengan flag boolean:
     - `useQR?: boolean` (default: false untuk tanda tangan manual atau true jika diaktifkan pengguna).
   - Di formulir web (`SupervisionForm.tsx`), setiap kartu penandatangan memiliki tombol toggle interaktif yang jelas:
     - Status Aktif: Menampilkan preview QR Code dan status *"Digital QR Verification Aktif"*.
     - Status Nonaktif: Menampilkan status *"Mode Tanda Tangan Manual/Basah"* dengan instruksi *"NIP tetap dicetak di bawah nama"*.
   - Di PDF (`pdfGenerator.ts`):
     - Membaca flag `useQR`. Jika `true`, QR dicetak di atas nama. Jika `false`, disediakan ruang kosong tanda tangan basah di atas nama.
     - Nama dicetak tebal.
     - Jika NIP terisi, NIP selalu dicetak di bawah nama baik pada mode QR maupun mode manual.

---

## 2. User Experience & Visual Design

### A. Tampilan Kartu Tanda Tangan di Aplikasi
- Setiap kotak penandatangan (*Supervisor Unit*, *Kepala Ruang*, *Kepala Instalasi Farmasi*) dilengkapi dengan:
  - Input **Nama Lengkap**.
  - Input **Nomor NIP**.
  - Tombol Toggle Opsi:
    - `[ Toggle Switch ] Gunakan QR Digital`
  - Area Visualizer Responsif:
    - Mode QR Aktif: Menampilkan QR code dengan bingkai verifikasi digital.
    - Mode Manual: Menampilkan ikon pena dan area tanda tangan basah, memastikan pengguna yakin bahwa NIP tetap tersimpan dan tercetak di PDF.

### B. Pratinjau Modal PDF (`PdfPreviewModal.tsx`)
- Secara instan memperbarui tampilan IFrame PDF setiap kali tombol QR diubah, nama diedit, NIP diisi, atau periode bulan/tahun diganti.

---

## 3. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                        App.tsx                         │
│  - selectedMonth, selectedYear                        │
│  - signatures (nama, nip, useQR)                      │
│  - kunciLama, kunciBaru, waktuSupervisi               │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│   SupervisionForm.tsx     │ │   PdfPreviewModal.tsx     │
│  - Input Periode Info     │ │  - Realtime IFrame Render │
│  - Toggle "Gunakan QR"    │ │  - Sync selectedMonth/Year│
│  - Input Nama & NIP       │ └─────────────┬─────────────┘
└───────────────────────────┘               │
                                            ▼
                              ┌───────────────────────────┐
                              │     pdfGenerator.ts       │
                              │  - Kop: PERIODE, RUANG,   │
                              │    WAKTU, KUNCI LAMA/BARU │
                              │  - QR dicetak jika useQR  │
                              │  - NIP & Nama tetap cetak │
                              └───────────────────────────┘
```

### Rencana File yang Dimodifikasi:
1. `types.ts`: Menambahkan properti `useQR?: boolean` pada `Signatory`.
2. `utils/pdfGenerator.ts`:
   - Menambahkan baris `PERIODE : ${periodStr.toUpperCase()}` di atas `RUANG` dan `WAKTU` pada kop surat PDF mode supervisi.
   - Mengubah logika cetak QR: QR code hanya di-generate dan dicetak jika `sig.useQR === true`. Jika `false`, sediakan ruang tanda tangan manual di atas nama, dan tetap cetak NIP (jika ada) di bawah nama.
3. `components/SupervisionForm.tsx`:
   - Menambahkan tombol toggle/switch `"Gunakan QR Digital"` pada setiap penandatangan.
   - Menampilkan label Periode aktif pada panel info supervisi.
4. `App.tsx`:
   - Menyediakan handler untuk mengubah status `useQR` pada signatures dan meneruskan period month/year ke PDF generator.
