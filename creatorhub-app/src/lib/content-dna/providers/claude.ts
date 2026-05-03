import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("anthropic_not_configured");
  if (!client) client = new Anthropic({ apiKey: key });
  return client;
}

export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function completeJson<T>(args: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<T> {
  const c = getClient();
  const response = await c.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: args.maxTokens ?? 4096,
    system: args.system,
    messages: [{ role: "user", content: args.prompt }],
  });
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  /* Models occasionally wrap JSON in ```json fences despite the system
     instruction. Strip if present, then parse. */
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(
      `claude_json_parse_failed: ${err instanceof Error ? err.message : "unknown"} — raw: ${cleaned.slice(0, 200)}`,
    );
  }
}
