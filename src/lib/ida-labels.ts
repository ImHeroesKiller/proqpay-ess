import type { AppEnv } from "@/lib/env";

const FALLBACK_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

const CANONICAL: Record<string, string> = {
  basicsalary: "Gaji pokok",
  gajipokok: "Gaji pokok",
  penghasilanbruto: "Penghasilan bruto",
  shift: "Tunjangan shift",
  medical: "Tunjangan kesehatan",
  overtime: "Upah lembur",
  overtimepay: "Upah lembur",
  lembur: "Upah lembur",
  incentive: "Insentif",
  insentif: "Insentif",
  bonusorleave: "Bonus / uang cuti",
  taxallowance: "Tunjangan pajak",
  tunjanganpajak: "Tunjangan pajak",
  mealallowance: "Tunjangan makan",
  uangmakan: "Tunjangan makan",
  salaryarrears: "Tunggakan gaji",
  otherallowance: "Tunjangan lain",
  phoneallowance: "Tunjangan pulsa",
  allowancearrears: "Tunggakan tunjangan",
  positionallowance: "Tunjangan jabatan",
  tunjanganjabatan: "Tunjangan jabatan",
  transportallowance: "Tunjangan transport",
  attendanceallowance: "Tunjangan kehadiran",
  bpjstk: "Iuran BPJS Ketenagakerjaan (perusahaan)",
  jamsostek: "Iuran BPJS Ketenagakerjaan (perusahaan)",
  bpjshealth: "Iuran BPJS Kesehatan (perusahaan)",
  bpjskes: "Iuran BPJS Kesehatan (perusahaan)",
  jhtdeduction: "Iuran JHT karyawan",
  taxdeduction: "PPh 21",
  pph21: "PPh 21",
  pensiondeduction: "Iuran JP karyawan",
  attendancededuction: "Potongan kehadiran",
  bpjshealthdeduction: "Iuran BPJS Kesehatan karyawan",
  cooperativededuction: "Potongan koperasi",
  otherdeduction: "Potongan lain",
  potonganlain: "Potongan lain",
  grosspay: "Penghasilan bruto",
  deductions: "Potongan",
  netpay: "Gaji bersih",
  ewarepayment: "Potongan advance salary",
  ewafee: "Biaya advance salary",
};

const EARNING_ORDER = [
  "gajipokok",
  "basicsalary",
  "tunjanganjabatan",
  "positionallowance",
  "tunjangantransport",
  "transportallowance",
  "tunjanganmakan",
  "mealallowance",
  "uangmakan",
  "tunjanganpulsa",
  "phoneallowance",
  "tunjanganshift",
  "shift",
  "upahlembur",
  "overtime",
  "overtimepay",
  "lembur",
  "insentif",
  "incentive",
  "tunjangankehadiran",
  "attendanceallowance",
  "tunjangankesehatan",
  "medical",
  "bonusorleave",
  "tunjanganpajak",
  "taxallowance",
  "tunggakangaji",
  "salaryarrears",
  "tunggakantunjangan",
  "allowancearrears",
  "tunjanganlain",
  "otherallowance",
  "penghasilanbruto",
  "grosspay",
];

const DEDUCTION_ORDER = [
  "bpjshealthdeduction",
  "jhtdeduction",
  "pensiondeduction",
  "taxdeduction",
  "pph21",
  "attendancededuction",
  "cooperativededuction",
  "ewarepayment",
  "ewafee",
  "otherdeduction",
  "potonganlain",
  "deductions",
];

function normalizeKey(raw: string) {
  return String(raw || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function titleFromKey(raw: string) {
  const spaced = String(raw || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/deduction/i, "potongan")
    .replace(/allowance/i, "tunjangan")
    .trim();
  if (!spaced) return "Komponen gaji";
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function dictionaryLabel(raw: string) {
  return CANONICAL[normalizeKey(raw)] || null;
}

function fallbackMap(keys: string[]) {
  const out: Record<string, string> = {};
  for (const key of keys) out[key] = dictionaryLabel(key) || titleFromKey(key);
  return out;
}

function parseJsonObject(text: string): Record<string, string> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

type AiBinding = {
  run: (model: string, input: Record<string, unknown>) => Promise<{ response?: string }>;
};

async function idaRewriteLabels(ai: AiBinding, model: string, keys: string[]) {
  const prompt =
    "Ubah kode komponen payroll menjadi judul baris slip gaji dalam Bahasa Indonesia yang resmi dan singkat (2–6 kata).\n" +
    "Kembalikan HANYA objek JSON { kode: judul }.\n" +
    "Jangan menambah kunci, jangan tulis nominal.\n" +
    "Contoh istilah: Gaji pokok, Tunjangan jabatan, Tunjangan makan, Tunjangan transport, Tunjangan pulsa, Upah lembur, Iuran BPJS Kesehatan karyawan, Iuran JHT karyawan, Iuran JP karyawan, PPh 21, Potongan kehadiran.\n" +
    "Kunci:\n" +
    JSON.stringify(keys);

  const result = await ai.run(model, {
    messages: [
      {
        role: "system",
        content: "Anda IDA, editor redaksi slip gaji Indonesia. Anda tidak menghitung uang. Anda hanya menamai baris.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 400,
    temperature: 0,
  });
  const text = typeof result?.response === "string" ? result.response : JSON.stringify(result);
  return parseJsonObject(text);
}

function sortIndex(key: string, amount: number) {
  const k = normalizeKey(key);
  if (amount >= 0) {
    const i = EARNING_ORDER.indexOf(k);
    return i === -1 ? 100 + EARNING_ORDER.length : i;
  }
  const i = DEDUCTION_ORDER.indexOf(k);
  return 1000 + (i === -1 ? 100 + DEDUCTION_ORDER.length : i);
}

export function arrangePayslipRows(rows: [string, number][]): [string, number][] {
  return [...rows].sort((a, b) => {
    const oa = sortIndex(a[0], a[1]);
    const ob = sortIndex(b[0], b[1]);
    if (oa !== ob) return oa - ob;
    return a[0].localeCompare(b[0], "id");
  });
}

export async function polishPayslipRows(rows: [string, number][], env?: AppEnv): Promise<[string, number][]> {
  if (!rows.length) return rows;
  const keys = [...new Set(rows.map((r) => r[0]))];
  const map = fallbackMap(keys);
  const unknown = keys.filter((k) => !dictionaryLabel(k));
  const ai = env?.AI;
  const model = env?.WORKERS_AI_MODEL || FALLBACK_MODEL;

  if (ai && unknown.length) {
    try {
      const rewritten = await idaRewriteLabels(ai, model, unknown);
      if (rewritten) {
        for (const key of unknown) {
          if (rewritten[key]) map[key] = rewritten[key];
        }
      }
    } catch {
      /* kamus / title-case */
    }
  }

  const ordered = arrangePayslipRows(rows);
  return ordered.map(([label, amount]) => [map[label] || titleFromKey(label), amount]);
}
