# ProQPay ESS Portal — Dokumentasi Arsitektur

Versi aplikasi: **ProQPay — ESS Portal v2**
Platform: **SPA + Cloudflare Pages Functions** (baca D1 Lite; lihat `06-d1-mapping.md`)

---

## 1. Gambaran Umum

ProQPay ESS Portal adalah aplikasi *Employee Self-Service* yang berjalan
sepenuhnya di sisi klien (browser) dalam satu halaman (SPA). Saat ini seluruh
data bersifat **statis/demo** dan sudah diberi penanda *placeholder* agar
mudah dihubungkan ke **query SQL** melalui API backend nanti.

Alur data secara ringkas:

```
Cloudflare D1 (proqpay-lite-production)
   │  SELECT only — functions/api/_portal.js
   ▼
ESS Pages Functions
   │  POST /api/portal/login
   │  GET  /api/portal/init
   ▼
loadFromSQL() / applyPortalPayload()
   ▼
CONFIG  +  EWA  +  SESSION  →  renderer
```

---

## 2. Struktur File

| File | Peran |
|---|---|
| `index.html` | SPA UI + adapter `loadFromSQL`. |
| `functions/api/` | Pages Functions baca-saja ke D1 Lite. |
| `wrangler.toml` | Binding D1 `DB` = `proqpay-lite-production` (tanpa migrasi). |
| `main.pjs` | Metadata Perchance. |
| `src/brand/` | Logo. |
| `src/docs/*.md` | Dokumentasi. |

> `index.html` memuat bagian dari `<body>` saja (Perchance menambahkan wrapper
> `<html>/<head>/<body>` sendiri). Jangan menambahkan tag `<html>/<head>/<body>`.

---

## 3. Bagian-Bagian Kode (Modul) di `index.html`

Skrip utama adalah **satu IIFE** `(function(){ "use strict"; … })()` sehingga
variabel global tidak bocor. Urutan blok:

1. **CSS & tema** — variabel warna (`--bg`, `--card`, `--primary`, `--warn`, …),
   mode gelap dipaksa via `<script>document.documentElement.classList.add("dark")</script>`
   di awal `<body>`.
2. **Login page** — `#loginView` (overlay `z-index:300` yang menutupi seluruh
   aplikasi sampai login berhasil). Berisi kartu login: logo, input Employee ID
   & Password (dengan toggle tampil/sembunyi), *remember me*, tombol Sign In,
   kotak kredensial demo, dan tautan *Forgot password*.
3. **Markup halaman** — header, banner promosi, hero + statistik, kartu tracker
   payroll, kartu Advance Salary, riwayat slip, footer, serta modal:
   - `payslipModal` (detail slip),
   - `profileModal` (profil + tombol **Log Out**),
   - `helpModal` (Help Center + FAQ),
   - `notifyModal` (notifikasi),
   - `ewaModal` (wizard Advance Salary),
   - `printSlip` (dokumen A4 untuk cetak/PDF, `aria-hidden`).
3. **CONFIG** — objek data utama (placeholder semua, lihat §4).
4. **SESSION / SQL_BIND / loadFromSQL** — placeholder koneksi backend (§5).
5. **Helper umum** — `$` (getElementById), `fmt` (format Rupiah), `totalOf`,
   `esc`, `enPeriod`/`idPeriod` (terjemahan nama bulan), `slipRef`, `loadLibs`
   (loader skrip CDN), sistem ikon SVG `ic()`.
6. **Modul render & interaksi** (fungsi `render*`, `init*`).
7. **Modul EWA** — aturan, kelayakan, wizard, simulasi status.
8. **AUTH / Login** — `initAuth`, `authLogin`, `authPersist`/`authRestore`/
   `authClear`, `openLogin`/`enterApp`, `authLogout`. Gate akses sebelum aplikasi
   dipakai (lihat §8a).
9. **BOOT** — `boot()`: wire login → cek sesi tersimpan → (a) masuk lalu muat
   data (`SQL_LIVE ? loadFromSQL→init : init demo`), atau (b) tampilkan login.

