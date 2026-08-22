# ProQPay ESS Portal — Skema Database & Pemetaan Query

Dokumen ini mendefinisikan skema tabel SQL yang akan menjadi sumber data
aplikasi. Nama tabel/kolom dipakai konsisten oleh manifest `SQL_BIND` di
`index.html` dan komentar `[tabel.kolom]` pada objek `CONFIG`.

Konvensi:
- `PK` = primary key, `FK` = foreign key, `UQ` = unique.
- Tipe kolom memakai gaya umum MySQL; sesuaikan dengan DBMS Anda.
- Awalan tabel: `m_` = master (statis), `t_` = transaksi, `v_` = view.

---

## 1. Tabel Master

### m_company — perusahaan/tenant

| Kolom | Tipe | Ket. |
|---|---|---|
| company_id | CHAR(10) | PK |
| company_name | VARCHAR(120) | |
| tagline | VARCHAR(120) | |
| address | TEXT | |
| contact | VARCHAR(200) | telp/email/web |
| legal_name | VARCHAR(120) | nama badan hukum (dipakai footer slip) |
| created_at | DATETIME | |

### m_employee — karyawan

| Kolom | Tipe | Ket. |
|---|---|---|
| emp_id | CHAR(12) | PK (mis. `EMP-2023-0187`) |
| company_id | CHAR(10) | FK → m_company |
| emp_name | VARCHAR(120) | |
| role_name | VARCHAR(80) | jabatan (untuk UI; tabel jabatan terpisah opsional) |
| email | VARCHAR(120) | |
| phone | VARCHAR(30) | |
| bank_name | VARCHAR(60) | mis. BCA |
| bank_acc_no | VARCHAR(30) | nomor rekening (dimask di UI) |
| hire_date | DATE | dipakai hitung `tenure_months` |
| pass_hash | CHAR(64) | hash SHA-256 kata sandi (lihat SQL_BIND.login) |
| active | TINYINT(1) | |
| last_login_at | DATETIME | |

### t_login_attempt — log percobaan login (rate-limit)

| Kolom | Tipe | Ket. |
|---|---|---|
| attempt_id | INT | PK auto |
| emp_id | CHAR(12) | FK → m_employee |
| ip_addr | VARCHAR(45) | IP/identitas klien |
| success | TINYINT(1) | 1 = berhasil |
| attempted_at | DATETIME | |

> Validasi login **wajib di sisi server**: bandingkan hash kata sandi terhadap
> `m_employee.pass_hash`, batasi percobaan gagal (mis. ≥5 dalam 10 menit →
> kunci sementara, respons HTTP 429), lalu terbitkan sesi (INSERT `t_session`).
> Frontend hanya mengirim `emp_id` + kata sandi — tidak pernah menyimpan hash.

### m_payroll_stage — master tahapan payroll

| Kolom | Tipe | Ket. |
|---|---|---|
| stage_id | TINYINT | PK (1..4) |
| sort_no | TINYINT | urutan |
| title_en | VARCHAR(60) | judul UI (Inggris) |
| title_id | VARCHAR(60) | cadangan (Indonesia) |
| desc_id | VARCHAR(160) | deskripsi UI (Indonesia) |
| meta | VARCHAR(20) | `Waiting` / `In progress` / `Completed` |
| note | TEXT | catatan ditampilkan di tracker |
| eta | VARCHAR(40) | label estimasi (mis. `Est. before payday`) |

Empat tahap baku: Awaiting Payroll Data → Processing → Awaiting Payout → Paid.

### m_promo — banner promosi

| Kolom | Tipe | Ket. |
|---|---|---|
| promo_id | INT | PK auto |
| company_id | CHAR(10) | FK |
| tag | VARCHAR(40) | mis. `Advance Salary` |
| title | VARCHAR(120) | |
| desc | TEXT | |
| cta | VARCHAR(60) | label tombol |
| bg | VARCHAR(200) | nilai CSS `linear-gradient(...)` |
| active | TINYINT(1) | |

### m_ewa_config — konfigurasi aturan Advance per tenant

