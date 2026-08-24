export type LiteLoginOk = {
  ok: true;
  emp_id: string;
  emp_code: string;
  emp_name: string;
  client_id: string;
  org_id: string;
  mustChangePassword: boolean;
  token: string;
};

export type LiteLoginFail = {
  ok: false;
  status: number;
  error: string;
  unreachable?: boolean;
};

export type LiteLoginResult = LiteLoginOk | LiteLoginFail;

const encoder = new TextEncoder();

export function liteApiBase(env: { LITE_API_BASE?: string }) {
  return String(env.LITE_API_BASE || "").replace(/\/+$/, "");
}

export function pinFallbackEnabled(env: { PORTAL_PIN_FALLBACK?: string }) {
  return String(env.PORTAL_PIN_FALLBACK || "") === "1";
}

export function constantTimeEqual(left: string, right: string) {
  const a = encoder.encode(String(left || ""));
  const b = encoder.encode(String(right || ""));
  const length = Math.max(a.length, b.length);
  let mismatch = a.length ^ b.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a[index] || 0) ^ (b[index] || 0);
  }
  return mismatch === 0;
}

export function validateNewPassword(password: string) {
  const value = String(password || "");
  if (value.length < 12) return "Password minimal 12 karakter";
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return "Password wajib memiliki huruf besar, huruf kecil, angka, dan simbol";
  }
  return null;
}

export function liteHeaders(env: { EMPLOYEE_PORTAL_KEY?: string }, origin: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin) headers.Origin = origin;
  if (env.EMPLOYEE_PORTAL_KEY) headers["X-Portal-Key"] = env.EMPLOYEE_PORTAL_KEY;
  return headers;
}

type FetchLike = typeof fetch;

export async function loginOnLite(
  env: { LITE_API_BASE?: string; EMPLOYEE_PORTAL_KEY?: string },
  input: { empId: string; password: string; origin: string },
  fetchImpl: FetchLike = fetch,
): Promise<LiteLoginResult> {
  const base = liteApiBase(env);
  if (!base) {
    return { ok: false, status: 503, error: "Layanan login belum dikonfigurasi.", unreachable: true };
  }
  try {
    const response = await fetchImpl(`${base}/api/employee/login`, {
      method: "POST",
      headers: liteHeaders(env, input.origin),
      body: JSON.stringify({ emp_id: input.empId, password: input.password }),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok || !data.ok || !data.token) {
      return {
        ok: false,
        status: response.status,
        error: String(data.error || "Employee ID atau password salah."),
        unreachable: response.status >= 500,
      };
    }
    return {
      ok: true,
      emp_id: String(data.emp_id || input.empId),
      emp_code: String(data.emp_code || data.emp_id || input.empId),
      emp_name: String(data.emp_name || ""),
      client_id: String(data.client_id || ""),
      org_id: String(data.org_id || ""),
      mustChangePassword: Boolean(data.mustChangePassword),
      token: String(data.token),
    };
  } catch {
    return { ok: false, status: 503, error: "Layanan login tidak tersedia.", unreachable: true };
  }
}

export async function changePasswordOnLite(
  env: { LITE_API_BASE?: string; EMPLOYEE_PORTAL_KEY?: string },
  input: { liteToken: string; currentPassword: string; newPassword: string; origin: string },
  fetchImpl: FetchLike = fetch,
) {
  const base = liteApiBase(env);
  if (!base) return { ok: false as const, status: 503, error: "Layanan login belum dikonfigurasi." };
  try {
    const response = await fetchImpl(`${base}/api/employee/password`, {
      method: "POST",
      headers: {
        ...liteHeaders(env, input.origin),
        Authorization: `Bearer ${input.liteToken}`,
      },
      body: JSON.stringify({
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return {
        ok: false as const,
        status: response.status,
        error: String(data.error || "Gagal mengganti password."),
      };
    }
    return { ok: true as const };
  } catch {
    return { ok: false as const, status: 503, error: "Layanan login tidak tersedia." };
  }
}

export async function logoutOnLite(
  env: { LITE_API_BASE?: string; EMPLOYEE_PORTAL_KEY?: string },
  input: { liteToken: string; origin: string },
  fetchImpl: FetchLike = fetch,
) {
  const base = liteApiBase(env);
  if (!base || !input.liteToken) return;
  try {
    await fetchImpl(`${base}/api/employee/logout`, {
      method: "POST",
      headers: {
        ...liteHeaders(env, input.origin),
        Authorization: `Bearer ${input.liteToken}`,
      },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    /* best-effort */
  }
}
