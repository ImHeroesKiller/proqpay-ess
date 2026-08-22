# ProQPay ESS Portal — Panduan Integrasi API Backend

Panduan ini menjelaskan cara menghubungkan aplikasi ke **query SQL** melalui
API backend. Saat ini frontend berjalan dengan data demo (`SQL_LIVE = false`).

---

## 1. Konsep

Frontend membaca seluruh datanya dari satu objek `CONFIG` (plus `EWA`).
Backend bertugas menerjemahkan query pada manifest `SQL_BIND`
(`index.html`) menjadi JSON dengan **bentuk yang sama persis** dengan objek
`CONFIG`. Dengan cara ini renderer **tidak perlu diubah sama sekali** ketika
backend terhubung.

```
Endpoint GET /api/portal/init
  1. Verifikasi token login (JWT) → dapatkan emp_id & company_id.
  2. Jalankan query-query pada SQL_BIND (satu per satu atau dengan join).
  3. Susun JSON sesuai bentuk CONFIG.
  4. Kembalikan ke frontend.
```

## 1b. Kontrak Login `POST /api/portal/login`

Disebut pertama kali oleh `authLogin()` di frontend. Berhasil → server
menerbitkan token sesi; frontend menyimpannya di `SESSION` dan di
`localStorage/sessionStorage` (kunci `proqpay-auth`) untuk muatan `/portal/init`.

**Request**
```http
POST /api/portal/login
Content-Type: application/json

{ "emp_id": "EMP-2023-0187", "password": "proqpay" }
```

**Proses server**
1. Ambil `pass_hash` via `SQL_BIND.login`
   (`SELECT … FROM m_employee WHERE emp_id = :empId AND active = 1`).
2. Hash kata sandi yang dikirim → bandingkan (compare waktu konstan).
3. Catat ke `t_login_attempt` (sukses/gagal + IP) untuk rate-limit.
4. Gagal ≥5× dalam 10 menit → kunci sementara, respons **429**.
5. Sukses → buat sesi `INSERT INTO t_session`, update `last_login_at`.

**Respons 200**
```jsonc
{
  "token": "…",              // dipakai header Authorization berikutnya
  "emp_id": "EMP-2023-0187",
  "company_id": "MAJU01",
  "emp_name": "Andi Pratama",
  "lang": "id",
  "theme": "dark"
}
```

**Respons error**
| Kode | Arti |
|---|---|
| 401 | Employee ID atau password salah |
| 429 | Terlalu banyak percobaan (rate-limit) |
| 403 | Akun nonaktif (`active = 0`) |

> Frontend mode demo memvalidasi secara lokal (SHA-256) dengan kredensial
> `EMP-2023-0187` / `proqpay`; pada mode `SQL_LIVE`, validasi sepenuhnya
> dilakukan server dan frontend hanya meneruskan kredensial.

## 2. Kontrak Respons `GET /portal/init`

Header: `Authorization: Bearer <token>`
Identitas karyawan diambil dari token, bukan dari query string.

```jsonc
{
  "config": {
    "employee": {
      "name": "Andi Pratama",
      "company": "PT Maju Jaya Teknologi",
      "role": "Staff Finance",
      "email": "andi.pratama@majujaya.co.id",
      "phone": "+62 812-3456-7890",
      "empId": "EMP-2023-0187",
      "bank": "BCA •••• 4821"            // sudah dimask di server
    },
    "company": {
      "name": "PT Maju Jaya Teknologi",
      "tagline": "Payroll & HR Digital",
      "address": "…",
      "contact": "…",
      "legal": "PT Fintek Maju Bersama"
    },
    "payroll": {
      "period": "Agustus 2026",
      "ref": "PYRL-0826-00421",
      "stage": 2,                        // 1..4
      "payday": "Tuesday, 25 Aug 2026",  // string siap tampil
      "paydayShort": "25 Aug"
    },
    "stages": [
      { "title": "Awaiting Payroll Data", "desc": "…", "meta": "Waiting",
        "note": "…", "eta": "Est. before payday" },
      // … total 4 item, sesuai m_payroll_stage
    ],
    "payslips": [
      { "period": "Agustus 2026", "status": "processing",
        "rows": [ ["Basic salary", 7500000], ["BPJS Health", -190000], … ] }
      // … menurun menurut periode
    ],
    "ads": [ { "tag": "Advance Salary", "title": "…", "desc": "…",
               "cta": "Request Advance", "bg": "linear-gradient(…)" } ],
    "notifications": [ { "title": "…", "s": "…", "type": "a", "unread": true } ]
  },
  "ewa": {
    "rules": { "feeRate": 0.03, "minFee": 50000, "minFeeAmount": 1750000,
               "maxTenorMonths": 1, "maxPercent": 0.3, "minDaysWorked": 10 },
    "emp": { "daysWorked": 12, "tenureMonths": 36 },
    "app": { "ref": "EWA-2026-0392", "amount": 1000000, "fee": 50000,
             "method": "auto", "inst": 1, "date": "12 Aug 2026",
             "status": "processing" },     // null bila tidak ada pengajuan aktif
    "history": [ { "ref": "EWA-2026-0392", "date": "12 Aug 2026",
                   "amount": 750000, "status": "lunas" } ]
  }
}
```

