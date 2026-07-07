/**
 * Demo-grade natural-language command parser for the AI assistant.
 *
 * This is NOT a real LLM — it's a deterministic intent parser that recognises
 * a handful of business actions ("onboard this client…", "log a payment…",
 * "remove X…", "add a task…") and extracts their fields, so a typed command
 * can drive the same store actions the UI does. It's structured so a real
 * Claude call could later replace `parseCommand` and return the same shape.
 *
 * Pure + framework-free so it's easy to reason about and swap out.
 */

export type ClientStatusHint = "active" | "onboarding" | "paused";

export type AiAction =
  | {
      kind: "add_client";
      name: string;
      retainer?: number;
      startDate?: string; // ISO
      status: ClientStatusHint;
    }
  | { kind: "remove_client"; name: string }
  | { kind: "pause_client"; name: string }
  | { kind: "log_payment"; name?: string; amount: number; note?: string }
  | {
      kind: "add_task";
      title: string;
      client?: string;
    }
  | { kind: "unknown"; reason: string };

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8,
  sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11,
  december: 11,
};

/** Extract a dollar amount. Handles "$1,500", "1500", "1.5k", "2k". */
export function extractAmount(text: string): number | undefined {
  const t = text.toLowerCase();
  // $-prefixed or k-suffixed first (most explicit)
  let m =
    t.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(k)?/) ||
    t.match(/([\d,]+(?:\.\d+)?)\s*k\b/) ||
    t.match(/(?:price|retainer|fee|for|at|is|of)\s*(?:is\s*)?\$?\s*([\d,]+(?:\.\d+)?)\s*(k)?/) ||
    t.match(/([\d,]+(?:\.\d+)?)\s*(?:\/\s*mo|per month|a month|monthly|\/month)/);
  if (!m) m = t.match(/\b([\d,]{3,}(?:\.\d+)?)\b/); // bare 3+ digit number
  if (!m) return undefined;
  const n = parseFloat(m[1].replace(/,/g, ""));
  if (Number.isNaN(n)) return undefined;
  const isK = /k/.test(m[2] ?? "") || /k\b/.test(m[0]);
  return Math.round(isK ? n * 1000 : n);
}

/** Extract a start date → ISO at noon. Handles today/tomorrow, ISO, "July 8". */
export function extractDate(text: string): string | undefined {
  const t = text.toLowerCase();
  const noon = (d: Date) => {
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
  };
  if (/\btoday\b/.test(t)) return noon(new Date());
  if (/\btomorrow\b/.test(t)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return noon(d);
  }
  const iso = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (!Number.isNaN(d.getTime())) return noon(d);
  }
  // "July 8", "Aug 1st", "on the 8th of July"
  const md =
    t.match(/([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?/) ||
    t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]{3,9})/);
  if (md) {
    const monthName = MONTHS[md[1]] !== undefined ? md[1] : md[2];
    const dayStr = MONTHS[md[1]] !== undefined ? md[2] : md[1];
    const month = MONTHS[monthName];
    const day = Number(dayStr);
    if (month !== undefined && day >= 1 && day <= 31) {
      const now = new Date();
      let year = now.getFullYear();
      const cand = new Date(year, month, day);
      // If the date is well in the past, assume they mean next year.
      if (cand.getTime() < now.getTime() - 180 * 86400000) year += 1;
      return noon(new Date(year, month, day));
    }
  }
  return undefined;
}

const NAME_STOP =
  /\b(at|for|with|price|retainer|fee|starting|start|from|status|active|onboarding|paused|per|monthly|a month|and|the)\b|[,.;:$]|\d/;