| Kolom | Tipe | Ket. |
|---|---|---|
| company_id | CHAR(10) | PK/FK |
| fee_rate | DECIMAL(4,3) | mis. 0.030 |
| min_fee | INT | mis. 50000 |
| min_fee_amount | INT | batas bawah berlakunya min_fee, mis. 1750000 |
| max_tenor_months | TINYINT | mis. 1 |
| max_percent | DECIMAL(4,2) | mis. 0.30 |
| min_days_worked | TINYINT | mis. 10 |
| updated_at | DATETIME | |

---

## 2. Tabel Transaksi

### t_session — sesi login

| Kolom | Tipe | Ket. |
|---|---|---|
| session_id | CHAR(64) | PK (token) |
| emp_id | CHAR(12) | FK |
| company_id | CHAR(10) | FK |
| lang | CHAR(2) | `id`/`en` |
| theme | VARCHAR(10) | `dark` |
| login_at | DATETIME | |
| expires_at | DATETIME | |

### t_payroll_period — periode payroll

| Kolom | Tipe | Ket. |
|---|---|---|
| period | CHAR(12) | PK (mis. `Agustus 2026`) |
| company_id | CHAR(10) | PK/FK |
| payroll_ref | VARCHAR(20) | mis. `PYRL-0826-00421` |
| stage_id | TINYINT | FK → m_payroll_stage (1..4) |
| payday | DATE | tanggal gajian |
| payday_short | VARCHAR(10) | bentuk pendek untuk UI (mis. `25 Aug`) |
| opened_at | DATETIME | |

> Frontend menampilkan `stage_id` sebagai 1..4. Saat membuat respons JSON,
> kirimkan `stage` sebagai angka tersebut.

### t_payslip — header slip gaji

| Kolom | Tipe | Ket. |
|---|---|---|
| slip_id | INT | PK auto |
| emp_id | CHAR(12) | FK |
| company_id | CHAR(10) | FK |
| period | CHAR(12) | FK → t_payroll_period |
| status | ENUM('processing','paid') | |
| printed_at | DATETIME | |
| total_thp | INT | (boleh disimpan untuk audit) |

### t_payslip_detail — baris slip gaji

| Kolom | Tipe | Ket. |
|---|---|---|
| slip_id | INT | PK/FK → t_payslip |
| sort_no | TINYINT | urutan baris |
| label_en | VARCHAR(80) | label UI (Inggris), mis. `Basic salary` |
| amount | INT | **positif = penghasilan, negatif = potongan** |

Contoh kombinasi label: `Basic salary`, `Position allowance`, `Overtime pay`
(penghasilan); `BPJS Health`, `BPJS Employment`, `PPh 21` (potongan, negatif).

### t_advance — pengajuan Advance Salary

| Kolom | Tipe | Ket. |
|---|---|---|
| advance_id | INT | PK auto |
| ref_no | VARCHAR(20) | PK alternatif (mis. `EWA-2026-0392`) |
| emp_id | CHAR(12) | FK |
| company_id | CHAR(10) | FK |
| amount | INT | nominal advance |
| fee | INT | biaya layanan |
| method | ENUM('auto','manual') | cara pelunasan |
| installments | TINYINT | tenor (1 = lunas saat gajian) |
| status | ENUM('processing','approved','repaid','cancelled') | |
| requested_at | DATETIME | |
| approved_at | DATETIME | NULL |
| repaid_at | DATETIME | NULL |

### t_notification — notifikasi karyawan

| Kolom | Tipe | Ket. |
|---|---|---|
| notif_id | INT | PK auto |
| emp_id | CHAR(12) | FK |
| title | VARCHAR(160) | judul (Inggris, label) |
| body | VARCHAR(255) | isi (Indonesia) |
| type | ENUM('a','g') | `a`=advance, `g`=gaji |
| is_read | TINYINT(1) | |
| created_at | DATETIME | |

---

## 3. View

### v_employee — karyawan + perusahaan + bank (dimosk)

```sql
CREATE VIEW v_employee AS
SELECT e.emp_id,
       e.emp_name,
       c.company_name,
       e.role_name,
       e.email,
       e.phone,
       e.bank_name,
       CONCAT(LEFT(e.bank_acc_no, 3), '••••',
              RIGHT(e.bank_acc_no, 4)) AS bank_acc_no
FROM   m_employee e
JOIN   m_company  c ON c.company_id = e.company_id
WHERE  e.active = 1;
```

### v_ewa_eligibility — kelayakan advance per periode

