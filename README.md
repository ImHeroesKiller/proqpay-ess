# ProQPay ESS

Portal **Employee Self-Service** ProQPay. Companion dari [proqpay-lite](https://github.com/ImHeroesKiller/proqpay-lite): Lite menulis payroll ke Cloudflare D1, ESS hanya membaca.

- **Next.js 16** · **React 19** · **Tailwind CSS 4**
- Deploy ke **Cloudflare Workers** via `@opennextjs/cloudflare`
- UI & aset brand dipertahankan dari portal v2 (navy + oranye)

## Develop

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Buka http://localhost:3000 — login demo `EMP-2023-0187` / `proqpay`.

API D1 (`/api/portal/*`, `/api/health`) membutuhkan Worker runtime + binding D1:

```bash
npm run preview
```

## Deploy (Cloudflare Workers)

1. Isi `database_id` D1 Lite di `wrangler.jsonc` (database **yang sama** dengan Lite).
2. `npx wrangler secret put PORTAL_BOOTSTRAP_PIN`
3. `npx wrangler secret put PORTAL_JWT_SECRET`
4. `npm run deploy`

Jangan jalankan migrasi D1 dari repo ini.

## Mapping data

Lihat `docs/06-d1-mapping.md`.
