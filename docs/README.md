# ProQPay ESS — Dokumentasi

Portal karyawan. System of record: **proqpay-lite** (D1). ESS hanya membaca.

| Dokumen | Isi |
|---|---|
| [CHANGELOG.md](CHANGELOG.md) | Riwayat rilis ESS |
| [PWA.md](PWA.md) | Service worker, manifest, aturan cache |
| [LITE-INTEGRATION.md](LITE-INTEGRATION.md) | **Baca ini sebelum mengubah Lite** |
| [06-d1-mapping.md](06-d1-mapping.md) | Mapping tabel D1 → UI |
| [01-architecture.md](01-architecture.md) | Arsitektur (sebagian legacy Perchance) |
| [02-database-schema.md](02-database-schema.md) | Skema *tampilan* lama — **bukan** skema D1 Lite |
| [03-api-integration.md](03-api-integration.md) | Kontrak JSON `CONFIG` |
| [04-user-guide.md](04-user-guide.md) | Panduan pengguna |
| [05-customization.md](05-customization.md) | Tema / copy |

Skema `m_employee` di dokumen 02 **tidak** ada di Cloudflare. Pakai 06 + LITE-INTEGRATION.

Produksi: https://proqpay-ess.arywibowo.workers.dev/
