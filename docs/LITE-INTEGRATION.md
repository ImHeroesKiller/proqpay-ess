# Catatan integrasi ESS → ProQPay Lite

Dokumen ini untuk developer **proqpay-lite** nanti. ESS saat ini **hanya SELECT** ke D1 yang sama. Jangan menjalankan migrasi dari repo ESS.

Produksi ESS: `https://proqpay-ess.arywibowo.workers.dev/`  
Lite SoR: D1 `proqpay-lite-production` (`ac3f8b48-bd87-44bd-9286-f0e0bab6e39f`).

---

## 1. Invariant yang harus dijaga

| Aturan | Sekarang | Nanti di Lite |
|---|---|---|
| System of record payroll | Lite D1 | Tetap Lite |
| ESS menulis D1 | Tidak | Hanya lewat API Lite yang disetujui |
| Role portal | JWT `role: EMPLOYEE` (bukan `app_users`) | Role/tabel karyawan terpisah dari ops |
| Session ops Lite | Cookie `app_sessions` | Jangan dipakai portal karyawan |
| Session ESS | Cookie `proqpay_ess` | Boleh diganti `t_employee_session` di Lite |
| Cloudflare Access | Jangan sama dengan ops | Access ops ≠ portal karyawan (ESS tanpa Access; `/api/employee*` bypass) |

Karyawan **bukan** baris `app_users` (SUPER_ADMIN / PAYROLL_* / CLIENT_USER).

---

## 2. Auth — Lite adalah verifier (Fase 1)

ESS **tidak** membandingkan password ke PIN bersama. Worker ESS memanggil Lite:

`POST {LITE_API_BASE}/api/employee/login` dengan header `Origin` + opsional `X-Portal-Key`.

- Cookie portal tetap `proqpay_ess` (HMAC JWT). Klaim tambahan: `lite` (token sesi Lite) dan `must_change`.
- Ganti password: `POST /api/portal/password` → Lite `/api/employee/password`.
- PIN bersama **dihapus**. Login hanya lewat kredensial Lite.

JWT ESS klaim:

```json
{
  "sub": "<employees.id NRK>",
  "emp_code": "<employee_code>",
  "client_id": "<clients.id>",
  "org_id": "<organizations.id>",
  "role": "EMPLOYEE",
  "lite": "<token sesi Lite, HttpOnly>",
  "must_change": 1,
  "exp": "<12 jam>"
}
```

Saat pindah ke Lite: terbitkan token/cookie dari Lite; ESS hanya menyimpan cookie atau memanggil Lite same-site.

---

## 3. Kontrak baca yang ESS sudah pakai

`GET /api/portal/init` (cookie atau `Authorization: Bearer`) menyusun JSON UI. Sumber D1:

| UI | Tabel / kolom Lite |
|---|---|
| Nama, email, telepon, status | `employees` |
| Kode tampilan | `employee_code` atau `id` |
| Perusahaan | `clients.name` (+ `organizations`) |
| Jabatan | `employee_assignments.position` (`is_current=1`) |
| Bank (mask last-4) | `employee_bank_accounts` |
| Masa kerja | `employee_contracts.join_date` / `accepted_date` |
| Komponen slip | `payroll_run_lines.components` JSON + gross/deduction/net (bukan `employee_compensation`) |
| Periode | `payroll_submissions.period` (`YYYY-MM`) |
| Stage 1–5 | `payroll_submissions.state` + PI + `reconciliations` |
| Ref / payday | `payment_instructions.document_no`, `execution_date` |
| Slip periode lain | `payroll_run_lines` historis karyawan itu (`included=1`) |

Mapping stage (ESS, mengikuti 5 tahap bisnis Lite):

| `payroll_submissions.state` | Stage |
|---|---|
| `DRAFT`, `EXCEPTION_*`, `CLIENT_ACTION_REQUIRED`, `REVISION_REQUIRED` | 1 Data Readiness |
| `AI_VALIDATING`, `PROCESSOR_REVIEW`, `VALIDATED` | 2 Payroll Preparation |
| `CONTROLLER_REVIEW`, `DATA_APPROVED`, `PAYROLL_FINALIZED` | 3 Review & Approval |
| `PAYMENT_INSTRUCTION_READY` … `PROOF_UPLOADED` | 4 Payment |
| `RECONCILIATION`, `COMPLETED` | 5 Reconciliation & Close |

