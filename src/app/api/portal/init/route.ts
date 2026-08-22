import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { buildPortalPayload, findEmployee } from "@/lib/d1-portal";
import { bearer, verifyToken } from "@/lib/d1-shared";

export async function GET(request: NextRequest) {
  const env = await getEnv();
  if (!env.DB) return NextResponse.json({ error: "D1 belum di-bind (env.DB)." }, { status: 503 });
  const secret = env.PORTAL_JWT_SECRET;
  if (!secret) return NextResponse.json({ error: "Portal JWT secret belum di-set." }, { status: 503 });

  const payload = await verifyToken(bearer(request), secret);
  if (!payload?.sub) return NextResponse.json({ error: "Sesi tidak valid atau kedaluwarsa." }, { status: 401 });

  const employee = await findEmployee(env.DB, payload.sub);
  if (!employee) return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });

  const data = await buildPortalPayload(env.DB, employee);
  return NextResponse.json(data);
}
