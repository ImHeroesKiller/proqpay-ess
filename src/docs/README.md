# ProQPay ESS Portal — Dokumentasi

Indeks dokumentasi. Baca sesuai kebutuhan Anda.

| Dokumen | Isi | Untuk siapa |
|---|---|---|
| [01-architecture.md](01-architecture.md) | Arsitektur aplikasi, struktur file, modul kode, alur data, pipeline PDF | Developer |
| [02-database-schema.md](02-database-schema.md) | Skema tabel SQL + pemetaan lengkap `CONFIG`/`SQL_BIND` → query | Developer, DBA |
| [03-api-integration.md](03-api-integration.md) | Cara menghubungkan backend SQL/API, kontrak JSON, endpoint write, keamanan, checklist | Developer backend |
| [04-user-guide.md](04-user-guide.md) | Panduan pemakaian aplikasi untuk pengguna akhir | Pengguna, admin |
| [05-customization.md](05-customization.md) | Kustomisasi data demo, warna, teks, ikon, aturan EWA, slip cetak | Developer, admin |
| [06-d1-mapping.md](06-d1-mapping.md) | Binding D1 Cloudflare yang sama dengan Lite, mapping tabel, endpoint portal | Developer |

---

## Ringkas

- **Aplikasi**: `index.html` (SPA, semua logika di satu IIFE) + `main.pjs`
  (hanya `$meta`).
- **Login**: `#loginView`. Demo lokal: `EMP-2023-0187` / `proqpay`. Mode live:
  `POST /api/portal/login` (Pages Function) membaca `employees` di D1 Lite +
  `PORTAL_BOOTSTRAP_PIN`.
- **Data**: `CONFIG` diisi `GET /api/portal/init` dari D1 yang sama dengan
  Lite (`06-d1-mapping.md`). ESS tidak menulis database.
- **Aturan bahasa**: menu/tombol/judul/subjudul kartu = Inggris; redaksional =
  Indonesia.
- **Status**: demo berjalan penuh (login, tracker, slip + PDF, riwayat, Advance
  Salary, notifikasi, profil, bantuan).

Mulai dari mana:

1. Pelajari alur data → `01-architecture.md`.
2. Siapkan database → `02-database-schema.md`.
3. Hubungkan backend → `03-api-integration.md`.
4. Uji pemakaian → `04-user-guide.md`.
