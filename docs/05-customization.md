# ProQPay ESS Portal — Kustomisasi

Panduan mengubah tampilan, teks, dan perilaku aplikasi tanpa menyentuh
logika inti. Semua perubahan utama dilakukan di `index.html`.

---

## 1. Identitas & Data Demo

Semua data tampilan ada di objek `CONFIG` (blok "KONFIGURASI APLIKASI" di
`index.html`). Ini yang paling sering diedit saat demo/kustomisasi:

| Bagian | Isi | Contoh edit |
|---|---|---|
| `CONFIG.employee` | Profil karyawan | ganti nama, jabatan, email, rekening |
| `CONFIG.company` | Profil perusahaan | nama, alamat, kontak, nama legal |
| `CONFIG.payroll` | Periode & jadwal | periode, referensi, tahap aktif, tanggal gajian |
| `CONFIG.payslips` | Riwayat slip | tambah/kurangi periode, ubah nominal baris |
| `CONFIG.ads` | Banner promosi | judul, deskripsi, warna latar |
| `CONFIG.notifications` | Notifikasi awal | judul, isi, tipe |
| `EWA.rules` | Aturan Advance | persentase fee, plafond, syarat hari kerja |
| `EWA.emp` | Kelayakan demo | `daysWorked`, `tenureMonths` |
| `SESSION` | Identitas sesi | `empId`, `companyId`, `payPeriod` |
| `AUTH` | Kredensial demo login | `demoEmpId`, `demoPass` |

Format penting: baris slip = `[["label", jumlah], …]`; jumlah **positif =
penghasilan**, **negatif = potongan**. Nama bulan pada `period` memakai bahasa
Indonesia (`"Agustus 2026"`).

## 2. Warna & Tema

Palet dikendalikan CSS custom properties di blok `:root` bagian atas
`index.html`:

```css
:root {
  --bg: #0b1226;      /* latar utama (navy gelap) */
  --card: #0f1b3a;    /* warna kartu */
  --primary: #f26522; /* aksen oranye */
  --warn: #ff8a3d;    /* oranye terang */
  /* …dst */
}
```

Mode gelap **dipaksa** lewat
`<script>document.documentElement.classList.add("dark");</script>` di awal
`<body>`. Untuk menghidupkan mode terang, hapus baris tersebut dan gunakan
nilai `--*` light yang sudah tersedia di blok `:root:not(.dark)`.

## 3. Teks & Bahasa

Aturan bahasa saat ini:

- **Inggris** — menu, tombol, judul, subjudul kartu, label statistik/pill.
- **Indonesia** — redaksional/deskripsi, catatan, toast, jawaban FAQ, isi
  notifikasi, catatan slip cetak.

Teks ditulis langsung pada markup HTML dan string di dalam fungsi `render*`.
Cari teks yang ingin diubah dengan *search* (mis. `Request Advance`,
`Payslip History`). Terjemahan nama bulan dipegang `EN_MONTHS`/`ID_MONTHS_FULL`
dan fungsi `enPeriod()`/`idPeriod()`.

### 3a. Halaman Login

Teks login (judul, placeholder, tombol, kotak demo) berada pada markup
`#loginView` di awal `<body>`. Kredensial demo ada di `AUTH.demoEmpId` /
`AUTH.demoPass`. Status login disimpan di `localStorage`/`sessionStorage`
dengan kunci `proqpay-auth` — hapus kunci ini untuk selalu memunculkan halaman
login.

## 4. Ikon

Ikon SVG didefinisikan dalam objek `SVG` (dan `SVG_EXTRA`) dan dirender lewat
`ic(nama, ukuran)`. Untuk menambah ikon baru:

```js
SVG.bintang = '<path d="…"/>';
```

lalu pakai `ic("bintang", 16)` di markup/render.

## 5. Aturan Bisnis EWA

Di produksi, aturan, banner, dan teks portal **diatur dari Lite → Portal Settings**,
bukan dari file ini. Tabel di bawah hanya untuk data demo lokal.

| Parameter | Lokasi | Dampak |
|---|---|---|
| `feeRate` | `EWA.rules.feeRate` | persentase biaya layanan |
| `minFee` / `minFeeAmount` | `EWA.rules` | fee minimum & batas pengajuannya |
| `maxPercent` | `EWA.rules.maxPercent` | plafond maks (% gaji berjalan) |
| `maxTenorMonths` | `EWA.rules.maxTenorMonths` | tenor maksimum (1 = lunas saat gajian) |
| `minDaysWorked` | `EWA.rules.minDaysWorked` | tanggal minimal di bulan gaji (prorata), **bukan** masa kerja |
| `minTenureMonths` / `minTenureDays` | `EWA.rules` | lama bekerja sejak `join_date` kontrak |
| `EWA.MIN` / `EWA.STEP` | blok `EWA` | nominal minimum & kelipatan slider |

## 6. Slip Cetak (A4)

Dokumen `#printSlip` memakai CSS kelas `ps-*` (kotak kop, tabel, tanda tangan,
stempel). Yang sering diubah:

- Logo → `src/brand/proqpay-icon.png`.
- Tanda tangan → blok `.ps-sign` (nama penandatangan).
- Footer → `$("psFoot")` di `buildPrintSlip`.

Ukuran A4 dipertahankan; saat mencetak via browser (`@media print`), seluruh
halaman disamarkan kecuali `#printSlip`.

## 7. Tambah Fitur / Modul Baru

Pola yang dipakai seluruh modul:

1. Tambah markup modal/kartu di `index.html`.
2. Tambah data placeholder di `CONFIG` (+ kolom di `02-database-schema.md`
   bila perlu).
3. Buat fungsi `renderXxx()` + `initXxx()`, lalu panggil dari `init()`.
4. Panggil lewat id dengan pola `namaEl` (id diakhiri `El`, `Btn`, `Ctn`, …).

Jangan lupa perbarui dokumentasi (`01-architecture.md` / `03-api-integration.md`)
bila menambah titik data baru agar koneksi SQL nanti tetap mulus.
