import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { AppEnv } from "@/lib/env";

export async function getEnv(): Promise<AppEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env as AppEnv;
}
