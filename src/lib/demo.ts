import type { PortalPayload } from "./types";

export const DEMO_EMP_ID = "EMP-2023-0187";
export const DEMO_PASS = "proqpay";

export const demoPayload: PortalPayload = {
  config: {
    employee: {
      name: "Andi Pratama",
      company: "PT Maju Jaya Teknologi",
      role: "Staff Finance",
      email: "andi.pratama@majujaya.co.id",
      phone: "+62 812-3456-7890",
      empId: DEMO_EMP_ID,
      bank: "BCA •••• 4821",
    },
    company: {
      name: "PT Maju Jaya Teknologi",
      tagline: "Payroll & HR Digital",
      address: "Menara Maju Jaya Lt. 18, Jl. Kemang Raya No. 88, Jakarta Selatan 12730",
      contact: "Telp (021) 7590-1234 · Email hrd@majujaya.co.id · www.majujaya.co.id",
      legal: "PT Fintek Maju Bersama",
    },
    payroll: {
      period: "Agustus 2026",
      ref: "PYRL-0826-00421",
      stage: 2,
      payday: "Tuesday, 25 Aug 2026",
      paydayShort: "25 Aug",
    },
    stages: [
      {
        title: "Awaiting Payroll Data",
        desc: "Menunggu data payroll dari perusahaan",
        meta: "Waiting",
        note: "Sistem menunggu data payroll periode berjalan dari perusahaan. Status akan diperbarui setelah data diterima.",
        eta: "Est. before payday",
      },
      {
        title: "Processing",
        desc: "Menghitung komponen gaji Anda",
        meta: "In progress",
        note: "Sistem menghitung komponen gaji, pajak, dan potongan secara otomatis. Anda dapat melihat perkiraannya di slip gaji.",
        eta: "Est. before payday",
      },
      {
        title: "Awaiting Payout",
        desc: "Menunggu proses pencairan dana",
        meta: "Waiting",
        note: "Hasil perhitungan sedang menunggu proses pencairan. Dana akan ditransfer ke rekening terdaftar Anda.",
        eta: "Est. before payday",
      },
      {
        title: "Paid",
        desc: "Gaji telah ditransfer ke rekening Anda",
        meta: "Completed",
        note: "Gaji Anda telah ditransfer ke rekening terdaftar. Slip gaji final tersedia di menu Payslip History.",
        eta: "Done",
      },
    ],
    payslips: [
      {
        period: "Agustus 2026",
        status: "processing",
        rows: [
          ["Basic salary", 7500000],
          ["Position allowance", 1500000],
          ["Overtime pay", 600000],
          ["BPJS Health", -190000],
          ["BPJS Employment", -210000],
          ["PPh 21", -420000],
        ],
      },
      {
        period: "Juli 2026",
        status: "paid",
        rows: [
          ["Basic salary", 7500000],
          ["Position allowance", 1500000],
          ["Overtime pay", 350000],
          ["BPJS Health", -190000],
          ["BPJS Employment", -210000],
          ["PPh 21", -390000],
        ],
      },
      {
        period: "Juni 2026",
        status: "paid",
        rows: [
          ["Basic salary", 7500000],
          ["Position allowance", 1500000],
          ["Overtime pay", 280000],
          ["BPJS Health", -190000],
          ["BPJS Employment", -210000],
          ["PPh 21", -370000],
        ],
      },
      {
        period: "Mei 2026",
        status: "paid",
        rows: [
          ["Basic salary", 7500000],
          ["Position allowance", 1500000],
          ["Overtime pay", 150000],
          ["BPJS Health", -190000],
          ["BPJS Employment", -210000],
          ["PPh 21", -340000],
        ],
      },
    ],
    ads: [
      {
        tag: "Advance Salary",
        title: "Get Paid Sooner, Worry Less",
        desc: "Butuh dana di tengah bulan? Cairkan gaji yang sudah Anda kerjakan — proses mudah, tanpa agunan, tanpa bunga tersembunyi.",
        cta: "Request Advance",
        bg: "linear-gradient(115deg, #0f1b3a 0%, #1b2a52 55%, #24355f 100%)",
      },
    ],
    notifications: [
      { title: "August 2026 payroll has moved to Processing", s: "Perhitungan pajak dan potongan sedang berjalan.", type: "a", unread: true },
      { title: "Your July 2026 payslip is ready", s: "Unduh slip gaji Anda sebelum 31 August.", type: "g", unread: false },
      { title: "Your July 2026 salary has been paid", s: "Rp 8.560.000 telah dikirim ke BCA •••• 4821.", type: "g", unread: false },
    ],
  },
  ewa: {
    rules: {
      feeRate: 0.03,
      minFee: 50000,
      minFeeAmount: 1750000,
      maxTenorMonths: 1,
      maxPercent: 0.3,
      minDaysWorked: 10,
    },
    emp: { daysWorked: Math.max(1, new Date().getDate()), tenureMonths: 36 },
    app: null,
    history: [
      { ref: "EWA-2026-0392", date: "12 Aug 2026", amount: 750000, status: "lunas" },
      { ref: "EWA-2026-0368", date: "28 Jul 2026", amount: 1200000, status: "lunas" },
    ],
  },
};
