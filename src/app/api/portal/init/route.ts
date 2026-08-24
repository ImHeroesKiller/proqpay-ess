import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { verifyToken } from "@/lib/d1-shared";
import { polishPayslipRows } from "@/lib/ida-labels";
import { initOnLite, liteApiBase, liteHeaders } from "@/lib/lite-auth";
import { securityHeaders, tokenFromRequest } from "@/lib/security";
import type { Payslip } from "@/lib/types";

export async function GET(request: NextRequest) {
  const headers = securityHeaders();
  const env = await getEnv();
  const secret = env.PORTAL_JWT_SECRET;
  if (!secret) return NextResponse.json({ error: "Service unavailable." }, { status: 503, headers });

  const token = tokenFromRequest(request);
  const payload = await verifyToken(token, secret);
  if (!payload?.sub) {
    return NextResponse.json({ error: "Sesi tidak valid atau kedaluwarsa." }, { status: 401, headers });
  }

  const liteToken = String(payload.lite || "");
  if (!liteToken) {
    return NextResponse.json(
      { error: "Sesi portal lama tidak lagi didukung. Silakan login ulang." },
      { status: 401, headers },
    );
  }

  const origin = request.headers.get("Origin") || new URL(request.url).origin;
  const lite = await initOnLite(env, { liteToken, origin });
  if (!lite.ok) {
    if (lite.status === 401 || lite.status === 403) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau kedaluwarsa. Silakan login ulang." },
        { status: 401, headers },
      );
    }
    return NextResponse.json(
      { error: "Layanan payroll sementara tidak tersedia." },
      { status: 503, headers },
    );
  }

  const body = lite.payload as {
    config?: { payslips?: Payslip[] };
    ewa?: Record<string, unknown>;
    mustChangePassword?: boolean;
  };
  if (Array.isArray(body.config?.payslips)) {
    for (const slip of body.config.payslips) {
      slip.rows = await polishPayslipRows(slip.rows || [], env);
    }
  }

  // EWA eligibility/plafond must come from the same canonical endpoint used for submit.
  // This prevents the dashboard from showing a different amount than the transaction endpoint.
  const base = liteApiBase(env);
  let canonicalEwa: Record<string, unknown> | undefined;
  try {
    const response = await fetch(`${base}/api/employee/ewa`, {
      method: "GET",
      headers: {
        ...liteHeaders(env, origin),
        Authorization: `Bearer ${liteToken}`,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau kedaluwarsa. Silakan login ulang." },
        { status: 401, headers },
      );
    }
    if (response.ok) {
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (data.ok) canonicalEwa = data;
    }
  } catch {
    // Keep portal readable, but never expose a stale EWA eligibility as actionable.
  }

  const ewa = canonicalEwa || {
    ...(body.ewa || {}),
    eligible: false,
    reason: "Status advance salary sementara tidak tersedia. Coba lagi beberapa saat.",
  };

  return NextResponse.json(
    { ...body, ewa, mustChangePassword: Boolean(body.mustChangePassword || payload.must_change) },
    { headers },
  );
}
