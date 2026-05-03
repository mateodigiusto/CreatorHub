import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("openai_not_configured");
  if (!client) client = new OpenAI({ apiKey: key });
  return client;
}

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

const MAX_BYTES = 25 * 1024 * 1024;

export async function transcribe(mediaUrl: string): Promise<string> {
  const c = getClient();
  const response = await fetch(mediaUrl);
  if (!response.ok) {
    throw new Error(`media_fetch_failed_${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_BYTES) {
    throw new Error("media_too_large_for_whisper");
  }
  const file = new File([arrayBuffer], "source.mp4", {
    type: response.headers.get("content-type") ?? "video/mp4",
  });
  const result = await c.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "text",
  });
  /* response_format=text returns a plain string in newer openai SDKs but
     historically returned `{ text }`. Handle both. */
  return typeof result === "string"
    ? result
    : ((result as { text?: string }).text ?? "");
}
