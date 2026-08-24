import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { verifyToken } from "@/lib/d1-shared";
import { changePasswordOnLite, validateNewPassword } from "@/lib/lite-auth";
import { clearSessionCookie, securityHeaders, tokenFromRequest } from "@/lib/security";

export async function POST(request: NextRequest) {
  const headers = securityHeaders();
  const env = await getEnv();
  const secret = env.PORTAL_JWT_SECRET;
  if (!secret) return NextResponse.json({ error: "Service unavailable." }, { status: 503, headers });

  const session = await verifyToken(tokenFromRequest(request), secret);
  if (!session?.sub) {
    return NextResponse.json({ error: "Sesi tidak valid atau kedaluwarsa." }, { status: 401, headers });
  }
  const liteToken = String(session.lite || "");
  if (!liteToken) {
    return NextResponse.json({ error: "Ganti password belum tersedia. Hubungi HR." }, { status: 409, headers });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400, headers });
  }
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const problem = validateNewPassword(newPassword);
  if (problem) return NextResponse.json({ error: problem }, { status: 422, headers });

  const origin = request.headers.get("Origin") || new URL(request.url).origin;
  const result = await changePasswordOnLite(env, { liteToken, currentPassword, newPassword, origin });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status, headers });
  }

  const res = NextResponse.json({ ok: true, sessionRevoked: true });
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  res.headers.set("Set-Cookie", clearSessionCookie());
  return res;
}
