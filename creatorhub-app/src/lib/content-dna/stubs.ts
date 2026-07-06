/**
 * Deterministic stub library for the Content DNA Engine.
 *
 * Production wires real LLM transcription + analysis. Today, a paste of any
 * URL hashes into one of five canned analyses. Each stub is plausible enough
 * to demo the flow without being obviously the same thing twice in a row.
 *
 * When real AI lands, replace `pickStub()` with a call to the analyze
 * pipeline; the caller signature stays the same.
 */

import type {
  AnalysisVariations,
  StructureBeat,
  WhyItWorked,
  SourcePlatform,
  ScriptShot,
} from "./types";

export type StubAnalysis = {
  sourceTitle: string;
  sourceCreator: string;
  sourceThumbnail: string;   // CSS gradient string (matches Sequence Studio convention)
  transcriptionExcerpt: string;
  hook: string;
  structure: StructureBeat[];
  whyItWorked: WhyItWorked;
  variations: AnalysisVariations;
};

const STUBS: StubAnalysis[] = [
  {
    sourceTitle: "I tried being broke for 30 days",
    sourceCreator: "@andrew.markov",
    sourceThumbnail: "linear-gradient(135deg,#0F172A,#3B82F6)",
    transcriptionExcerpt:
      "Day 1 — I deleted every app on my phone except notes. Day 7 — I realized I'd been buying $40 lunches because I was bored, not hungry. Day 21 — my savings rate hit 62%. Here's what 30 days of doing nothing taught me about everything…",
    hook: "I tried being broke for 30 days. Here's what it actually cost me.",
    structure: [
      { name: "Hook", timestamp: "0:00–0:06", description: "Bold transformation claim + counter-intuitive premise." },
      { name: "Stakes", timestamp: "0:06–0:18", description: "Personal cost — what they gave up to make it real." },
      { name: "Day-by-day", timestamp: "0:18–0:48", description: "Three specific milestone days, each with one number." },
      { name: "Insight", timestamp: "0:48–1:12", description: "The lesson you didn't expect — reframes the whole story." },
      { name: "CTA", timestamp: "1:12–1:25", description: "Soft ask: try one rule for 7 days." },
    ],
    whyItWorked: {
      hook_psychology: "Curiosity gap on cost — viewer assumes 'broke' means money, but the cost is something else.",
      retention_triggers: "Specific dollar amounts every 8–10 seconds. Numbers anchor attention better than adjectives.",
      emotional_pattern: "Discomfort → revelation → calm. Resolves on a quiet insight, not a big reveal.",
      story_structure: "Three-act with a 'twist on the noun' — the word 'broke' redefines mid-video.",
    },
    variations: {
      hooks: [
        "I tracked every dollar for 30 days. The boring ones surprised me.",
        "30 days of saying no to spending. Day 21 broke me — but not how you'd think.",
        "I went broke on purpose. Here's what it taught me about being rich.",
      ],
      angles: [
        "Frugality as identity reset, not deprivation.",
        "What discretionary spending actually buys you (hint: not what you think).",
        "The 7-day rule you can steal without doing the full 30.",
      ],
      titles: [
        "I tried being broke for 30 days",
        "30 days, $0 spent on want — what I learned",
        "The real cost of going broke for a month",
      ],
    },
  },

  {
    sourceTitle: "Why your morning routine isn't working",
    sourceCreator: "@kavya.health",
    sourceThumbnail: "linear-gradient(135deg,#0F766E,#14B8A6)",
    transcriptionExcerpt:
      "If you wake up and immediately do four 'productive' things, you're not building a routine — you're stacking obligations. Here's what nobody tells you about morning routines: the first 90 seconds matter more than the first 90 minutes…",
    hook: "Your morning routine is broken. The first 90 seconds tell you why.",
    structure: [
      { name: "Hook", timestamp: "0:00–0:08", description: "Pattern-interrupt — most morning advice is wrong." },
      { name: "Common mistake", timestamp: "0:08–0:22", description: "Names the specific behavior most viewers recognize doing." },
      { name: "Reframe", timestamp: "0:22–0:42", description: "The rule that actually matters, in one sentence." },
      { name: "Demo", timestamp: "0:42–1:05", description: "Walks through her own first 90 seconds, on camera." },
      { name: "Permission", timestamp: "1:05–1:20", description: "Lets the viewer keep one thing they were doing wrong." },
    ],
    whyItWorked: {
      hook_psychology: "Attacks a behavior the viewer is doing right now — almost forces a self-check.",
      retention_triggers: "Promise of a specific number (90 seconds) — viewers wait to see what it is.",
      emotional_pattern: "Mild shame → relief. Fixes the shame she just induced before the viewer leaves.",
      story_structure: "Diagnose → reframe → permission. The permission step is what makes it shareable.",
    },
    variations: {
      hooks: [
        "If your morning routine takes more than 90 seconds, you're doing it wrong.",
        "I had a 5am routine for 4 years. It was making me worse. Here's what fixed it.",
        "Stop trying to optimize your morning. Optimize the first 90 seconds instead.",
      ],
      angles: [
        "The first 90 seconds as a leverage window — small change, big compounding.",
        "Why 'productive morning' framing is the actual problem.",
        "Permission-giving content as a retention strategy.",
      ],
      titles: [
        "Your morning routine is broken (and why 90 seconds fixes it)",
        "The 90-second morning rule",
        "Stop optimizing your morning. Do this instead.",
      ],
    },
  },

  {
    sourceTitle: "How I got 47 inbound DMs in one week",
    sourceCreator: "@danielsells",
    sourceThumbnail: "linear-gradient(135deg,#7C2D12,#F59E0B)",
    transcriptionExcerpt:
      "47 DMs in one week. No ads, no funnel hacks. Just one post structure that I've been quietly running for six months. I'm going to walk you through it — and then I'm going to show you the exact post that did it…",
    hook: "47 inbound DMs in one week. Here's the post that did it.",
    structure: [
      { name: "Hook + receipt", timestamp: "0:00–0:08", description: "Specific number + screenshot proof." },
      { name: "Setup", timestamp: "0:08–0:20", description: "What he was doing before — context for the change." },
      { name: "The structure", timestamp: "0:20–0:55", description: "Four-part post template, in order." },
      { name: "Live example", timestamp: "0:55–1:30", description: "Pulls up the actual post and reads it line by line." },
      { name: "CTA + soft ask", timestamp: "1:30–1:45", description: "Reply with 'POST' to get the template." },
    ],
    whyItWorked: {
      hook_psychology: "Number specificity (47, not 'a lot') is the credibility signal — viewers test you against round numbers.",
      retention_triggers: "Promise of 'the actual post' creates a payoff window — viewers stay to see it.",
      emotional_pattern: "Curiosity → validation → action. Ends on a low-effort yes (DM keyword).",
      story_structure: "Receipt-first storytelling — proves the outcome before explaining the method.",
    },
    variations: {
      hooks: [
        "I got 47 DMs in 7 days from one post structure. Here it is.",
        "One post template. 47 inbound leads. Six months of quiet testing.",
        "Stop posting more. Post like this instead — it got me 47 DMs last week.",
      ],
      angles: [
        "Receipt-first content (lead with the number, then teach).",
        "DM-keyword CTA as a low-friction conversion mechanism.",
        "Structure-over-creativity framing — repeatable beats novel.",
      ],
      titles: [
        "How I got 47 DMs in one week (and the exact post)",
        "The 4-part post structure that brings me weekly inbound",
        "47 DMs from one post. Here's what it looked like.",
      ],
    },
  },

  {
    sourceTitle: "Why I'm taking my fees public",
    sourceCreator: "@inkbyrosa",
    sourceThumbnail: "linear-gradient(135deg,#312E81,#6366F1)",
    transcriptionExcerpt:
      "I get asked the same question every Tuesday. 'How much?' And every Tuesday I send the same DM. I'm done — here's the full pricing sheet. The flat fee, what it covers, what it doesn't. Save it, share it, pin it to your fridge…",
    hook: "I'm taking my fees public. Here's exactly what every piece costs — and why.",
    structure: [
      { name: "Hook", timestamp: "0:00–0:07", description: "Bold transparency move + universal question." },
      { name: "Why now", timestamp: "0:07–0:20", description: "The repeating-DM problem — relatable for any service business." },
      { name: "Pricing reveal", timestamp: "0:20–0:50", description: "Walks through the actual sheet on screen." },
      { name: "What's not included", timestamp: "0:50–1:10", description: "Pre-empts negotiation. Calm tone." },
      { name: "Soft close", timestamp: "1:10–1:25", description: "Booking link + 'no haggling' policy." },
    ],
    whyItWorked: {
      hook_psychology: "Transparency as differentiation — most peers in her niche won't post fees publicly.",
      retention_triggers: "Promise to show 'the actual sheet' creates a stay-for-the-payoff hook.",
      emotional_pattern: "Frustration (with herself) → calm authority. Models the exact tone she wants clients to use.",
      story_structure: "Vulnerability framing → educational reveal → policy statement. Hard to argue with.",
    },
    variations: {
      hooks: [
        "I'm done answering 'how much?' in the DMs. Here's the public sheet.",
        "Why I just made my pricing public — and you should too.",
        "Public pricing is the new portfolio. Here's mine.",
      ],
      angles: [
        "Public pricing as a content-creation engine (one post answers 50 DMs).",
        "Transparency as filter — the right clients self-qualify.",
        "Calm tone as a sales tool.",
      ],
      titles: [
        "I'm taking my pricing public",
        "Public pricing: why and what it actually costs you",
        "Public pricing is the new portfolio",
      ],
    },
  },

  {
    sourceTitle: "The listing nobody wanted",
    sourceCreator: "@samirealty",
    sourceThumbnail: "linear-gradient(135deg,#0F172A,#94A3B8)",
    transcriptionExcerpt:
      "This listing sat for 94 days. Nine open houses, zero offers. I told the owners we needed to do one thing — not stage it again, not drop the price. One thing. Three weeks later: closed, full ask. Here's what we changed…",
    hook: "94 days on the market. Three weeks later, closed at full ask. Here's the one thing.",
    structure: [
      { name: "Hook", timestamp: "0:00–0:08", description: "Specific timeline + transformation outcome." },
      { name: "What didn't work", timestamp: "0:08–0:22", description: "Lists the obvious moves that everyone tries first." },
      { name: "The diagnosis", timestamp: "0:22–0:45", description: "What he actually saw walking the property cold." },
      { name: "The fix", timestamp: "0:45–1:10", description: "The one change — visualized with before/after." },
      { name: "Lesson", timestamp: "1:10–1:30", description: "The rule that travels to other listings." },
    ],
    whyItWorked: {
      hook_psychology: "Timeline-based promise — viewers want to know if the rule applies to their stuck listing.",
      retention_triggers: "Withholds the 'one thing' until 0:45. Most viewers stay through the diagnosis.",
      emotional_pattern: "Sympathy (94 days = pain) → curiosity → satisfaction. Pays off the patience.",
      story_structure: "Case-study format with one rule. Shareable because the rule is portable.",
    },
    variations: {
      hooks: [
        "94 days. 9 opens. Zero offers. Here's the one thing that closed it.",
        "The listing nobody wanted — closed at full ask, three weeks later.",
        "I sold the unsellable listing in 21 days. Not by dropping the price.",
      ],
      angles: [
        "Diagnosis-first storytelling — the agent as detective.",
        "One-thing framing as a content rule (one rule per video).",
        "Case-study video as authority builder for service businesses.",
      ],
      titles: [
        "The listing nobody wanted (and the one thing that closed it)",
        "94 days to 21 days — what we changed",
        "How I sold the unsellable listing",
      ],
    },
  },
];