function cleanName(raw: string | undefined): string {
  if (!raw) return "";
  let s = raw.trim().replace(/^(a|an|the|this|new)\s+/i, "");
  // Cut at the first stop word / delimiter.
  const stop = s.search(NAME_STOP);
  if (stop > 0) s = s.slice(0, stop);
  return s.replace(/["'“”]/g, "").trim().replace(/\s+/g, " ");
}

/** Pull a client name out of the phrasing (for new clients). */
function extractNewName(text: string): string {
  const quoted = text.match(/["'“”]([^"'“”]{2,50})["'“”']?/);
  if (quoted) return cleanName(quoted[1]);
  const labeled = text.match(/\bname(?:'s|d| is|:|=)?\s+([A-Za-z][\w&.\- ]{1,50})/i);
  if (labeled) return cleanName(labeled[1]);
  const called = text.match(/\b(?:called|named)\s+([A-Za-z][\w&.\- ]{1,50})/i);
  if (called) return cleanName(called[1]);
  const onboard = text.match(
    /\b(?:onboard|on-board|add|create|new)\s+(?:a\s+)?(?:client\s+)?(?:this\s+client[,.\s]+)?([A-Za-z][\w&.\- ]{1,50})/i,
  );
  if (onboard) {
    const n = cleanName(onboard[1]);
    if (n.toLowerCase() !== "client") return n;
  }
  return "";
}

/** Find an existing client's name mentioned anywhere in the text. */
function findKnownName(text: string, known: string[]): string | undefined {
  const lower = text.toLowerCase();
  // Longest match first so "June Launch" beats "June".
  const sorted = [...known].sort((a, b) => b.length - a.length);
  return sorted.find((n) => lower.includes(n.toLowerCase()));
}

/**
 * Parse a command. `knownClients` lets remove/pause/payment intents resolve a
 * name by scanning for existing clients (robust to loose phrasing).
 */
export function parseCommand(
  input: string,
  knownClients: string[] = [],
): AiAction {
  const text = input.trim();
  if (!text) return { kind: "unknown", reason: "Type a command first." };
  const t = text.toLowerCase();

  const mentions = (re: RegExp) => re.test(t);

  /* ---- remove / offboard a client ---- */
  if (
    mentions(/\b(remove|offboard|off-board|delete|drop)\b/) &&
    !mentions(/\btask\b/)
  ) {
    const name =
      findKnownName(text, knownClients) ??
      cleanName(
        text.match(
          /\b(?:remove|offboard|off-board|delete|drop)\s+(?:client\s+)?([A-Za-z][\w&.\- ]{1,50})/i,
        )?.[1],
      );
    if (!name)
      return {
        kind: "unknown",
        reason: "Which client should I remove? Try 'Remove Nord Coffee'.",
      };
    return { kind: "remove_client", name };
  }

  /* ---- pause a client ---- */
  if (mentions(/\bpause\b/) || (mentions(/\bput\b/) && mentions(/\bon hold\b/))) {
    const name = findKnownName(text, knownClients) ?? cleanName(
      text.match(/\bpause\s+(?:client\s+)?([A-Za-z][\w&.\- ]{1,50})/i)?.[1],
    );
    if (!name) return { kind: "unknown", reason: "Which client should I pause?" };
    return { kind: "pause_client", name };
  }

  /* ---- log a payment ---- */
  if (
    mentions(/\b(log|record|add|got|received|receive|invoice|collected|paid)\b/) &&
    (mentions(/\bpayment\b/) || mentions(/\$/) || mentions(/\bpaid\b/)) &&
    !mentions(/\bclient\b.*\b(onboard|add|new|create)\b/) &&
    !mentions(/\b(onboard|on-board)\b/)
  ) {
    const amount = extractAmount(text);
    if (amount) {
      const name = findKnownName(text, knownClients);
      const noteM = text.match(/\b(?:for|note|memo)\s+([^,.]{3,60})/i);
      const note =
        noteM && !MONTHS[noteM[1].trim().toLowerCase().split(" ")[0]]
          ? cleanNote(noteM[1])
          : undefined;
      return { kind: "log_payment", name, amount, note };
    }
  }

  /* ---- add a task ---- */
  if (mentions(/\b(add|create|new|make)\b/) && mentions(/\btask\b/)) {
    const titleM =
      text.match(/\btask\s+(?:to\s+|for\s+|:\s*)?([^,.]{3,80})/i) ||
      text.match(/["'“”]([^"'“”]{3,80})["'“”]/);
    const client = findKnownName(text, knownClients);
    const title = cleanNote(titleM?.[1] ?? "New task");
    return { kind: "add_task", title, client };
  }

  /* ---- onboard / add a client ---- */
  if (mentions(/\b(onboard|on-board)\b/) || (mentions(/\b(add|create|new)\b/) && mentions(/\bclient\b/))) {
    const name = extractNewName(text);
    if (!name) return { kind: "unknown", reason: "What's the client's name? Try 'Onboard Nord Coffee at $1,500/mo starting July 8'." };
    const retainer = extractAmount(text);
    const startDate = extractDate(text);
    const status: ClientStatusHint = mentions(/\bactive\b/) ? "active" : "onboarding";
    return { kind: "add_client", name, retainer, startDate, status };
  }

  return {
    kind: "unknown",
    reason:
      "I can onboard a client, log a payment, pause or remove a client, or add a task. Try: “Onboard Nord Coffee at $1,500/mo starting July 8”.",
  };
}

function cleanNote(s: string): string {
  return s
    .trim()
    .replace(/^(to|for|:)\s+/i, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}
