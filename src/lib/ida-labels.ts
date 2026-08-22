import type { AppEnv } from "@/lib/env";

const FALLBACK_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

const CANONICAL: Record<string, string> = {
  basicsalary: "Basic salary",
  gajipokok: "Basic salary",
  shift: "Shift allowance",
  bpjstk: "BPJS Employment (company)",
  jamsostek: "BPJS Employment",
  medical: "Medical allowance",
  overtime: "Overtime pay",
  overtimepay: "Overtime pay",
  lembur: "Overtime pay",
  incentive: "Incentive",
  bpjshealth: "BPJS Health (company)",
  bpjskes: "BPJS Health (company)",
  bonusorleave: "Bonus / leave conversion",
  jhtdeduction: "JHT employee share",
  taxallowance: "Tax allowance",
  taxdeduction: "PPh 21",
  pph21: "PPh 21",
  mealallowance: "Meal allowance",
  uangmakan: "Meal allowance",
  salaryarrears: "Salary arrears",
  otherallowance: "Other allowance",
  otherdeduction: "Other deduction",
  phoneallowance: "Phone allowance",
  allowancearrears: "Allowance arrears",
  pensiondeduction: "Pension (JP) employee share",
  positionallowance: "Position allowance",
  tunjanganjabatan: "Position allowance",
  transportallowance: "Transport allowance",
  attendanceallowance: "Attendance allowance",
  attendancededuction: "Attendance deduction",
  bpjshealthdeduction: "BPJS Health",
  cooperativededuction: "Cooperative deduction",
  grosspay: "Gross pay",
  deductions: "Deductions",
  netpay: "Net pay",
};

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
    .trim();
  if (!spaced) return "Payroll item";
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
    "You write Indonesian payroll payslip line titles in concise English (2–5 words), like official payslips (ADP/Workday).\n" +
    "Return ONLY a JSON object mapping each input key to a label.\n" +
    "Do not add keys. Do not include amounts, currency, or explanations.\n" +
    "Use terms: Basic salary, Overtime pay, Meal allowance, Transport allowance, Phone allowance, Position allowance, BPJS Health, BPJS Employment, JHT employee share, PPh 21.\n" +
    "Keys:\n" +
    JSON.stringify(keys);

  const result = await ai.run(model, {
    messages: [
      { role: "system", content: "You are IDA, a payroll copy editor. You never calculate money. You only rename line titles." },
      { role: "user", content: prompt },
    ],
    max_tokens: 400,
    temperature: 0,
  });
  const text = typeof result?.response === "string" ? result.response : JSON.stringify(result);
  return parseJsonObject(text);
}

export async function polishPayslipRows(rows: [string, number][], env?: AppEnv): Promise<[string, number][]> {
  if (!rows.length) return rows;
  const keys = [...new Set(rows.map((r) => r[0]))];
  let map = fallbackMap(keys);
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
      /* keep dictionary / title-case */
    }
  }

  return rows.map(([label, amount]) => [map[label] || titleFromKey(label), amount]);
}