/* Cheap deterministic hash — same URL → same stub. */
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function pickStub(url: string): StubAnalysis {
  return STUBS[hashCode(url) % STUBS.length];
}

export function detectPlatform(url: string): SourcePlatform {
  const u = url.toLowerCase().trim();
  /* Cover m.youtube.com, music.youtube.com, youtube-nocookie.com, youtu.be — and shorts. */
  if (
    u.includes("youtube.com") ||
    u.includes("youtu.be") ||
    u.includes("youtube-nocookie.com")
  ) {
    return "youtube";
  }
  /* Cover instagram.com, www.instagram.com, m.instagram.com — reels, posts, stories. */
  if (u.includes("instagram.com")) return "instagram";
  /* Cover tiktok.com, vm.tiktok.com, www.tiktok.com, vt.tiktok.com. */
  if (u.includes("tiktok.com")) return "tiktok";
  return "other";
}

/* Normalize a pasted URL. Adds https:// if missing, strips common tracking
   params (utm_*, fbclid, gclid, igshid, si=…), trims whitespace + quotes,
   lowercases the host. Same canonical input always produces the same hash
   in pickStub() — important for the "dupe detect" feature. */
export function canonicalizeUrl(raw: string): string | null {
  let s = raw.trim().replace(/^["'\s]+|["'\s]+$/g, "");
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) {
    /* If it looks like a hostname, add https://. Otherwise reject. */
    if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(s)) {
      s = `https://${s}`;
    } else {
      return null;
    }
  }
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  url.host = url.host.toLowerCase();
  /* Strip junk params. Keep `v` (YouTube), `t`/`time_continue` (timestamps),
     and platform-essential ones; drop everything else that smells like tracking. */
  const drop = [
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "fbclid", "gclid", "igshid", "si", "feature", "ref_src", "ref_url",
    "_t", "is_from_webapp", "sender_device", "sender_web_id",
  ];
  for (const p of drop) url.searchParams.delete(p);
  /* Trim trailing slash on the path for stable hashing. */
  if (url.pathname.endsWith("/") && url.pathname !== "/") {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

/* Stub script generator — combines the analysis structure with the user's
   angle/audience/tone. Reads as Mad Libs but believable enough to demo.
   Replace with a real LLM call once available. */
export function buildStubScript(args: {
  hook: string;
  structure: StructureBeat[];
  angle: string;
  audience: string;
  tone: string;
}): { script: string; hooks: string[]; shots: ScriptShot[]; captions: string[] } {
  const { hook, structure, angle, audience, tone } = args;
  const angleClean = angle.trim() || "your angle";
  const audienceClean = audience.trim() || "your audience";
  const toneClean = tone.trim() || "direct";

  const intro = `[${toneClean.toUpperCase()} OPENER, 0:00–0:08]\n${hook}\n\n`;

  const beatLines = structure
    .map((b, i) => {
      const whatToSay =
        i === 0
          ? `Open with the hook above. Camera tight, eye-level. Beat the viewer to the obvious counter-argument.`
          : i === structure.length - 1
            ? `Soft CTA aimed at ${audienceClean}: reply with one keyword to get the resource.`
            : `Build on "${angleClean}" — one specific number, one personal moment.`;
      return `[${b.name.toUpperCase()}, ${b.timestamp}]\n${b.description}\n→ ${whatToSay}\n`;
    })
    .join("\n");

  const script = intro + beatLines;

  const hooks = [
    hook,
    `If you're ${audienceClean.toLowerCase()}, this is the post that gets read twice.`,
    `${angleClean} — and the receipts to back it up.`,
  ];

  const shots: ScriptShot[] = structure.map((b) => ({
    description: `${b.name}: ${b.description}`,
    duration_seconds: 8,
  }));

  const captions = [
    `${hook}\n\nFor ${audienceClean.toLowerCase()} who are tired of vague advice. Save this.`,
    `${angleClean}.\n\nSpecifics in the video — DM "${(angleClean.split(/\s+/)[0] ?? "INFO").toUpperCase()}" for the full breakdown.`,
    `One post. One ${toneClean} idea. Built around ${audienceClean.toLowerCase()}.\n\nWatch the breakdown.`,
  ];

  return { script, hooks, shots, captions };
}
