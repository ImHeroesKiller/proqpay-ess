interface CloudflareEnv {
  DB: D1Database;
  ASSETS: Fetcher;
  PORTAL_BOOTSTRAP_PIN?: string;
  PORTAL_JWT_SECRET?: string;
  PORTAL_PIN_FALLBACK?: string;
  LITE_API_BASE?: string;
  EMPLOYEE_PORTAL_KEY?: string;
  DEFAULT_ORG_ID?: string;
}