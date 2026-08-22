import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";

export async function GET() {
  try {
    const env = await getEnv();
    if (!env.DB) return NextResponse.json({ ok: false, d1: "unbound" }, { status: 503 });
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM employees").first<{ n: number }>();
    return NextResponse.json({ ok: true, d1: "ok", employees: Number(row?.n || 0) });
  } catch (err) {
    return NextResponse.json(
      { ok: false, d1: "error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