### 3.1 Modul-modul fungsi utama

| Kelompok | Fungsi |
|---|---|
| Statistik | `renderStats` |
| Tracker payroll | `initTracker`, `setStage`, `renderStepper`, `renderStageHero`, `renderBreakdown`, `renderPill`, `stageTag`, `stageIcon` |
| Banner promosi | `renderAds`, `initAds` |
| Slip gaji (modal) | `openPayslip`, `buildPrintSlip`, `downloadSlip` |
| Slip gaji (cetak/PDF) | `buildPrintSlip` (mengisi `#printSlip`), `downloadSlip` (html2canvas → jsPDF) |
| Riwayat | `renderHistory` |
| Modal umum | `openModal`, `closeModal`, `initModals` |
| Notifikasi & bantuan | `initNotifs`, `initHelp` |
| Toast | `toast` |
| EWA | `renderEwaCard`, `renderEwaHome`, `startWizard`, `renderWizard`, `renderStep1Amt`, `ewaSubmit`, `ewaSuccess`, `ewaCancel`, `ewaDemoApprove`, `ewaDemoLunas`, `ewaEligible`, `ewaPlafond`, `ewaFee`, `ewaLoad`/`ewaSave` |
| Tab bar | `initTabbar`, `setActiveTab` |
| Header | `initHeader` |
| Autentikasi | `initAuth`, `authLogin`, `sha256Hex`, `authPersist`, `authRestore`, `authClear`, `openLogin`, `enterApp`, `authLogout` |
| Boot | `init`, `boot` |

---

## 4. Objek Data `CONFIG` (Placeholder)

Semua nilai demo dipetakan ke kolom tabel SQL yang dituju (skema lengkap di
`02-database-schema.md`). Bentuk JSON yang dipakai renderer:

```jsonc
{
  "employee": { "name", "company", "role", "email", "phone", "empId", "bank" },
  "company":  { "name", "tagline", "address", "contact", "legal" },
  "payroll":  { "period", "ref", "stage", "payday", "paydayShort" },
  "stages":   [ { "title", "desc", "meta", "note", "eta" }, … 4 item ],
  "payslips": [ { "period", "status": "processing|paid", "rows": [["label", jumlah], …] } ],
  "ads":      [ { "tag", "title", "desc", "cta", "bg" } ],
  "notifications": [ { "title", "s", "type": "a|g", "unread" } ]
}
```

Aturan penting yang dipakai kode:

- `payslips[].rows[]` — baris slip; **jumlah positif = penghasilan**, **negatif =
  potongan**. `totalOf(slip)` menjumlahkannya menjadi *take-home pay*.
- `payroll.stage` — angka 1..4, menandai tahap aktif tracker (lihat `stages`).
- `period` memakai nama bulan Indonesia (`"Agustus 2026"`); ditampilkan dalam
  bahasa Inggris lewat `enPeriod()`.

## 5. Objek `EWA` (Advance Salary)

| Properti | Peran | Sumber SQL (nantinya) |
|---|---|---|
| `EWA.rules` | Aturan bisnis: `feeRate`, `minFee`, `minFeeAmount`, `maxTenorMonths`, `maxPercent`, `minDaysWorked` | `m_ewa_config` per tenant |
| `EWA.emp` | `daysWorked`, `tenureMonths` (kelayakan) | `v_ewa_eligibility` |
| `EWA.app` | Pengajuan aktif `{ref, amount, fee, method, inst, date, status}` | `t_advance` |
| `EWA.history` | Riwayat pengajuan | `t_advance` |
| `EWA.wizard` | State wizard `{step, amount, method, inst, agreed}` | — (lokal) |
| `EWA.MIN/STEP` | Batas minimal & langkah nominal | — (lokal) |

Rumus yang dipakai:

- **Fee**: `max(amount × feeRate, minFee)` bila `amount ≤ minFeeAmount`, selain
  itu `amount × feeRate`.
