export const EWA_STATUSES = [
  "SUBMITTED",
  "APPROVED",
  "DISBURSED",
  "REPAYING",
  "REPAID",
  "REJECTED",
  "CANCELLED",
] as const;

export type EwaStatus = (typeof EWA_STATUSES)[number];

export const EWA_LIFECYCLE = {
  SUBMITTED: { label: "Menunggu persetujuan", step: 1, tone: "warning", note: "Pengajuan Anda sudah diterima dan menunggu review payroll." },
  APPROVED: { label: "Disetujui", step: 2, tone: "info", note: "Pengajuan disetujui dan menunggu proses pencairan." },
  DISBURSED: { label: "Sudah dicairkan", step: 3, tone: "info", note: "Dana sudah dicairkan ke rekening gaji Anda." },
  REPAYING: { label: "Diproses di payroll", step: 4, tone: "info", note: "Potongan advance sudah masuk ke proses payroll periode berjalan." },
  REPAID: { label: "Lunas", step: 5, tone: "success", note: "Advance telah lunas setelah payroll direkonsiliasi." },
  REJECTED: { label: "Ditolak", step: 1, tone: "danger", note: "Pengajuan tidak disetujui. Hubungi HR bila perlu penjelasan." },
  CANCELLED: { label: "Dibatalkan", step: 1, tone: "warning", note: "Pengajuan telah dibatalkan." },
} as const;

export function ewaStatusMeta(status?: string) {
  const key = String(status || "").toUpperCase() as EwaStatus;
  return EWA_STATUSES.includes(key)
    ? EWA_LIFECYCLE[key]
    : { label: key || "Diproses", step: 1, tone: "info" as const, note: "Status pengajuan sedang diperbarui." };
}
