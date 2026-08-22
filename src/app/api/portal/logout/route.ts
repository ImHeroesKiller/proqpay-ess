import { NextResponse } from "next/server";
import { clearSessionCookie, securityHeaders } from "@/lib/security";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookie());
  for (const [k, v] of Object.entries(securityHeaders())) res.headers.set(k, v);
  return res;
}
