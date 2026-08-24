import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { verifyToken } from "@/lib/d1-shared";
import { liteApiBase, liteHeaders } from "@/lib/lite-auth";
import { securityHeaders, tokenFromRequest } from "@/lib/security";

export async function POST(request: NextRequest) {
  const headers = securityHeaders();
  const env = await getEnv();
  const secret = env.PORTAL_JWT_SECRET;
  if (!secret) return NextResponse.json({ error: "Service unavailable." }, { status: 503, headers });
  const session = await verifyToken(tokenFromRequest(request), secret);
  if (!session?.sub) return NextResponse.json({ error: "Sesi tidak valid atau kedaluwarsa." }, { status: 401, headers });
  const liteToken = String(session.lite || "");
  if (!liteToken) return NextResponse.json({ error: "Ajukan advance lewat sesi portal Lite." }, { status: 409, headers });
  const base = liteApiBase(env);
  if (!base) return NextResponse.json({ error: "Layanan Lite belum dikonfigurasi." }, { status: 503, headers });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400, headers });
  }
  const origin = request.headers.get("Origin") || new URL(request.url).origin;
  try {
    const response = await fetch(`${base}/api/employee/ewa`, {
      method: "POST",
      headers: {
        ...liteHeaders(env, origin),
        Authorization: `Bearer ${liteToken}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status, headers });
  } catch {
    return NextResponse.json({ error: "Layanan advance tidak tersedia." }, { status: 503, headers });
  }
}
