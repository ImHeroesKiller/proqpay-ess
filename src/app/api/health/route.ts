import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { securityHeaders } from "@/lib/security";

export async function GET() {
  const headers = securityHeaders();
  try {
    const env = await getEnv();
    if (!env.DB) return NextResponse.json({ ok: false, d1: "unbound" }, { status: 503, headers });
    await env.DB.prepare("SELECT 1 AS n").first();
    return NextResponse.json({ ok: true, d1: "ok" }, { headers });
  } catch {
    return NextResponse.json({ ok: false, d1: "error" }, { status: 500, headers });
  }
}
