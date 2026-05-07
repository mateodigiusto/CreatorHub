/**
 * Deterministic stub script generator for the AI Script Generator.
 *
 * Production wires Claude Sonnet 4.6 (see Workstream H — `src/lib/ai/`).
 * Today, generation hashes the inputs into one of five canned scripts so
 * the UI flow (generate → review → approve → calendar) works end-to-end
 * without API keys configured.
 *
 * Swap path: replace `pickStub()` with a call to `completeJson` against
 * the script-generator prompt; the caller signature stays the same.
 */

import type { Profile } from "@/lib/onboarding/types";

export type ScriptFormat =
  | "reel" | "longform" | "vsl" | "story_sequence" | "email";

export type StubScript = {
  title: string;
  hook: string;
  setup: string;
  keyPoints: Array<{ title: string; body: string }>;
  cta: string;
  bRollNotes: string;
};

export type GenerateInput = {
  profile: Profile | null;
  platform: string;
  format: ScriptFormat;
  /** Optional source — when set, the script is "inspired by" this transcript. */
  sourceHook?: string | null;
  sourceThemes?: string[];
};

const STUBS_BY_FORMAT: Record<ScriptFormat, StubScript[]> = {
  reel: [
    {
      title: "The 3-second test that fixes 90% of your hooks",
      hook: "If your viewer can't say what your video is about in 3 seconds, you don't have a hook — you have an intro.",
      setup:
        "Most creators write hooks AFTER they finish filming. That's why they sound like throat-clearing. Here's a faster way.",
      keyPoints: [
        {
          title: "Write the hook first",
          body: "Before you film a single second, write the first 8 words. If they don't make someone stop scrolling, the rest of the video doesn't matter.",
        },
        {
          title: "Cut the warm-up",
          body: "Delete every word before the first concrete claim. Most hooks need a 4-word haircut.",
        },
        {
          title: "Test with the mute trick",
          body: "Watch your hook with the sound off. If a viewer can't tell what the video is about from the visual + caption alone, the hook is doing too much work.",
        },
      ],
      cta: "Send me your hook in the DMs and I'll tell you which of the three rules it's breaking.",
      bRollNotes:
        "Open on a phone scrolling past 3 boring videos. Cut to camera-locked face for the rule reveals. Use a stopwatch overlay during the mute trick.",
    },
    {
      title: "Why your best content gets the worst reach",
      hook: "Your best video this month probably got the worst reach. Here's the reason — and it's not the algorithm.",
      setup:
        "Reach isn't a quality signal. It's a clarity signal. Here's how to keep making your best work without burying it.",
      keyPoints: [
        {
          title: "Quality ≠ clarity",
          body: "A nuanced video on a hard topic always under-performs a sharp one on an easy topic. That's a feature of the medium, not your work.",
        },
        {
          title: "Build a 'frame' video first",
          body: "Before posting the deep one, post a 30-second framing video that gives viewers the language. Then the deep one lands.",
        },
        {
          title: "Track 'comment quality', not reach",
          body: "Reach tells you what was clear. Comments tell you what was true. Your best work shows up in the second number.",
        },
      ],
      cta: "If this changed how you think about reach — save it. You'll want to come back to it next time you post something good and feel disappointed.",
      bRollNotes:
        "Side-by-side analytics screenshots. Highlight the comment box on the 'low reach' video. End on a calm shot, no chyron.",
    },
    {
      title: "The one editing change that doubled my retention",
      hook: "I did one thing to my edits this month and watched my average retention go from 42% to 81%. Here's what.",
      setup:
        "Most editing advice is about adding cuts. This is about subtracting them.",
      keyPoints: [
        {
          title: "Stop cutting on every breath",
          body: "The average creator cuts 70% more than they need to. Viewers don't notice the breath — they notice the choppiness.",
        },
        {
          title: "Hold the eye-line",
          body: "When you cut mid-sentence, you break the viewer's spatial relationship with you. Hold the cut until the thought ends.",
        },
        {
          title: "Add ONE B-roll, not five",
          body: "Cover the abstract concept, not every concrete word. One well-placed B-roll beats six tossed in.",
        },
      ],
      cta: "Try it on your next video and DM me your retention number. I'm collecting before/afters.",
      bRollNotes:
        "Show a timeline with cut markers — first 70% of cuts highlighted red, then deleted. Time-lapse the edit process.",
    },
  ],
  longform: [
    {
      title: "How to build a content system that survives your worst week",
      hook: "Most content systems break the first time you have a bad week. Here's how to build one that doesn't.",
      setup:
        "12 minutes. We'll cover the four pillars of a system that keeps producing when you can't, and the one mistake that quietly kills every system within 90 days.",
      keyPoints: [
        {
          title: "Pillar 1: A 4-week buffer",
          body: "Always be one month ahead. The buffer is the system. Without it, you're improvising — and improvisation breaks under stress.",
        },
        {
          title: "Pillar 2: Capture > Create",
          body: "Capture sessions are 5× faster than create sessions. Spend a half-day every two weeks just talking to a camera with no edits. Edit later, in batches.",
        },
        {
          title: "Pillar 3: One person who can ship without you",
          body: "If you're the only person who can hit publish, you don't have a system — you have a job. Hand the publish step off first; it's the easiest piece to teach.",
        },
        {
          title: "Pillar 4: Weekly review, not daily review",
          body: "Daily check-ins create stress. A 30-minute Monday review is enough to course-correct without burning attention every day.",
        },
        {
          title: "The mistake: optimizing too early",
          body: "Most systems die because the operator polishes before there's volume to polish. Ship 50 imperfect things before you fix anything.",
        },
      ],
      cta: "If you're building one of these — or thinking about it — comment 'system' and I'll send you the template I use, plus the 90-day roll-out plan.",
      bRollNotes:
        "Open on a desk with a chaotic calendar. Cut to clean Notion board. Show real Loom recordings of a 4-week buffer in a content tool.",
    },
  ],
  vsl: [
    {
      title: "VSL: The Creator OS — for managers who run multiple accounts",
      hook: "If you're managing content for one or more creators and you're still living in Notion, Sheets, and DMs — you're spending half your week on logistics that should take 20 minutes.",
      setup:
        "I built CreatorHub because I watched my team manage four accounts in seven different tools. Here's what we built, who it's for, and why it cuts your weekly logistics from 12 hours to 90 minutes.",
      keyPoints: [
        {
          title: "The problem",
          body: "Content managers and editors juggle pipeline, calendar, transcripts, scripts, client comms, and reports across 5–10 disconnected tools. Half their week is context-switching.",
        },
        {
          title: "What CreatorHub is",
          body: "One operating system: pipeline + calendar + transcription engine + AI script generator + client workspaces + portfolio + outreach. All in one place. Built for the people who actually run the accounts.",
        },
        {
          title: "Who it's for",
          body: "Content managers running 1–10 accounts. Freelance editors with 3–15 clients. Small agencies. Not solo creators (yet).",
        },
        {
          title: "The proof",
          body: "Beta team of 12 cut their weekly logistics from 12 hours to 90 minutes on average. Same output, 8× less time.",
        },
        {
          title: "What you get",
          body: "Full access to every feature. Unlimited transcriptions and scripts on Pro. 7-day free trial, then $149/month. Cancel anytime.",
        },
      ],
      cta: "Click below to start your 7-day free trial. No card needed for the first 24 hours. If it doesn't save you 5+ hours in the first week, cancel and we'll refund.",
      bRollNotes:
        "Open with a chaotic Notion + Sheets + Slack split-screen. Transition to clean CreatorHub dashboard. End on the trial signup screen, framed wide.",
    },
  ],
  story_sequence: [
    {
      title: "5-slide story sequence: 'Why I stopped posting daily'",
      hook: "Slide 1 (full-frame text on dark): 'I stopped posting daily 6 months ago. My reach went UP.'",
      setup:
        "Educational story sequence. Five slides, each builds on the last. Goal: argue counter-intuitive thesis, end with 'reply with your posting frequency'.",
      keyPoints: [
        {
          title: "Slide 2",
          body: "'Daily posting trains your audience that nothing you make is a big deal. Treat every post like it matters less, and they will too.'",
        },
        {
          title: "Slide 3",
          body: "'I went from 5 posts/week to 2. Each one took 3× longer to make. Each one performed 5× better.'",
        },
        {
          title: "Slide 4",
          body: "'The math: 2 posts × 5x reach = 10x weekly reach. With 60% less time spent.'",
        },
        {
          title: "Slide 5 (CTA)",
          body: "'How many times a week do you post? Reply with the number — curious where everyone is at.'",
        },
      ],
      cta: "Reply DM with your posting frequency.",
      bRollNotes:
        "Each slide: dark navy background, single accent line in cyan, single tabular number where relevant. Tight typography. No images.",
    },
  ],
  email: [
    {
      title: "Email: 'You don't need more content. You need this.'",
      hook: "Subject: You don't need more content. You need this.",
      setup:
        "200-word email. Conversational. One idea, one CTA. Goes to the warm list (people who downloaded the free guide).",
      keyPoints: [
        {
          title: "The frame",
          body: "'Most creators trying to grow think they need more content. They don't. They need a system for the content they already make.'",
        },
        {
          title: "The proof",
          body: "'I worked with a creator last month who hadn't posted in 3 weeks. We didn't add anything to her schedule. We just took the 12 videos she'd already filmed and ran them through a system. Reach 4×'d.'",
        },
        {
          title: "The pivot",
          body: "'That system is what we built CreatorHub around. It's the difference between making content and shipping content.'",
        },
      ],
      cta: "Click here to start your 7-day free trial. (And if you're not ready, just hit reply and tell me what's blocking you. I read every one.)",
      bRollNotes: "N/A — email format.",
    },
  ],
};

/** Deterministic pick based on input fingerprint, so refreshing doesn't
 *  shuffle the demo. Real generation replaces this entire function body. */
export function generateStubScript(input: GenerateInput): StubScript {
  const pool = STUBS_BY_FORMAT[input.format] ?? STUBS_BY_FORMAT.reel;
  const seed =
    (input.profile?.creatorType ?? "x") +
    input.platform +
    input.format +
    (input.sourceHook ?? "") +
    (input.sourceThemes ?? []).join(",");
  const idx = hash(seed) % pool.length;
  return pool[idx];
}

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
