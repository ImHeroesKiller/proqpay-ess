/** Worker bindings (D1 + secrets). */
export type AppEnv = {
  DB?: {
    prepare: (query: string) => {
      bind: (...values: unknown[]) => D1Stmt;
      first: <T = Record<string, unknown>>() => Promise<T | null>;
      all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
    };
  };
  PORTAL_BOOTSTRAP_PIN?: string;
  PORTAL_JWT_SECRET?: string;
  DEFAULT_ORG_ID?: string;
  WORKERS_AI_MODEL?: string;
  AI?: {
    run: (model: string, input: Record<string, unknown>) => Promise<{ response?: string }>;
  };
};

type D1Stmt = {
  bind: (...values: unknown[]) => D1Stmt;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
};
