import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { findEmployee } from "@/lib/d1-portal";
import { d1First, isActiveEmployee, signToken } from "@/lib/d1-shared";
import { constantTimeEqual, loginOnLite, pinFallbackEnabled } from "@/lib/lite-auth";
import { clientIp, rateBump, ratePeek, securityHeaders, sessionCookieValue } from "@/lib/security";

async function hasCredentials(db: NonNullable<Awaited<ReturnType<typeof getEnv>>["DB"]>, employeeId: string) {
  try {
    const row = await d1First(db, "SELECT 1 AS ok FROM employee_credentials WHERE employee_id=? LIMIT 1", [employeeId]);
    return Boolean(row);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const headers = securityHeaders();
  const env = await getEnv();
  if (!env.DB) return NextResponse.json({ error: "Service unavailable." }, { status: 503, headers });
  const secret = env.PORTAL_JWT_SECRET;
  if (!secret) {
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

  const fail = async (status = 401, error = "Employee ID atau password salah.") => {
    await rateBump(ipKey);
    await rateBump(empKey);
    return NextResponse.json({ error }, { status, headers });
  };

  const origin = request.headers.get("Origin") || new URL(request.url).origin;
  const lite = await loginOnLite(env, { empId, password, origin });

  let employee = lite.ok ? await findEmployee(env.DB, lite.emp_code || lite.emp_id) : null;
  let mustChangePassword = lite.ok ? lite.mustChangePassword : false;
  let liteToken = lite.ok ? lite.token : "";

  if (!lite.ok) {
    const pin = env.PORTAL_BOOTSTRAP_PIN;
    const allowPin = pinFallbackEnabled(env) && Boolean(pin);
    if (!allowPin) {
      if (lite.unreachable) return NextResponse.json({ error: lite.error }, { status: 503, headers });
      if (lite.status === 429) return NextResponse.json({ error: lite.error }, { status: 429, headers });
      return fail(lite.status === 401 ? 401 : lite.status, lite.status === 401 ? "Employee ID atau password salah." : lite.error);
    }
    employee = await findEmployee(env.DB, empId);
    if (!employee || !isActiveEmployee(employee)) return fail();
    if (await hasCredentials(env.DB, employee.id)) return fail();
    if (!constantTimeEqual(password, String(pin))) return fail();
    mustChangePassword = false;
    liteToken = "";
  }

  if (lite.ok && !employee) {
    return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404, headers });
  }
  if (!employee || !isActiveEmployee(employee)) return fail();

  const now = Math.floor(Date.now() / 1000);
  const token = await signToken(
    {
      sub: employee.id,
      emp_code: employee.employee_code || employee.id,
      client_id: employee.client_id,
      org_id: employee.org_id,
      role: "EMPLOYEE",
      lite: liteToken || undefined,
      must_change: mustChangePassword ? 1 : 0,
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
    mustChangePassword,
  });
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  res.headers.set("Set-Cookie", sessionCookieValue(token, body.remember !== false));
  return res;
}
