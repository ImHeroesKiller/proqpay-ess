# ProQPay ESS Portal — Panduan Pengguna

Selamat datang di **ProQPay** — portal *Employee Self-Service* (ESS) untuk
karyawan. Aplikasi ini berjalan di browser, bisa dibuka dari HP maupun
komputer.

> Catatan: aplikasi ini **demo**. Data yang tampil (gaji, slip, status payroll)
> adalah contoh. Saat terhubung ke backend, data akan otomatis mengikuti data
> perusahaan Anda.

---

## 0. Masuk (Login) & Keluar (Logout)

Aplikasi terbuka dengan **halaman masuk** terlebih dahulu.

**Masuk:**
1. Isi **Employee ID** (contoh: `EMP-2023-0187`) dan **Password**.
2. Centang **Ingat saya di perangkat ini** bila ingin tetap masuk pada
   kunjungan berikutnya.
3. Tekan **Sign In**.

> **Mode demo**: gunakan kredensial contoh `EMP-2023-0187` / `proqpay`, atau
> tekan tombol **Isi otomatis kredensial demo**. Kata sandi salah akan
> menampilkan pesan error.

**Keluar:** buka **Profile** (ketuk avatar di kanan atas atau tab Profile di
bawah), lalu tekan **Log Out**. Anda akan kembali ke halaman masuk.

**Lupa kata sandi?** Tekan *Forgot password?* pada halaman masuk lalu hubungi
HR perusahaan.

---

## 1. Layar Utama (Home)

Begitu masuk, Anda melihat ringkasan:

- **Hello, [nama]** — sapaan dan periode berjalan (`August · Live`).
- **Net salary (est.)** — perkiraan gaji bersih periode berjalan.
- **Payday** — tanggal gajian.
- **Payroll ref.** — nomor referensi payroll perusahaan.

### Kartu Payroll Status

Menampilkan progres payroll perusahaan dalam 4 tahap:

1. **Awaiting Payroll Data** — perusahaan belum mengirim data payroll.
2. **Processing** — komponen gaji, pajak, dan potongan sedang dihitung.
3. **Awaiting Payout** — menunggu proses pencairan dana.
4. **Paid** — gaji sudah ditransfer ke rekening Anda.

Anda bisa **menekan tombol 1–4** untuk mensimulasikan perpindahan tahap
(khusus mode demo). Bagian bawah kartu menampilkan rincian potongan
(contoh: BPJS, PPh 21) saat tahap *Processing*.

## 2. Mengunduh / Mencetak Slip Gaji

1. Dari Home, buka kartu **Payslip History** lalu **ketuk periode** yang
   diinginkan, atau gunakan tombol **Download Payslip** di bawah tracker.
2. Pada modal slip:
   - **Print / PDF** — membuka dialog cetak browser (cetak langsung / simpan
     sebagai PDF).
   - **Download** — menghasilkan file PDF A4 otomatis (membutuhkan internet
     untuk memuat pustaka cetak pada pemakaian pertama).

File PDF diberi nama `payslip-<bulan>-<tahun>.pdf`. Slip periode yang masih
berjalan diberi cap **ESTIMATE**; slip yang sudah cair dicap **PAID**.

## 3. Advance Salary (Gaji di Depan)

Kartu **Advance Salary** memungkinkan Anda menarik sebagian gaji yang sudah
Anda kerjakan di bulan berjalan, tanpa menunggu gajian.

**Persyaratan:**
- Masa kerja/absen minimal 10 hari di periode berjalan.
- Masa kerja minimal 1 bulan.

**Cara mengajukan:**
1. Tekan **Request Advance**.
2. Pilih **jumlah** (maks 30% dari gaji proporsional berjalan).
3. Pilih **metode** pelunasan: *Auto-deduct on payday* atau *Manual transfer*.
4. Konfirmasi **rekening tujuan**.
5. Tinjau ringkasan, centang persetujuan, lalu **Submit Request**.

Setelah diajukan, status berubah menjadi **Processing**. Pada mode demo,
simulasi dapat dilanjutkan lewat tombol *Simulate: approve & pay out* dan
*Simulate: mark as repaid* (berada di dalam modal Advance).

> Biaya layanan (fee) ditampilkan transparan sebelum pengajuan dikirim dan
> dipotong otomatis saat gajian.

## 4. Riwayat Payslip

Pada Home, kartu **Payslip History** menampilkan seluruh periode. Ketuk salah
satu baris untuk membuka slip lengkapnya. Label pada tiap baris:
- **In progress** — slip periode berjalan (estimasi).
- **Paid** — slip sudah final dan gaji sudah dikirim.

## 5. Notifikasi 🔔

Ikon lonceng di kanan atas menampilkan pemberitahuan, misalnya:
- Payroll pindah ke tahap Processing,
- Slip gaji baru siap diunduh,
- Gaji sudah ditransfer.

## 6. Profil

Tab **Profile** (ikon avatar di header atau menu bawah) menampilkan data diri:
nama, jabatan, email, telepon, ID karyawan, dan rekening gaji. Perubahan data
dilakukan melalui HR perusahaan.

Pada halaman ini juga tersedia tombol **Log Out** untuk keluar dari aplikasi
(lihat §0).

## 7. Help Center

Menu **Help** memuat:
- **Contact HR** — kontak tim HR (email/ext).
- **Payroll FAQ** — jawaban singkat soal jadwal gajian, PPh 21, BPJS, dan
  perubahan rekening.

## 8. Tips

- Aplikasi responsif: tampilan menyesuaikan layar HP maupun desktop.
- Data pengajuan advance tersimpan di perangkat (mode demo); pada versi
  terhubung backend, riwayat datang dari server.
- Jika tombol **Download** PDF gagal (misal tanpa internet), gunakan
  **Print / PDF** lalu pilih "Save as PDF" di dialog browser.
