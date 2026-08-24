interface CloudflareEnv {
  DB: D1Database;
  ASSETS: Fetcher;
  PORTAL_JWT_SECRET?: string;
  LITE_API_BASE?: string;
  EMPLOYEE_PORTAL_KEY?: string;
  DEFAULT_ORG_ID?: string;
}