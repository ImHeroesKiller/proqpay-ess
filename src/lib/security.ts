export const SESSION_COOKIE = "proqpay_ess";
export const SESSION_MAX_AGE = 60 * 60 * 12;

const ALLOWED_ORIGINS = [
  "https://proqpay-ess.arywibowo.workers.dev",
  "http://localhost:3000",
  "http://localhost:8787",
];

export function securityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "no-store",
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  };
}

export function corsHeaders(origin: string | null): Record<string, string> {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      Vary: "Origin",
    };
  }
  return { Vary: "Origin" };
}

export function sessionCookieValue(token: string, remember: boolean) {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ];
  if (remember) parts.push(`Max-Age=${SESSION_MAX_AGE}`);
  return parts.join("; ");
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function tokenFromRequest(request: { cookies: { get: (n: string) => { value: string } | undefined }; headers: Headers }) {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (cookie) return cookie;
  const h = request.headers.get("Authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

export function clientIp(request: { headers: Headers }) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function rateCache() {
  return (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
}

function rateUrl(key: string) {
  return new URL("https://ess-ratelimit.internal/" + encodeURIComponent(key));
}

export async function ratePeek(key: string): Promise<number> {
  try {
    const cache = rateCache();
    if (!cache) return 0;
    const hit = await cache.match(rateUrl(key));
    return hit ? Number(await hit.text()) || 0 : 0;
  } catch {
    return 0;
  }
}

/** Count a failed login. 5 failures / 10 minutes per key. */
export async function rateBump(key: string, ttlSec = 600): Promise<void> {
  try {
    const cache = rateCache();
    if (!cache) return;
    const n = (await ratePeek(key)) + 1;
    await cache.put(
      rateUrl(key),
      new Response(String(n), {
        headers: { "Cache-Control": `max-age=${ttlSec}`, "Content-Type": "text/plain" },
      }),
    );
  } catch {
    /* ignore */
  }
}
