import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { liteApiBase } from "@/lib/lite-auth";
import { securityHeaders } from "@/lib/security";

export async function GET() {
  const headers = securityHeaders();
  try {
    const env = await getEnv();
    const base = liteApiBase(env);
    if (!base) {
      return NextResponse.json({ ok: false, lite: "unconfigured" }, { status: 503, headers });
    }

    const response = await fetch(`${base}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const ready = response.ok && data.ready !== false && data.status !== "error";

    return NextResponse.json(
      {
        ok: ready,
        lite: ready ? "ok" : "degraded",
        liteStatus: data.status || response.status,
      },
      { status: ready ? 200 : 503, headers },
    );
  } catch {
    return NextResponse.json({ ok: false, lite: "unreachable" }, { status: 503, headers });
  }
}
