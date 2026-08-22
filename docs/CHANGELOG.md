# Changelog — ProQPay ESS

Format: perubahan terbaru di atas. Repo: [ImHeroesKiller/proqpay-ess](https://github.com/ImHeroesKiller/proqpay-ess).  
**Tidak mengubah kode proqpay-lite.**

## 2026-08-22 — Hardening portal (tanpa Lite)

### Keamanan
- Login: cookie `proqpay_ess` HttpOnly + Secure + SameSite=Lax. JWT **tidak** dikembalikan di JSON dan tidak disimpan di `localStorage`.
- Rate limit gagal login: 5× / 10 menit per IP dan per Employee ID (Cache API Worker, tanpa tabel Lite).
- `/api/health` hanya `{ ok, d1 }` — tidak lagi menampilkan jumlah karyawan.
- Header: CSP, `X-Frame-Options: DENY`, nosniff, Referrer-Policy, Permissions-Policy.
- CORS origin allowlist (bukan `*`).
- Pesan error generik (`Service unavailable` / kredensial salah) tanpa stack.

### UX
- Form login tidak menampilkan NRK produksi.
- Simulator tahap payroll hanya di localhost.
- Empty state jika belum ada slip di D1.
- Logout memanggil `POST /api/portal/logout` (hapus cookie).

### Yang **belum** (butuh Lite)
- Password per karyawan (masih `PORTAL_BOOTSTRAP_PIN`).
- Tabel `t_login_attempt` / `t_session` di D1.
- Advance Salary (EWA) persist ke server.
- Notifikasi dari tabel Lite.

Lihat [LITE-INTEGRATION.md](./LITE-INTEGRATION.md).

## 2026-08-22 — Portal live di Cloudflare Workers

- Next.js 16 + Tailwind 4 + OpenNext Worker.
- Binding D1 `proqpay-lite-production` (baca saja).
- Secret: `PORTAL_BOOTSTRAP_PIN`, `PORTAL_JWT_SECRET`.
- Login produksi memakai `employees.id` / `employee_code`.
- UI diselaraskan ke generator Perchance (CSS asli, tanpa Tailwind Preflight).
- Demo Andi Pratama (`EMP-2023-0187`) hanya localhost.

## 2026-08-21 — Fase 0 adapter D1 (repo lokal)

- Pages Functions baca D1 Lite.
- Mapping `CONFIG` ESS ← tabel Lite (`06-d1-mapping.md`).
- Tidak ada migrasi dari repo ESS.

## 2026-08 — Generator Perchance (legacy)

- SPA `index.html` + data demo.
- Kontrak `SQL_BIND` / skema fiktif `m_employee` (bukan skema Lite).
- Sumber UI: https://perchance.org/proqpay-ess — salinan di `legacy/`.