Aturan wajib:
- `payslips[].rows[][1]` — **positif** = penghasilan, **negatif** = potongan.
- `payroll.stage` berupa angka 1..4 (kolom `stage_id`).
- `ads` berupa **array** (frontend memakai `CONFIG.ads[0]`).
- `notifications[].type` = `"a"` (advance) atau `"g"` (gaji).
- `ewa.app.status` = `"processing"` | `"approved"`.

## 3. Menghidupkan Frontend

1. Implementasikan `POST /api/portal/login` di backend (§1b) dan
   `GET /portal/init` (§2).
2. Set `var SQL_LIVE = true;` (letakkan setelah definisi `loadFromSQL`).
3. Login page otomatis aktif: `authLogin()` akan memanggil `/api/login`,
   mengisi `SESSION`, menyimpan sesi, lalu memuat data.

Saat `SQL_LIVE = true`, alur boot menjadi:
```
boot() → initAuth() → authRestore()
  ├─ ada sesi → enterApp() → loadFromSQL() → success? → init()
  │                                        └─ gagal → init() (fallback demo)
  └─ tanpa sesi → openLogin()
        └─ pengguna login → authLogin() → simpan sesi → loadFromSQL() → init()
```

> `SESSION.apiBase` dan `SESSION.authToken` diisi otomatis oleh `authLogin()`
> dari respons login; tidak perlu di-hardcode di `SESSION`.

## 4. Endpoint Aksi (Write) — Opsional tapi Disarankan

Frontend saat ini mengubah status advance **secara lokal** (simulasi:
`ewaDemoApprove`, `ewaDemoLunas`, `ewaCancel`, `ewaSubmit`). Setelah backend
siap, arahkan ke endpoint berikut:

| Aksi | Endpoint | Badan permintaan | Status SQL |
|---|---|---|---|
| Ajukan advance | `POST /api/advance` | `{emp_id, amount, method, inst}` | insert `t_advance` (status `processing`) |
| Batalkan | `POST /api/advance/cancel` | `{ref_no}` | update → `cancelled` |
| Approve | `POST /api/advance/approve` | `{ref_no}` | update → `approved` |
| Tandai lunas | `POST /api/advance/repaid` | `{ref_no}` | update → `repaid` |

Titik kode yang diubah: di dalam `ewaSubmit()`, `ewaCancel()`,
`ewaDemoApprove()`, dan `ewaDemoLunas()` — ganti manipulasi objek lokal dengan
`fetch` ke endpoint, lalu perbarui `EWA.app`/`EWA.history` dari respons.

## 5. Keamanan

- **Jangan pernah** menaruh token, password, atau kunci API di kode frontend
  (kode ini publik — siapa pun bisa melihat sumbernya).
- Kata sandi **tidak pernah** disimpan sebagai teks biasa — hanya hash
  SHA-256 di `m_employee.pass_hash`; perbandingan dilakukan di server.
- Rate-limit percobaan login via `t_login_attempt` (mis. 5× gagal / 10 menit
  → HTTP 429).
- Token dikirim lewat header `Authorization` dan hanya dipegang `SESSION` saat
  runtime (jangan di-hardcode).
- Validasi otorisasi **selalu di sisi server**: query wajib difilter dengan
  `emp_id`/`company_id` yang berasal dari token, bukan dari parameter klien.
- Nomor rekening dimask di server (`v_employee.bank_acc_no`), bukan di klien.

## 6. Checklist Peluncuran

- [ ] Skema DB dibuat (lihat `02-database-schema.md`).
- [ ] Endpoint `POST /api/portal/login` (§1b) diuji (401/429/403 benar).
- [ ] Endpoint `/portal/init` mengembalikan bentuk JSON di atas (diuji dengan
      Postman/curl).
- [ ] `SQL_LIVE = true`; login page memuat data asli setelah masuk.
- [ ] Endpoint write advance (ajukan/batalkan/approve/repaid) tersedia.
- [ ] `$meta.description` di `main.pjs` diperbarui bila perlu.
- [ ] Uji: login/logout, tracker, slip (modal + cetak/PDF), riwayat, EWA,
      notifikasi, profil.
