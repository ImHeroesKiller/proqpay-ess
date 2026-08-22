# Changelog — ProQPay ESS

Repo: [ImHeroesKiller/proqpay-ess](https://github.com/ImHeroesKiller/proqpay-ess)  
Kode **proqpay-lite tidak diubah**. ESS hanya **membaca** D1 Lite.

---

## Snapshot produksi (2026-08-22)

| Item | Nilai |
|---|---|
| URL | https://proqpay-ess.arywibowo.workers.dev/ |
| Worker | `proqpay-ess` |
| Akun Cloudflare | `arywibowo` (`1692da3e9a67ee5dbb1bba473cb9296a`) |
| D1 | `proqpay-lite-production` · `ac3f8b48-bd87-44bd-9286-f0e0bab6e39f` |
| Karyawan di D1 | 666 (cek `/api/health` tidak lagi menampilkan angka ini) |
| Organisasi | `ORG-OTSINDO` |
| Commit `main` | `e1056e0` |
| Stack | Next.js 16.3.2 · React 19 · Tailwind 4.3.3 · OpenNext Cloudflare 1.20.2 · Wrangler 4.125 |

### Binding & secret

| Nama | Jenis | Fungsi |
|---|---|---|
| `DB` | D1 | Baca payroll/karyawan Lite |
| `AI` | Workers AI | Label baris slip (bukan hitung uang) |
| `WORKERS_AI_MODEL` | var | `@cf/meta/llama-3.1-8b-instruct-fast` |
| `PORTAL_BOOTSTRAP_PIN` | secret | PIN bersama sementara (bukan password per orang) |
| `PORTAL_JWT_SECRET` | secret | HMAC cookie `proqpay_ess` |
| `DEFAULT_ORG_ID` | var | `ORG-OTSINDO` |

Cookie sesi: `proqpay_ess` (HttpOnly, Secure, SameSite=Lax, 12 jam jika “Ingat saya”).

### Data uji yang sudah diverifikasi

Login API ke D1 (bukan persona demo):

| Field | Isi D1 |
|---|---|
| Nama | ABDUL AZIZ |
| ID | `EMP-209200339` / NRK `209200339` |
| Perusahaan | PT QJOB SAKA GEMILANG |
| Jabatan | AGENT NOC PARTNERSHIP 1 |
| Bank | MANDIRI •••• 0580 |
| Periode | Agustus 2026 |
| Stage tracker | 1 (menunggu data / state submission) |
| Komponen slip | 12+ baris dari `employee_compensation.payroll_components` |

Contoh kunci JSON D1 → judul slip (setelah kamus IDA):

| Kunci D1 | Jenis | Judul UI |
|---|---|---|
| `basicSalary` | Penghasilan | Gaji pokok |
| `positionAllowance` | Penghasilan | Tunjangan jabatan |
| `transportAllowance` | Penghasilan | Tunjangan transport |
| `mealAllowance` | Penghasilan | Tunjangan makan |
| `phoneAllowance` | Penghasilan | Tunjangan pulsa |
| `overtime` | Penghasilan | Upah lembur |
| `otherAllowance` | Penghasilan | Tunjangan lain |
| `bpjsHealthDeduction` | Potongan | Iuran BPJS Kesehatan karyawan |
| `jhtDeduction` | Potongan | Iuran JHT karyawan |
| `pensionDeduction` | Potongan | Iuran JP karyawan |
| `taxDeduction` | Potongan | PPh 21 |
| `bpjsTk` / `bpjsHealth` | Iuran perusahaan | **Tidak** mengurangi gaji bersih |

Urutan tampil: **Penghasilan** → **Potongan** → **Gaji bersih**.

Persona Andi Pratama / `EMP-2023-0187` **tidak** dipakai di produksi.

---

## 2026-08-22 — Slip gaji Indonesia + urutan proper

Commit: `e1056e0`

- Istilah baris resmi Indonesia.
- Urutan: penghasilan dulu, lalu potongan (modal + cetak).
- Iuran pemberi kerja tidak masuk hitungan THP.
- Header cetak: Penghasilan, Potongan, Gaji bersih (THP).

## 2026-08-22 — Service worker

Commit: `8689232`

- Install/fetch SW tidak menggantung.
- Error konsol *message channel closed* umumnya dari **ekstensi Chrome**, bukan API portal.

## 2026-08-22 — Label slip (Workers AI / IDA)

Commit: `b63416d`

- Binding `AI` di Worker.
- Kamus kunci camelCase dulu; sisanya IDA (`llama-3.1-8b-instruct-fast`).
- Nominal **tidak** dikirim ke model. Gagal AI → title-case.

## 2026-08-22 — PWA

Commit: `433ab1e`

- `manifest.webmanifest`, ikon 192/512, Apple 180, favicon 32, `theme-color` `#0b1226`.
- SW cache hanya `/_next/static`, `/icons`, `/brand`.
- `/api/*` dan HTML aplikasi: network only.
- Offline: `public/offline.html` (tanpa data gaji).
- Lihat [PWA.md](./PWA.md).

## 2026-08-22 — Rapikan produksi

Commit: `4ee8e6d`

- Hapus dummy Andi, kotak demo, simulator tahap, advance palsu.
- Hapus `functions/` (Pages lama), `main.pjs`, duplikat `src/docs` / `src/brand`.
- Arsip Perchance: `legacy/`.

## 2026-08-22 — Hardening (tanpa Lite)

Commit: `0d471b7`

- Cookie HttpOnly; JWT tidak di JSON/localStorage.
- Rate limit 5 gagal / 10 menit per IP dan per Employee ID.
- `/api/health` → `{ "ok": true, "d1": "ok" }` (tanpa count karyawan).
- CSP, `X-Frame-Options: DENY`, nosniff, Referrer-Policy.
- CORS allowlist origin.
- `POST /api/portal/logout`.
- Empty state slip/notifikasi.

**Masih butuh Lite:** password per karyawan, audit login D1, EWA persist, notifikasi tabel.  
[LITE-INTEGRATION.md](./LITE-INTEGRATION.md).

## 2026-08-22 — Portal live + D1

Commit: `2d01f08`, `7158725`, `5189473`, `e08cc19`, `500aa47`

- Next.js di Cloudflare Workers (OpenNext). Build: `npx opennextjs-cloudflare build`.
- D1 `proqpay-lite-production` (baca saja).
- Login: `employees.id` atau `employee_code`.
- CSS Perchance (tanpa Tailwind Preflight).
- Perbaikan CI: `CloudflareEnv` kosong → tipe `AppEnv`.

Health yang diuji: `GET /api/health` → D1 ok.

## 2026-08-21 — Adapter D1 (fase 0)

- Mapping UI ← tabel Lite: [06-d1-mapping.md](./06-d1-mapping.md).
- ESS tidak menjalankan migrasi D1.

## 2026-08 — Generator Perchance (arsip)

- SPA `legacy/index.html`.
- Skema fiktif `m_employee` / `SQL_BIND` **bukan** skema Lite.
- UI acuan: https://perchance.org/proqpay-ess

---

## Endpoint ESS saat ini

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/health` | Ping D1 |
| POST | `/api/portal/login` | Cookie sesi; body `{ emp_id, password, remember }` |
| GET | `/api/portal/init` | `config` + `ewa` dari D1 (identitas dari cookie) |
| POST | `/api/portal/logout` | Hapus cookie |

Identitas query selalu `sub` JWT (`employees.id`), bukan `emp_id` dari klien.