Jika Lite menambah state, **update mapping di ESS** (`src/lib/d1-shared.ts` `STAGE_MAP`) atau pindahkan mapping ke API Lite agar ESS tidak perlu di-deploy setiap perubahan workflow.

`GET /api/health` ESS: ping `SELECT 1` saja. Jangan andalkan count karyawan.

---

## 4. Yang ESS **tidak** baca / belum ada di Lite

| Fitur UI | Status | Integrasi Lite |
|---|---|---|
| Notifikasi | Diturunkan dari submission terakhir | Tabel notifikasi per `employee_id` |
| Banner iklan | Hardcode | Opsional `m_promo` / config klien |
| EWA / Advance | Persist di Lite `ewa_requests` | Ops menyetujui di Lite → Advance Salary |
| Password reset | Toast “hubungi HR” | Reset di Lite Data Karyawan |

Jangan buat tabel EWA dari migrasi ESS.

---

## 5. Opsi arsitektur nanti (pilih satu)

**A. Tetap dua Worker, D1 sama (sekarang)**  
ESS terus SELECT. Lite menambah kolom/API. Risiko: dua kode query, drift mapping.

**B. Lite jadi satu-satunya HTTP API**  
ESS frontend memanggil `https://proqpay-lite…/api/employee/*`. ESS Worker hanya static/hosting. Lebih bersih; butuh CORS/cookie domain (mis. `ess.proqpay…` + `app.proqpay…`).

**C. Monorepo / package query bersama**  
Satu modul TypeScript dibagikan. Masih dua deploy.

Rekomendasi: **B** setelah Lite punya `EMPLOYEE` auth.

---

## 6. Checklist perubahan Lite (ketika dikerjakan)

- [x] Kredensial per karyawan (hash, invite, reset) — di Lite.
- [x] Jangan reuse `app_users` / `app_sessions` untuk portal.
- [x] Endpoint employee login (ESS mem-proxy). Init JSON kanonik di Lite `GET /api/employee/init`.
- [x] Filter data **hanya** `employee_id` dari sesi, abaikan `emp_id` di query string.
- [x] Mask rekening di server.
- [x] Access Cloudflare: portal di luar Access ops.
- [x] EWA: hitung plafond di server; approve/lunas di dashboard Lite (bukan LLM). Potongan menempel ke `payroll_run_lines` saat `FINALIZE_PAY_RUN_INPUT` / import `UPLOAD_FINAL`.
- [x] Audit login/advance tanpa memblokir payroll.
- [x] ESS hapus PIN bersama (kode + secret).

Bentuk JSON `PortalPayload` (jangan dipecah tanpa versi): lihat `src/lib/types.ts` dan `docs/03-api-integration.md`.

---

## 7. Secret & binding ESS (referensi ops)

| Nama | Tempat | Peran |
|---|---|---|
| `DB` | wrangler D1 | Baca `proqpay-lite-production` |
| `LITE_API_BASE` | vars | `https://proqpay-lite.pages.dev` |
| `EMPLOYEE_PORTAL_KEY` | wrangler secret | Header `X-Portal-Key` ke Lite |
| `PORTAL_JWT_SECRET` | wrangler secret | HMAC cookie sesi |
| `DEFAULT_ORG_ID` | vars | `ORG-OTSINDO` |

Cookie: `proqpay_ess`. Rotasi `PORTAL_JWT_SECRET` memaksa login ulang semua karyawan.

PWA ESS tidak menyimpan slip di Cache Storage / IndexedDB. Integrasi Lite nanti jangan mengandalkan offline payroll di klien.

### IDA / Workers AI (label slip)

ESS memakai binding `AI` (Cloudflare Workers AI) **hanya untuk menamai baris slip** (`basicSalary` → `Basic salary`). Nominal selalu dari D1. LLM gagal → kamus/title-case. Lite nanti boleh memindahkan kamus komponen resmi ke master data agar AI tidak diperlukan.
