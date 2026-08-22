import { findEmployee } from "../_portal.js";
import { isActiveEmployee, json, onOptions, signToken } from "../_shared.js";

export function onRequestOptions({ request }) {
  return onOptions(request);
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "D1 belum di-bind (env.DB)." }, 503, request);
  const pin = env.PORTAL_BOOTSTRAP_PIN;
  const secret = env.PORTAL_JWT_SECRET;
  if (!pin || !secret) {
    return json({ error: "PORTAL_BOOTSTRAP_PIN / PORTAL_JWT_SECRET belum di-set." }, 503, request);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body JSON tidak valid." }, 400, request);
  }
  const empId = String(body.emp_id || "").trim();
  const password = String(body.password || "");
  if (!empId || !password) return json({ error: "Employee ID dan password wajib." }, 400, request);
  if (password !== pin) return json({ error: "Employee ID atau password salah." }, 401, request);

  const employee = await findEmployee(env.DB, empId);
  if (!employee || !isActiveEmployee(employee)) {
    return json({ error: "Employee ID atau password salah." }, 401, request);
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await signToken(
    {
      sub: employee.id,
      emp_code: employee.employee_code || employee.id,
      client_id: employee.client_id,
      org_id: employee.org_id,
      role: "EMPLOYEE",
      iat: now,
      exp: now + 60 * 60 * 12,
    },
    secret,
  );

  return json(
    {
      token,
      emp_id: employee.employee_code || employee.id,
      company_id: employee.client_id || employee.org_id,
      emp_name: employee.name,
      lang: "id",
      theme: "dark",
    },
    200,
    request,
  );
}
