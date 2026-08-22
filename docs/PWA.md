# PWA ProQPay ESS

Portal dapat dipasang ke layar utama (standalone). Data gaji **tidak** di-cache di perangkat.

## Perilaku

| Sumber | Strategi |
|---|---|
| `/api/*` | Network only — service worker tidak mencegat |
| Navigasi HTML | Network only; offline → `/offline.html` |
| `/_next/static/*`, `/icons/*`, `/brand/*` | Cache-first aset publik |
| Cookie sesi | HttpOnly, tidak masuk Cache Storage |

Tidak ada Web Push, background sync, atau IndexedDB untuk payroll.

## File

- `public/manifest.webmanifest`
- `public/sw.js` (kirim `Cache-Control: no-cache`)
- `public/offline.html`
- `public/icons/*`

## Keamanan

- Scope SW: `/` same-origin saja.
- Request dengan header `Authorization` diabaikan.
- CSP: `worker-src 'self'`, `manifest-src 'self'`.
- Pasang hanya lewat HTTPS (atau localhost).
