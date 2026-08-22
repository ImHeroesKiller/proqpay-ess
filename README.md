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

Secret: `PORTAL_BOOTSTRAP_PIN`, `PORTAL_JWT_SECRET`.  
Jangan menjalankan migrasi D1 dari repo ini.

Dokumentasi: `docs/README.md` · Integrasi Lite: `docs/LITE-INTEGRATION.md`
