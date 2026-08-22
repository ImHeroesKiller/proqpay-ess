// @ts-nocheck

const ID_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const EN_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const EN_DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const STAGE_MAP = {
  DRAFT: 1,
  AI_VALIDATING: 1,
  EXCEPTION_REVIEW: 1,
  PROCESSOR_REVIEW: 2,
  CONTROLLER_REVIEW: 2,
  PAYMENT_INSTRUCTION_READY: 2,
  PAYMENT_APPROVAL_PENDING: 3,
  APPROVED_FOR_PAYMENT: 3,
  DISBURSEMENT_PROCESSING: 3,
  PROOF_UPLOADED: 4,
  RECONCILIATION: 4,
  COMPLETED: 4,
};

export const STAGES = [
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
];

export async function d1First(db, sql, binds) {
  const res = await db.prepare(sql).bind(...(binds || [])).first();
  return res || null;
}

export async function d1All(db, sql, binds) {
  const res = await db.prepare(sql).bind(...(binds || [])).all();
  return res.results || [];
}

export function periodToLabel(period) {
  const m = String(period || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return String(period || "");
  const month = ID_MONTHS[Number(m[2]) - 1] || m[2];
  return month + " " + m[1];
}

export function formatPayday(isoDate) {
  if (!isoDate) return { payday: "", paydayShort: "" };
  const d = new Date(isoDate + (String(isoDate).length === 10 ? "T00:00:00Z" : ""));
  if (Number.isNaN(d.getTime())) return { payday: String(isoDate), paydayShort: String(isoDate) };
  const payday = EN_DOW[d.getUTCDay()] + ", " + d.getUTCDate() + " " + EN_SHORT[d.getUTCMonth()] + " " + d.getUTCFullYear();
  const paydayShort = d.getUTCDate() + " " + EN_SHORT[d.getUTCMonth()];
  return { payday, paydayShort };
}

export function maskAccount(bank, acc) {
  const last4 = String(acc || "").replace(/\D/g, "").slice(-4) || "••••";
  const name = bank || "Bank";
  return name + " •••• " + last4;
}

export function stageFromState(state, piStatus, recStatus) {
  if (recStatus && /MATCH|COMPLETE/i.test(recStatus)) return 4;
  if (piStatus && /PAID|COMPLETED|RECONCILED/i.test(piStatus)) return 4;
  return STAGE_MAP[String(state || "").toUpperCase()] || 1;
}

export function slipStatus(stage) {
  return stage >= 4 ? "paid" : "processing";
}

const DEDUCT_RE = /bpjs|pph|potong|deduct|tax|iuran|loan|advance|denda/i;

export function rowsFromCompensation(comp) {
  if (!comp) return [];
  let parsed = {};
  try {
    parsed = JSON.parse(comp.payroll_components || "{}");
  } catch {
    parsed = {};
  }
  const rows = [];
  function push(label, amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n === 0) return;
    const name = String(label || "Item");
    const signed = n < 0 || DEDUCT_RE.test(name) ? -Math.abs(n) : n;
    rows.push([name, signed]);
  }
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      push(item.label || item.name || item.code, item.amount ?? item.value ?? item.nominal);
    }
  } else if (parsed && typeof parsed === "object") {
    for (const [key, val] of Object.entries(parsed)) {
      if (val && typeof val === "object") {
        push(val.label || key, val.amount ?? val.value ?? val.nominal);
      } else {
        push(key, val);
      }
    }
  }
  if (!rows.length) {
    if (Number(comp.basic_salary)) push("Basic salary", comp.basic_salary);
    if (Number(comp.imported_gross) && Number(comp.imported_gross) !== Number(comp.basic_salary)) {
      push("Gross pay", comp.imported_gross);
    }
    if (Number(comp.imported_deduction)) push("Deductions", -Math.abs(Number(comp.imported_deduction)));
  }
  return rows;
}

export function isActiveEmployee(row) {
  const s = String(row.status_aktif || "").toLowerCase();
  if (!s) return true;
  if (/non|inaktif|inactive|resign|keluar|terminate/.test(s)) return false;
  return true;
}

function b64url(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlToBytes(str) {
  const pad = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signToken(payload, secret) {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(header + "." + body));
  return header + "." + body + "." + b64url(sig);
}

export async function verifyToken(token, secret) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function bearer(request) {
  const h = request.headers.get("Authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

export async function requireEmployee(request, env) {
  const secret = env.PORTAL_JWT_SECRET;
  if (!secret) return { error: "Portal JWT secret belum di-set.", status: 503 };
  const payload = await verifyToken(bearer(request), secret);
  if (!payload || !payload.sub) return { error: "Sesi tidak valid atau kedaluwarsa.", status: 401 };
  return { payload };
}
