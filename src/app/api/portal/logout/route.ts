import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { verifyToken } from "@/lib/d1-shared";
import { logoutOnLite } from "@/lib/lite-auth";
import { clearSessionCookie, securityHeaders, tokenFromRequest } from "@/lib/security";

export async function POST(request: NextRequest) {
  const env = await getEnv();
  const secret = env.PORTAL_JWT_SECRET;
  if (secret) {
    const session = await verifyToken(tokenFromRequest(request), secret);
    if (session?.lite) {
      const origin = request.headers.get("Origin") || new URL(request.url).origin;
      await logoutOnLite(env, { liteToken: String(session.lite), origin });
    }
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookie());
  for (const [k, v] of Object.entries(securityHeaders())) res.headers.set(k, v);
  return res;
}
