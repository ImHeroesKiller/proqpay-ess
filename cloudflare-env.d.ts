interface CloudflareEnv {
  DB: D1Database;
  ASSETS: Fetcher;
  PORTAL_BOOTSTRAP_PIN?: string;
  PORTAL_JWT_SECRET?: string;
  DEFAULT_ORG_ID?: string;
}
