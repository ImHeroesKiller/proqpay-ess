import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { findEmployee } from "@/lib/d1-portal";
import { isActiveEmployee, signToken } from "@/lib/d1-shared";

export async function POST(request: NextRequest) {
  const env = await getEnv();
  if (!env.DB) return NextResponse.json({ error: "D1 belum di-bind (env.DB)." }, { status: 503 });
  const pin = env.PORTAL_BOOTSTRAP_PIN;
  const secret = env.PORTAL_JWT_SECRET;
  if (!pin || !secret) {
    return NextResponse.json({ error: "PORTAL_BOOTSTRAP_PIN / PORTAL_JWT_SECRET belum di-set." }, { status: 503 });
  }

  let body: { emp_id?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }
  const empId = String(body.emp_id || "").trim();
  const password = String(body.password || "");
  if (!empId || !password) return NextResponse.json({ error: "Employee ID dan password wajib." }, { status: 400 });
  if (password !== pin) return NextResponse.json({ error: "Employee ID atau password salah." }, { status: 401 });

  const employee = await findEmployee(env.DB, empId);
  if (!employee || !isActiveEmployee(employee)) {
    return NextResponse.json({ error: "Employee ID atau password salah." }, { status: 401 });
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

  return NextResponse.json({
    token,
    emp_id: employee.employee_code || employee.id,
    company_id: employee.client_id || employee.org_id,
    emp_name: employee.name,
    lang: "id",
    theme: "dark",
  });
}
