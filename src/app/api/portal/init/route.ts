import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { buildPortalPayload, findEmployee } from "@/lib/d1-portal";
import { verifyToken } from "@/lib/d1-shared";
import { securityHeaders, tokenFromRequest } from "@/lib/security";

export async function GET(request: NextRequest) {
  const headers = securityHeaders();
  const env = await getEnv();
  if (!env.DB) return NextResponse.json({ error: "Service unavailable." }, { status: 503, headers });
  const secret = env.PORTAL_JWT_SECRET;
  if (!secret) return NextResponse.json({ error: "Service unavailable." }, { status: 503, headers });

  const token = tokenFromRequest(request);
  const payload = await verifyToken(token, secret);
  if (!payload?.sub) return NextResponse.json({ error: "Sesi tidak valid atau kedaluwarsa." }, { status: 401, headers });

  const employee = await findEmployee(env.DB, payload.sub);
  if (!employee) return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404, headers });

  const data = await buildPortalPayload(env.DB, employee, env);
  return NextResponse.json({ ...data, mustChangePassword: Boolean(payload.must_change) }, { headers });
}
