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
};

type D1Stmt = {
  bind: (...values: unknown[]) => D1Stmt;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
};