```sql
CREATE VIEW v_ewa_eligibility AS
SELECT e.emp_id,
       pp.pay_period,
       -- hari hadir/masuk kerja terhitung di periode berjalan:
       COUNT(DISTINCT a.att_date)                   AS days_worked,
       TIMESTAMPDIFF(MONTH, e.hire_date, CURDATE()) AS tenure_months
FROM   m_employee e
JOIN   t_payroll_period pp ON pp.company_id = e.company_id
LEFT JOIN t_attendance a   ON a.emp_id = e.emp_id
                          AND a.att_date BETWEEN DATE_FORMAT(CURDATE(), '%Y-%m-01')
                                             AND CURDATE()
GROUP  BY e.emp_id, pp.pay_period;
```

> `t_attendance` dan `t_payroll_period.pay_period` pada contoh di atas
> menyesuaikan skema absensi yang sudah ada di sistem Anda.

---

## 4. Pemetaan Lengkap CONFIG ↔ SQL

Tabel pemetaan yang sama direpresentasikan dalam kode sebagai objek `SQL_BIND`.

| Data aplikasi | Query (ringkas) |
|---|---|
| `SESSION` (login) | `SELECT emp_id, company_id, emp_name, pass_hash, active FROM m_employee WHERE emp_id = :empId AND active = 1` — divalidasi server, lalu `INSERT INTO t_session (…)` + `INSERT INTO t_login_attempt (…)` |
| `SESSION` | `SELECT emp_id, company_id, lang, theme FROM t_session WHERE emp_id = :empId` |
| `CONFIG.employee` | `SELECT emp_name, company_name, role_name, email, phone, emp_id, bank_name, bank_acc_no FROM v_employee WHERE emp_id = :empId` |
| `CONFIG.company` | `SELECT company_name, tagline, address, contact, legal_name FROM m_company WHERE company_id = :companyId` |
| `CONFIG.payroll` | `SELECT pay_period, payroll_ref, stage_id, payday, payday_short FROM t_payroll_period WHERE company_id = :companyId AND pay_period = :payPeriod` |
| `CONFIG.stages` | `SELECT sort_no, title_id, title_en, desc_id, meta, note, eta FROM m_payroll_stage ORDER BY sort_no` |
| `CONFIG.payslips` | `SELECT period, status, slip_id FROM t_payslip WHERE emp_id = :empId ORDER BY period DESC` |
| `CONFIG.payslips[].rows` | `SELECT label_en, amount FROM t_payslip_detail WHERE slip_id = :slipId ORDER BY sort_no` |
| `CONFIG.ads` | `SELECT tag, title, desc, cta, bg FROM m_promo WHERE company_id = :companyId AND active = 1 LIMIT 1` |
| `CONFIG.notifications` | `SELECT title, body, type, is_read FROM t_notification WHERE emp_id = :empId ORDER BY created_at DESC` |
| `EWA.rules` | `SELECT fee_rate, min_fee, min_fee_amount, max_tenor_months, max_percent, min_days_worked FROM m_ewa_config WHERE company_id = :companyId` |
| `EWA.emp` | `SELECT days_worked, tenure_months FROM v_ewa_eligibility WHERE emp_id = :empId AND pay_period = :payPeriod` |
| `EWA.app` | `SELECT ref_no, amount, fee, status, requested_at, approved_at FROM t_advance WHERE emp_id = :empId AND status IN ('processing','approved') ORDER BY requested_at DESC LIMIT 1` |
| `EWA.history` | `SELECT ref_no, requested_at, amount, status FROM t_advance WHERE emp_id = :empId ORDER BY requested_at DESC` |
| Submit advance | `INSERT INTO t_advance (emp_id, ref_no, amount, fee, method, installments, status, requested_at) VALUES (:empId, :refNo, :amount, :fee, :method, :inst, 'processing', NOW())` |
| Batalkan advance | `UPDATE t_advance SET status = 'cancelled' WHERE ref_no = :refNo AND status = 'processing'` |
| Approve (simulasi server) | `UPDATE t_advance SET status = 'approved', approved_at = NOW() WHERE ref_no = :refNo` |
| Tandai lunas | `UPDATE t_advance SET status = 'repaid', repaid_at = NOW() WHERE ref_no = :refNo` |
