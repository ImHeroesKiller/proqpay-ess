type PayrollPayment = {
  stage: number;
  paymentStatus?: "PAID" | "UNPAID";
  paidOn?: string | null;
  estimatedPayOn?: string | null;
  payday: string;
};

function formatDate(value?: string | null) {
  const dateOnly = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return "";
  const date = new Date(`${dateOnly}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateOnly) return "";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export function payrollPaymentSummary(payroll: PayrollPayment) {
  // Older backend versions expose only the canonical five-stage index.
  const paid = payroll.paymentStatus ? payroll.paymentStatus === "PAID" : payroll.stage >= 5;
  const scheduled = formatDate(payroll.estimatedPayOn) || (payroll.payday !== "—" ? payroll.payday : "");
  return {
    paid,
    status: paid ? "Paid" : "Unpaid",
    dateLabel: paid ? "Tanggal bayar" : "Estimasi tanggal bayar",
    // Never substitute a scheduled date for the actual payment date.
    date: paid ? formatDate(payroll.paidOn) || "Tanggal pembayaran belum tercatat" : scheduled || "Belum dijadwalkan",
  };
}
