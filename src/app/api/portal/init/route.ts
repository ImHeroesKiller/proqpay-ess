import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { buildPortalPayload, findEmployee } from "@/lib/d1-portal";
import { verifyToken } from "@/lib/d1-shared";
import { polishPayslipRows } from "@/lib/ida-labels";
import { initOnLite } from "@/lib/lite-auth";
import { securityHeaders, tokenFromRequest } from "@/lib/security";
import type { Payslip } from "@/lib/types";

export async function GET(request: NextRequest) {
  const headers = securityHeaders();
  const env = await getEnv();
  if (!env.DB) return NextResponse.json({ error: "Service unavailable." }, { status: 503, headers });
  const secret = env.PORTAL_JWT_SECRET;
  if (!secret) return NextResponse.json({ error: "Service unavailable." }, { status: 503, headers });

  const token = tokenFromRequest(request);
  const payload = await verifyToken(token, secret);
  if (!payload?.sub) return NextResponse.json({ error: "Sesi tidak valid atau kedaluwarsa." }, { status: 401, headers });

  const origin = request.headers.get("Origin") || new URL(request.url).origin;
  const liteToken = String(payload.lite || "");
  if (liteToken) {
    const lite = await initOnLite(env, { liteToken, origin });
    if (lite.ok) {
      const body = lite.payload as { config?: { payslips?: Payslip[] }; mustChangePassword?: boolean };
      if (Array.isArray(body.config?.payslips)) {
        for (const slip of body.config.payslips) {
          slip.rows = await polishPayslipRows(slip.rows || [], env);
        }
      }
      return NextResponse.json(
        { ...body, mustChangePassword: Boolean(body.mustChangePassword || payload.must_change) },
        { headers },
      );
    }
  }

  const employee = await findEmployee(env.DB, payload.sub);
  if (!employee) return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404, headers });

  const data = await buildPortalPayload(env.DB, employee, env);
  return NextResponse.json({ ...data, mustChangePassword: Boolean(payload.must_change) }, { headers });
}
