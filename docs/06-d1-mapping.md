# ESS ↔ Cloudflare D1 (proqpay-lite)

ESS **tidak** punya database sendiri. Pages Functions di repo ini membaca **D1 yang sama** dengan [proqpay-lite](https://github.com/ImHeroesKiller/proqpay-lite) (`proqpay-lite-production`). Repo Lite **tidak diubah**.

```
proqpay-lite  ──write──▶  D1 (Cloudflare)
proqpay-ess   ──read───▶  D1 (binding DB, tanpa migrations_dir)
```

Sumber skema: `migrations/0001_cloudflare_native.sql` di Lite.

## Identitas karyawan

Login ESS memakai `employees.id` (NRK) **atau** `employees.employee_code` (mis. `EMP-…`).

Password per karyawan ada di Lite (`employee_credentials`). ESS mem-proxy login ke
`POST {LITE_API_BASE}/api/employee/login`. PIN bersama **tidak dipakai**.

## Mapping CONFIG

| CONFIG ESS | D1 Lite |
|---|---|
| `employee.name` | `employees.name` |
| `employee.empId` | `employee_code` atau `id` |
| `employee.company` | `clients.name` |
| `employee.role` | `employee_assignments.position` (`is_current=1`) |
| `employee.email/phone` | `employees.email`, `mobile`/`phone` |
| `employee.bank` | `employee_bank_accounts` (mask last-4 di worker) |
| `company.*` | `clients` + `organizations` |
| `payroll.period` | `payroll_submissions.period` (`YYYY-MM` → `Agustus 2026`) |
| `payroll.ref` | `payment_instructions.document_no` atau `submissions.id` |
| `payroll.stage` 1..5 | lihat tabel stage (mengikuti Lite) |
| `payroll.payday` | `payment_instructions.execution_date` |
| `payslips[].rows` | `payroll_run_lines.components` JSON (bukan `employee_compensation` yang tertimpa import) |
| `notifications` | diturunkan dari submission terbaru (bukan tabel notifikasi) |
| `ewa.*` | `ewa_policies` / `ewa_requests` (Lite migrasi 0005) |

## Stage tracker

Mengikuti 5 tahap bisnis Lite (`src/lib/d1-shared.ts`):

| `payroll_submissions.state` | Stage ESS |
|---|---|
| `DRAFT`, `EXCEPTION_*`, `CLIENT_ACTION_REQUIRED`, `REVISION_REQUIRED` | 1 Data Readiness |
| `AI_VALIDATING`, `PROCESSOR_REVIEW`, `VALIDATED` | 2 Payroll Preparation |
| `CONTROLLER_REVIEW`, `DATA_APPROVED`, `PAYROLL_FINALIZED` | 3 Review & Approval |
| `PAYMENT_INSTRUCTION_READY` … `PROOF_UPLOADED` | 4 Payment |
| `RECONCILIATION`, `COMPLETED` | 5 Reconciliation & Close |

PI PAID / rekon MATCH → stage 5.

## Endpoint ESS (bukan API ops Lite)

| Method | Path | Fungsi |
|---|---|---|
| `POST` | `/api/portal/login` | Proxy ke Lite `/api/employee/login` → JWT |
| `GET` | `/api/portal/init` | Proxy Lite `GET /api/employee/init`; fallback D1 jika Lite unreachable |
| `POST` | `/api/portal/ewa` | Proxy ke Lite `/api/employee/ewa` |
| `GET` | `/api/health` | Cek binding D1 |

Worker **hanya SELECT**. Tidak ada migrasi, INSERT, atau UPDATE ke D1.

## Binding Cloudflare

1. Salin `database_id` D1 Lite ke `wrangler.toml` (ganti `REPLACE_WITH_D1_DATABASE_ID`).
2. Dashboard Pages project `proqpay-ess` → Settings → Bindings → D1 `DB` = `proqpay-lite-production`.
3. Secrets: `PORTAL_JWT_SECRET`, opsional `EMPLOYEE_PORTAL_KEY`.
4. Lokal: salin `.dev.vars.example` → `.dev.vars`, lalu `npx wrangler pages dev .`

Jangan jalankan `d1 migrations apply` dari repo ESS.
