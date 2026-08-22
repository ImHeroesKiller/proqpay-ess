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
| Cloudflare Access | Jangan sama dengan ops | Access ops ≠ portal karyawan |

Karyawan **bukan** baris `app_users` (SUPER_ADMIN / PAYROLL_* / CLIENT_USER).

---

## 2. Auth yang harus diganti di Lite

ESS memakai satu secret `PORTAL_BOOTSTRAP_PIN` untuk semua karyawan karena **tidak ada** `pass_hash` di `employees`.

Yang Lite perlu sediakan (tanpa ESS menebak skema):

1. Hash kata sandi per karyawan (kolom baru di `employees` **atau** tabel `employee_credentials`).
2. Alur set password pertama / undangan (karyawan import tidak punya password).
3. Endpoint kanonik, disarankan di Lite:
   - `POST /api/portal/login` **atau** ESS memanggil `POST https://<lite>/api/employee/login`
4. Rate limit + lockout server-side (ganti Cache API ESS).
5. `t_login_attempt` / audit — ESS sengaja **tidak** INSERT ke D1.

Sampai itu ada: ESS tetap PIN bersama. Jangan menyalin PIN ke repo Lite.

JWT ESS klaim:

```json
{
  "sub": "<employees.id NRK>",
  "emp_code": "<employee_code>",
  "client_id": "<clients.id>",
  "org_id": "<organizations.id>",
  "role": "EMPLOYEE",
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
| Komponen slip | `employee_compensation.payroll_components` JSON + gross/deduction/net |
| Periode | `payroll_submissions.period` (`YYYY-MM`) |
| Stage 1–4 | `payroll_submissions.state` + PI + `reconciliations` |
| Ref / payday | `payment_instructions.document_no`, `execution_date` |
| Slip periode lain | `payment_instruction_lines.amount` |

Mapping stage (ESS):

| `payroll_submissions.state` | Stage |
|---|---|
| `DRAFT`, `AI_VALIDATING`, `EXCEPTION_REVIEW` | 1 |
| `PROCESSOR_REVIEW`, `CONTROLLER_REVIEW`, `PAYMENT_INSTRUCTION_READY` | 2 |
| `PAYMENT_APPROVAL_PENDING`, `APPROVED_FOR_PAYMENT`, `DISBURSEMENT_PROCESSING` | 3 |
| `PROOF_UPLOADED`, `RECONCILIATION`, `COMPLETED` | 4 |

Jika Lite menambah state, **update mapping di ESS** (`src/lib/d1-shared.ts` `STAGE_MAP`) atau pindahkan mapping ke API Lite agar ESS tidak perlu di-deploy setiap perubahan workflow.

`GET /api/health` ESS: ping `SELECT 1` saja. Jangan andalkan count karyawan.

---

## 4. Yang ESS **tidak** baca / belum ada di Lite

| Fitur UI | Status | Integrasi Lite |
|---|---|---|
| Notifikasi | Diturunkan dari submission terakhir | Tabel notifikasi per `employee_id` |
| Banner iklan | Hardcode | Opsional `m_promo` / config klien |
| EWA / Advance | Wizard lokal, **tidak** persist | Tabel pengajuan + rules + plafond server + approve di ops/IDA |
| Profil lengkap (KTP, NPWP) | Tidak dikirim ke klien | Jangan expose ke portal kecuali perlu |
| Password reset | Toast “hubungi HR” | Token reset di Lite + email |

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

- [ ] Kredensial per karyawan (hash, invite, reset).
- [ ] Jangan reuse `app_users` / `app_sessions` untuk portal.
- [ ] Endpoint employee login + init (bentuk JSON sama dengan `PortalPayload` di `src/lib/types.ts`).
- [ ] Filter data **hanya** `employee_id` dari sesi, abaikan `emp_id` di query string.
- [ ] Mask rekening di server.
- [ ] Access Cloudflare: portal di luar Access ops.
- [ ] EWA: hitung plafond di server; approve/lunas di dashboard Lite/IDA (LLM tidak menghitung uang).
- [ ] Audit login/advance tanpa memblokir payroll.
- [ ] ESS hapus `PORTAL_BOOTSTRAP_PIN` setelah cutover.

Bentuk JSON `PortalPayload` (jangan dipecah tanpa versi): lihat `src/lib/types.ts` dan `docs/03-api-integration.md`.

---

## 7. Secret & binding ESS (referensi ops)

| Nama | Tempat | Peran |
|---|---|---|
| `DB` | wrangler D1 | Baca `proqpay-lite-production` |
| `PORTAL_BOOTSTRAP_PIN` | wrangler secret | PIN bersama (sementara) |
| `PORTAL_JWT_SECRET` | wrangler secret | HMAC cookie sesi |
| `DEFAULT_ORG_ID` | vars | `ORG-OTSINDO` |

Cookie: `proqpay_ess`. Rotasi `PORTAL_JWT_SECRET` memaksa login ulang semua karyawan.
