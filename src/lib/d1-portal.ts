// @ts-nocheck
import {
  STAGES,
  STAGE_COUNT,
  d1All,
  d1First,
  formatPayday,
  maskAccount,
  periodToLabel,
  rowsFromRunLine,
  slipStatus,
  stageFromState,
} from "./d1-shared";
import { polishPayslipRows } from "./ida-labels";

export async function findEmployee(db, empId) {
  const id = String(empId || "").trim();
  if (!id) return null;
  return d1First(
    db,
    `SELECT e.*, c.name AS client_name, c.code AS client_code, c.billing_address, c.contact_phone, c.contact_email, c.website,
            o.name AS org_name, o.code AS org_code, o.id AS org_id
     FROM employees e
     LEFT JOIN clients c ON c.id = e.client_id
     LEFT JOIN organizations o ON o.id = e.org_id
     WHERE e.id = ? OR e.employee_code = ?
     LIMIT 1`,
    [id, id],
  );
}

export async function buildPortalPayload(db, employee, env) {
  const empId = employee.id;
  const assignment = await d1First(
    db,
    `SELECT position FROM employee_assignments WHERE employee_id = ? AND is_current = 1 LIMIT 1`,
    [empId],
  );
  const bank = await d1First(
    db,
    `SELECT bank_name, account_no FROM employee_bank_accounts WHERE employee_id = ? ORDER BY is_primary DESC LIMIT 1`,
    [empId],
  );
  const contract = await d1First(
    db,
    `SELECT join_date, accepted_date FROM employee_contracts WHERE employee_id = ? AND is_current = 1 LIMIT 1`,
    [empId],
  );
  const compensation = await d1First(
    db,
    `SELECT basic_salary, payroll_source_period, imported_gross, imported_deduction, imported_net, payroll_components
     FROM employee_compensation WHERE employee_id = ? LIMIT 1`,
    [empId],
  );

  const submissions = await d1All(
    db,
    `SELECT s.id, s.period, s.state, s.payment_period, s.created_at,
            pi.id AS pi_id, pi.document_no, pi.status AS pi_status, pi.execution_date,
            r.status AS rec_status
     FROM payroll_submissions s
     LEFT JOIN payment_instructions pi ON pi.submission_id = s.id
     LEFT JOIN reconciliations r ON r.payment_instruction_id = pi.id
     WHERE s.client_id = ?
       AND (
         EXISTS (SELECT 1 FROM payroll_run_lines l WHERE l.submission_id=s.id AND l.employee_id=? AND l.included=1)
         OR EXISTS (
           SELECT 1 FROM payment_instruction_lines pil
           JOIN payment_instructions p2 ON p2.id=pil.payment_instruction_id
           WHERE p2.submission_id=s.id AND pil.employee_id=?
         )
       )
     ORDER BY s.period DESC, s.created_at DESC
     LIMIT 12`,
    [employee.client_id, empId, empId],
  );

  const latest = submissions[0] || null;
  const stage = latest ? stageFromState(latest.state, latest.pi_status, latest.rec_status) : 1;
  const periodRaw = latest?.period || new Date().toISOString().slice(0, 7);
  const paydaySrc = latest?.execution_date || latest?.payment_period || null;
  const payday = formatPayday(paydaySrc);

  const runLines = await d1All(
    db,
    `SELECT l.net_amount, l.gross_amount, l.deduction_amount, l.components, s.period, s.state,
            pi.document_no, pi.status AS pi_status, pi.execution_date, r.status AS rec_status
     FROM payroll_run_lines l
     JOIN payroll_submissions s ON s.id = l.submission_id
     LEFT JOIN payment_instructions pi ON pi.submission_id = s.id
     LEFT JOIN reconciliations r ON r.payment_instruction_id = pi.id
     WHERE l.employee_id = ? AND l.included = 1
     ORDER BY s.period DESC
     LIMIT 12`,
    [empId],
  );

  const payslips = [];
  const seen = new Set();
  for (const line of runLines) {
    const key = line.period;
    if (seen.has(key)) continue;
    seen.add(key);
    const st = stageFromState(line.state, line.pi_status, line.rec_status);
    const rows = rowsFromRunLine(line);
    payslips.push({
      period: periodToLabel(key),
      status: slipStatus(st),
      rows: rows.length ? rows : [["Net pay", Number(line.net_amount) || 0]],
    });
  }

  for (const slip of payslips) {
    slip.rows = await polishPayslipRows(slip.rows, env);
  }

  const phone = employee.mobile || employee.phone || "";
  const bankLabel = bank ? maskAccount(bank.bank_name, bank.account_no) : "";
  const companyName = employee.client_name || employee.org_name || "ProQPay";
  const contactParts = [];
  if (employee.contact_phone) contactParts.push("Telp " + employee.contact_phone);
  if (employee.contact_email) contactParts.push("Email " + employee.contact_email);
  if (employee.website) contactParts.push(employee.website);

  const join = contract?.join_date || contract?.accepted_date;
  let tenureMonths = 0;
  if (join) {
    const d = new Date(join);
    if (!Number.isNaN(d.getTime())) {
      const now = new Date();
      tenureMonths = Math.max(0, (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()));
    }
  }

  const notifications = [];
  if (latest) {
    notifications.push({
      title: periodToLabel(latest.period) + " payroll is " + (latest.state || "in progress"),
      s: "Status payroll periode berjalan.",
      type: "g",
      unread: stage < STAGE_COUNT,
    });
  }

  const net = Number(
    runLines[0]?.net_amount || compensation?.imported_net || compensation?.basic_salary || 0,
  );
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysWorked = Math.min(Math.max(now.getDate(), 1), daysInMonth);
  const ewa = await loadEwaState(db, employee, {
    tenureMonths, net, daysWorked, daysInMonth, paid: stage >= STAGE_COUNT,
  });

  return {
    config: {
      employee: {
        name: employee.name,
        company: companyName,
        role: assignment?.position || "",
        email: employee.email || "",
        phone,
        empId: employee.employee_code || employee.id,
        bank: bankLabel,
      },
      company: {
        name: companyName,
        tagline: "Payroll & HR Digital",
        address: employee.billing_address || "",
        contact: contactParts.join(" · "),
        legal: employee.org_name || "ProQPay",
      },
      payroll: {
        period: periodToLabel(periodRaw),
        ref: latest?.document_no || latest?.id || periodRaw,
        stage,
        payday: payday.payday || "—",
        paydayShort: payday.paydayShort || "",
      },
      stages: STAGES,
      payslips,
      ads: [
        {
          tag: "Advance Salary",
          title: "Get Paid Sooner, Worry Less",
          desc: "Cairkan gaji yang sudah Anda kerjakan. Pengajuan diproses sesuai kebijakan perusahaan.",
          cta: "Request Advance",
          bg: "linear-gradient(115deg, #0f1b3a 0%, #1b2a52 55%, #24355f 100%)",
        },
      ],
      notifications,
    },
    ewa,
  };
}

