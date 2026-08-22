# ESS ↔ Cloudflare D1 (proqpay-lite)

ESS **tidak** punya database sendiri. Pages Functions di repo ini membaca **D1 yang sama** dengan [proqpay-lite](https://github.com/ImHeroesKiller/proqpay-lite) (`proqpay-lite-production`). Repo Lite **tidak diubah**.

```
proqpay-lite  ──write──▶  D1 (Cloudflare)
proqpay-ess   ──read───▶  D1 (binding DB, tanpa migrations_dir)
```

Sumber skema: `migrations/0001_cloudflare_native.sql` di Lite.

## Identitas karyawan

Login ESS memakai `employees.id` (NRK) **atau** `employees.employee_code` (mis. `EMP-…`).

Di D1 **tidak ada** `pass_hash` karyawan (`app_users` hanya untuk ops). Fase 0 memakai secret `PORTAL_BOOTSTRAP_PIN` di worker ESS (bukan di Lite). Password per-karyawan menunggu perubahan Lite nanti.

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
| `payroll.stage` 1..4 | lihat tabel stage |
| `payroll.payday` | `payment_instructions.execution_date` |
| `payslips[].rows` | `employee_compensation.payroll_components` JSON; fallback gross/deduction/net; periode lain dari `payment_instruction_lines.amount` |
| `notifications` | diturunkan dari submission terbaru (bukan tabel notifikasi) |
| `ewa.*` | **belum ada tabel**; worker mengirim rules default, `app=null`, `history=[]` |

## Stage tracker

| `payroll_submissions.state` | Stage ESS |
|---|---|
| `DRAFT`, `AI_VALIDATING`, `EXCEPTION_REVIEW` | 1 Awaiting data |
| `PROCESSOR_REVIEW`, `CONTROLLER_REVIEW`, `PAYMENT_INSTRUCTION_READY` | 2 Processing |
| `PAYMENT_APPROVAL_PENDING`, `APPROVED_FOR_PAYMENT`, `DISBURSEMENT_PROCESSING` | 3 Awaiting payout |
| `PROOF_UPLOADED`, `RECONCILIATION`, `COMPLETED` | 4 Paid |

Ditambah: rekonsiliasi match / PI completed → stage 4.

## Endpoint ESS (bukan API ops Lite)

| Method | Path | Fungsi |
|---|---|---|
| `POST` | `/api/portal/login` | Cari karyawan di D1 + PIN bootstrap → JWT |
| `GET` | `/api/portal/init` | Susun `config` + `ewa` dari D1 (hanya `sub` token) |
| `GET` | `/api/health` | Cek binding D1 |

Worker **hanya SELECT**. Tidak ada migrasi, INSERT, atau UPDATE ke D1.

## Binding Cloudflare

1. Salin `database_id` D1 Lite ke `wrangler.toml` (ganti `REPLACE_WITH_D1_DATABASE_ID`).
2. Dashboard Pages project `proqpay-ess` → Settings → Bindings → D1 `DB` = `proqpay-lite-production`.
3. Secrets: `PORTAL_BOOTSTRAP_PIN`, `PORTAL_JWT_SECRET`.
4. Lokal: salin `.dev.vars.example` → `.dev.vars`, lalu `npx wrangler pages dev .`

Jangan jalankan `d1 migrations apply` dari repo ESS.