- **Eligible**: `daysWorked ≥ minDaysWorked` **dan** `tenureMonths ≥ 1`.
- **Plafond**: `floor(net_slip × min(1, hari_berjalan/hari_sebulan) × maxPercent ÷ STEP) × STEP`
  — proporsional terhadap gaji yang sudah “dikerjakan” di bulan berjalan.

Persistensi: `EWA.app` disimpan di `localStorage` kunci `proqpay-ewa-app`
(masih *client-side*; nantinya pindah ke `t_advance` di server).

## 6. Pipeline Cetak / PDF

1. `openPayslip(i)` memanggil `buildPrintSlip(i)` → mengisi elemen `#printSlip`
   (A4, CSS khusus `@media print`).
2. `downloadSlip()`:
   - memuat `html2canvas` dan `jsPDF` dari CDN (bila belum ada),
   - `html2canvas` menangkap `#printSlip` → PNG → dimasukkan ke PDF A4 → disimpan
     dengan nama `payslip-<bulan>-<tahun>.pdf`.
3. Tombol **Print / PDF** menggunakan `window.print()` dan CSS `@media print`
   yang menyembunyikan seluruh halaman kecuali `#printSlip`.

## 7. Tema, Bahasa, dan Responsivitas

- **Tema**: gelap (dark) dipaksa; palet navy `#0F1B3A` + aksen oranye `#F26522`.
  Seluruh warna via CSS custom properties di blok `:root`.
- **Bahasa**: menu, tombol, judul, dan subjudul kartu **Inggris**; redaksional/
  deskripsi **Indonesia**. Terjemahan nama bulan dipegang `enPeriod`/`idPeriod`.
- **Responsif**: layout mobile-first (maksimal lebar konten, tab bar bawah,
  kartu bertumpuk); skala `printSlip` tetap A4.

## 8a. Alur Login & Sesi

Login adalah **gerbang akses**: `#loginView` menutupi seluruh aplikasi sampai
login berhasil.

```
boot()
 ├─ initAuth()             → wire form login (tombol, toggle password, Enter)
 ├─ authRestore()
 │    ada sesi? ──ya──▶  isi SESSION → enterApp() → muat data
 │                        (SQL_LIVE ? loadFromSQL→init : init demo)
 │    tidak ada ──▶ openLogin()
 │                      ├─ mode demo : aplikasi di-render di balik layar,
 │                      │              langsung tampil setelah login sukses
 │                      └─ SQL_LIVE  : render menunggu login berhasil
 │                                        ↓
 │                     authLogin(empId, pass)
 │                        ├─ demo : cek kredensial (SHA-256, lokal)
 │                        └─ SQL  : POST /api/login (validasi m_employee,
 │                                  t_login_attempt, terbitkan t_session)
 │                                        ↓
 │                     simpan sesi (localStorage/sessionStorage "proqpay-auth")
 │                     enterApp()
 └─ (Log Out, dari modal Profil) → authClear() → reload → tampil login lagi
```

Kredensial demo: `EMP-2023-0187` / `proqpay`. Sesi disimpan dengan pilihan
*remember me*: centang → `localStorage` (tahan reload), tidak → `sessionStorage`.

## 8. Arsitektur Target (Setelah Backend Terhubung)

```
Browser (Perchance iframe)
  └─ index.html (UI + renderer) ──fetch──▶ API Backend (REST/JSON)
                                            ├─ Auth (JWT): t_session
                                            ├─ Query layer (SQL_BIND)
                                            └─ Database (lihat 02-database-schema.md)
```

Satu-satunya perubahan yang diperlukan di frontend:
1. Isi `SESSION` dari hasil login (`authLogin` mode backend mengisi otomatis).
2. Set `SQL_LIVE = true`.
3. Implementasikan endpoint `POST /api/login` (lihat `03-api-integration.md`)
   dan `GET /portal/init` (format respons = bentuk `CONFIG` di atas, plus
   `{ewa:{rules,emp,history,app}}`).
4. (Opsional) Arahkan aksi tulis (submit/cancel EWA) ke endpoint POST.

Detail lengkap: **`03-api-integration.md`**.