async function loadEwaState(db, employee, { tenureMonths, net, daysWorked, daysInMonth, paid }) {
  const fallbackRules = {
    feeRate: 0.03, minFee: 50000, minFeeAmount: 1750000, maxTenorMonths: 1, maxPercent: 0.3, minDaysWorked: 10,
  };
  const fallback = {
    rules: fallbackRules,
    emp: { daysWorked, tenureMonths, daysInMonth, net },
    plafond: Math.max(0, Math.floor((net * (daysWorked / daysInMonth) * 0.3) / 10000) * 10000),
    eligible: tenureMonths >= 1 && daysWorked >= 10 && !paid,
    reason: paid ? "Payroll periode ini sudah dibayar" : "",
    app: null,
    history: [],
  };
  try {
    const policy = await d1First(
      db,
      `SELECT * FROM ewa_policies WHERE org_id=? AND (client_id=? OR client_id IS NULL)
       ORDER BY client_id IS NULL LIMIT 1`,
      [employee.org_id, employee.client_id],
    );
    const rules = policy ? {
      feeRate: Number(policy.fee_rate),
      minFee: Number(policy.min_fee),
      minFeeAmount: Number(policy.min_fee_amount),
      maxTenorMonths: Number(policy.max_tenor_months),
      maxPercent: Number(policy.max_percent),
      minDaysWorked: Number(policy.min_days_worked),
    } : fallbackRules;
    const plafond = Math.max(0, Math.floor((net * (daysWorked / daysInMonth) * rules.maxPercent) / 10000) * 10000);
    const open = await d1First(
      db,
      `SELECT id, amount, fee, method, status, created_at FROM ewa_requests
       WHERE employee_id=? AND status IN ('SUBMITTED','APPROVED','DISBURSED','REPAYING')
       ORDER BY created_at DESC LIMIT 1`,
      [employee.id],
    );
    const history = await d1All(
      db,
      `SELECT id AS ref, created_at AS date, amount, status FROM ewa_requests
       WHERE employee_id=? ORDER BY created_at DESC LIMIT 8`,
      [employee.id],
    );
    const eligible = Boolean(policy ? policy.enabled : 1)
      && tenureMonths >= (policy ? Number(policy.min_tenure_months) : 1)
      && daysWorked >= rules.minDaysWorked
      && !open
      && !paid
      && plafond >= 100000;
    return {
      rules,
      emp: { daysWorked, tenureMonths, daysInMonth, net },
      plafond,
      eligible,
      reason: !eligible ? (open ? "Masih ada pengajuan yang berjalan" : paid ? "Payroll periode ini sudah dibayar" : "") : "",
      app: open ? {
        ref: open.id,
        amount: Number(open.amount),
        fee: Number(open.fee),
        method: open.method,
        inst: 1,
        date: String(open.created_at || "").slice(0, 10),
        status: open.status,
      } : null,
      history: history.map((row) => ({
        ref: row.ref,
        date: String(row.date || "").slice(0, 10),
        amount: Number(row.amount),
        status: row.status,
      })),
    };
  } catch {
    return fallback;
  }
}
