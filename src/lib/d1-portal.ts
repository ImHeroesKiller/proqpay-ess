// @ts-nocheck
import {
  STAGES,
  d1All,
  d1First,
  formatPayday,
  maskAccount,
  periodToLabel,
  rowsFromCompensation,
  slipStatus,
  stageFromState,
} from "./d1-shared";

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

export async function buildPortalPayload(db, employee) {
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
       AND (s.project_id IS NULL OR s.project_id = ? OR ? IS NULL)
     ORDER BY s.period DESC, s.created_at DESC
     LIMIT 12`,
    [employee.client_id, employee.project_id, employee.project_id],
  );

  const latest = submissions[0] || null;
  const stage = latest ? stageFromState(latest.state, latest.pi_status, latest.rec_status) : 1;
  const periodRaw = latest?.period || compensation?.payroll_source_period || new Date().toISOString().slice(0, 7);
  const paydaySrc = latest?.execution_date || latest?.payment_period || null;
  const payday = formatPayday(paydaySrc);

  const piLines = await d1All(
    db,
    `SELECT s.period, s.state, pi.document_no, pi.status AS pi_status, pi.execution_date, pil.amount, r.status AS rec_status
     FROM payment_instruction_lines pil
     JOIN payment_instructions pi ON pi.id = pil.payment_instruction_id
     JOIN payroll_submissions s ON s.id = pi.submission_id
     LEFT JOIN reconciliations r ON r.payment_instruction_id = pi.id
     WHERE pil.employee_id = ?
     ORDER BY s.period DESC`,
    [empId],
  );

  const payslips = [];
  const seen = new Set();
  const compPeriod = compensation?.payroll_source_period;
  if (compensation && (compPeriod || compensation.basic_salary)) {
    const p = periodToLabel(compPeriod || periodRaw);
    seen.add(compPeriod || periodRaw);
    const st = latest && (latest.period === compPeriod || !compPeriod) ? stage : 2;
    payslips.push({
      period: p,
      status: slipStatus(st),
      rows: rowsFromCompensation(compensation),
    });
  }
  for (const line of piLines) {
    const key = line.period;
    if (seen.has(key)) continue;
    seen.add(key);
    const st = stageFromState(line.state, line.pi_status, line.rec_status);
    payslips.push({
      period: periodToLabel(key),
      status: slipStatus(st),
      rows: [["Net pay", Number(line.amount) || 0]],
    });
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
      s: "Status dari sistem payroll ProQPay Lite.",
      type: "g",
      unread: stage < 4,
    });
  }

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
          desc: "Pengajuan advance akan tersedia setelah modul EWA diaktifkan di server. Data gaji Anda sudah mengikuti database Lite.",
          cta: "Request Advance",
          bg: "linear-gradient(115deg, #0f1b3a 0%, #1b2a52 55%, #24355f 100%)",
        },
      ],
      notifications,
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
      emp: {
        daysWorked: Math.max(1, new Date().getDate()),
        tenureMonths,
      },
      app: null,
      history: [],
    },
  };
}
