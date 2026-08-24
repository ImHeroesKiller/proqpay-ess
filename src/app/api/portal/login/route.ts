import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { signToken } from "@/lib/d1-shared";
import { loginOnLite } from "@/lib/lite-auth";
import { clientIp, rateBump, ratePeek, securityHeaders, sessionCookieValue } from "@/lib/security";

export async function POST(request: NextRequest) {
  const headers = securityHeaders();
  const env = await getEnv();
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
  if (!lite.ok) {
    if (lite.unreachable) return NextResponse.json({ error: lite.error }, { status: 503, headers });
    if (lite.status === 429) return NextResponse.json({ error: lite.error }, { status: 429, headers });
    return fail(
      lite.status === 401 ? 401 : lite.status,
      lite.status === 401 ? "Employee ID atau password salah." : lite.error,
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await signToken(
    {
      sub: lite.emp_id,
      emp_code: lite.emp_code || lite.emp_id,
      client_id: lite.client_id,
      org_id: lite.org_id,
      role: "EMPLOYEE",
      lite: lite.token,
      must_change: lite.mustChangePassword ? 1 : 0,
      iat: now,
      exp: now + 60 * 60 * 12,
    },
    secret,
  );

  const res = NextResponse.json({
    emp_id: lite.emp_code || lite.emp_id,
    company_id: lite.client_id || lite.org_id,
    emp_name: lite.emp_name,
    lang: "id",
    theme: "dark",
    mustChangePassword: lite.mustChangePassword,
  });
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  res.headers.set("Set-Cookie", sessionCookieValue(token, body.remember !== false));
  return res;
}
