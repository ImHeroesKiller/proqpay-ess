import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { findEmployee } from "@/lib/d1-portal";
import { isActiveEmployee, signToken } from "@/lib/d1-shared";
import { clientIp, rateBump, ratePeek, securityHeaders, sessionCookieValue } from "@/lib/security";

export async function POST(request: NextRequest) {
  const headers = securityHeaders();
  const env = await getEnv();
  if (!env.DB) return NextResponse.json({ error: "Service unavailable." }, { status: 503, headers });
  const pin = env.PORTAL_BOOTSTRAP_PIN;
  const secret = env.PORTAL_JWT_SECRET;
  if (!pin || !secret) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503, headers });
  }

  const ip = clientIp(request);
  let body: { emp_id?: string; password?: string; remember?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400, headers });
  }
  const empId = String(body.emp_id || "").trim();
  const password = String(body.password || "");
  if (!empId || !password) {
    return NextResponse.json({ error: "Employee ID dan password wajib." }, { status: 400, headers });
  }

  const ipKey = "ip:" + ip;
  const empKey = "emp:" + empId.toLowerCase();
  if ((await ratePeek(ipKey)) >= 5 || (await ratePeek(empKey)) >= 5) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Tunggu beberapa saat." }, { status: 429, headers });
  }

  const fail = async () => {
    await rateBump(ipKey);
    await rateBump(empKey);
    return NextResponse.json({ error: "Employee ID atau password salah." }, { status: 401, headers });
  };

  if (password !== pin) return fail();

  const employee = await findEmployee(env.DB, empId);
  if (!employee || !isActiveEmployee(employee)) return fail();

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

  const res = NextResponse.json({
    emp_id: employee.employee_code || employee.id,
    company_id: employee.client_id || employee.org_id,
    emp_name: employee.name,
    lang: "id",
    theme: "dark",
  });
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  res.headers.set("Set-Cookie", sessionCookieValue(token, body.remember !== false));
  return res;
}
