/** Worker bindings and secrets. ESS consumes ProQPay Lite APIs and does not bind payroll D1 directly. */
export type AppEnv = {
  PORTAL_JWT_SECRET?: string;
  LITE_API_BASE?: string;
  EMPLOYEE_PORTAL_KEY?: string;
  DEFAULT_ORG_ID?: string;
  WORKERS_AI_MODEL?: string;
  AI?: {
    run: (model: string, input: Record<string, unknown>) => Promise<{ response?: string }>;
  };
};
