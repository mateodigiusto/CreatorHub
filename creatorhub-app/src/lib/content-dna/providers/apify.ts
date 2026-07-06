import { ApifyClient } from "apify-client";

let client: ApifyClient | null = null;

function getClient(): ApifyClient {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("apify_not_configured");
  if (!client) client = new ApifyClient({ token });
  return client;
}

export function isApifyConfigured(): boolean {
  return !!process.env.APIFY_API_TOKEN;
}

/**
 * Run an actor synchronously and return its dataset items.
 *
 * Memory + timeout bounds keep a runaway scrape from draining usage credits.
 * Defaults: 512 MB / 120 s — enough for a single-URL fetch on the lightweight
 * scrapers we use (Instagram / TikTok / YouTube post-detail).
 */
export async function runActor<T>(
  actorId: string,
  input: object,
  options: { memoryMbytes?: number; timeoutSecs?: number } = {},
): Promise<T[]> {
  const c = getClient();
  const run = await c.actor(actorId).call(input, {
    memory: options.memoryMbytes ?? 512,
    timeout: options.timeoutSecs ?? 120,
  });
  const { items } = await c.dataset(run.defaultDatasetId).listItems();
  return items as T[];
}
