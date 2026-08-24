# ProQPay ESS

Portal Employee Self-Service. Data payroll berasal dari [proqpay-lite](https://github.com/ImHeroesKiller/proqpay-lite) (Cloudflare D1, baca saja).

Produksi: https://proqpay-ess.arywibowo.workers.dev/

## Stack

Next.js 16 · React 19 · Tailwind CSS 4 · Cloudflare Workers (OpenNext)

## Pengembangan

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

API D1 membutuhkan Worker:

```bash
npm run preview
```

## Deploy

| Field | Value |
|---|---|
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx wrangler deploy` |

Secret: `PORTAL_JWT_SECRET`, `EMPLOYEE_PORTAL_KEY`. Variable: `LITE_API_BASE`.  
Login karyawan diverifikasi oleh Lite (`POST /api/employee/login`). Jangan menjalankan migrasi D1 dari repo ini.

PWA: dipasang ke layar utama; data gaji tidak di-cache. Lihat `docs/PWA.md`.

Dokumentasi: `docs/README.md` · Integrasi Lite: `docs/LITE-INTEGRATION.md`
