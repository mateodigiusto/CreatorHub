export type AssetKind =
  | "photo"
  | "video"
  | "proof"
  | "screenshot"
  | "testimonial";

export type Asset = {
  id: string;
  title: string;
  kind: AssetKind;
  gradient: string;
  mood: string;
  scene: string;
  aestheticScore: number;
  tags: string[];
  recommendedUse: string;
  /* Seconds — required when kind === "video". */
  duration?: number;
  /* Object URL or remote URL. Optional: gradient renders when absent. */
  src?: string;
};

/* Sequence Studio rule: videos longer than this can live in the Library
   but cannot be added to a sequence. */
export const MAX_VIDEO_SECONDS = 15;

export function isVideoUsableInSequence(a: Asset): boolean {
  return a.kind !== "video" || (a.duration ?? 0) <= MAX_VIDEO_SECONDS;
}

/* Diversified gradients (warm / cool / grayscale / brand) so the asset grid
   doesn't read as one homogeneous swatch. */
export const sampleAssets: Asset[] = [
  {
    id: "a1",
    title: "Founder portrait",
    kind: "photo",
    gradient: "linear-gradient(135deg,#0B1220,#2563EB)",
    mood: "Confident",
    scene: "Studio · personal brand",
    aestheticScore: 8.4,
    tags: ["founder-led", "authority", "personal brand"],
    recommendedUse: "Hook or credibility slide",
  },
  {
    id: "a2",
    title: "Stripe receipt",
    kind: "proof",
    gradient: "linear-gradient(135deg,#0F766E,#14B8A6)",
    mood: "Proof",
    scene: "Revenue · business result",
    aestheticScore: 7.9,
    tags: ["proof", "result", "sales"],
    recommendedUse: "Proof or CTA slide",
  },
  {
    id: "a3",
    title: "Laptop work session",
    kind: "photo",
    gradient: "linear-gradient(135deg,#1F2937,#475569)",
    mood: "Focused",
    scene: "Work · behind the scenes",
    aestheticScore: 8.1,
    tags: ["building", "discipline", "BTS"],
    recommendedUse: "Context slide",
  },
  {
    id: "a4",
    title: "Client DM screenshot",
    kind: "testimonial",
    gradient: "linear-gradient(135deg,#312E81,#6366F1)",
    mood: "Validation",
    scene: "Client message",
    aestheticScore: 7.2,
    tags: ["testimonial", "social proof"],
    recommendedUse: "Proof slide",
  },
  {
    id: "a5",
    title: "Lifestyle / cafe",
    kind: "photo",
    gradient: "linear-gradient(135deg,#FCD34D,#F59E0B)",
    mood: "Calm",
    scene: "Lifestyle · cafe",
    aestheticScore: 8.6,
    tags: ["lifestyle", "soft"],
    recommendedUse: "Pattern interrupt slide",
  },
  {
    id: "a6",
    title: "Analytics screenshot",
    kind: "screenshot",
    gradient: "linear-gradient(135deg,#1D4ED8,#3B82F6)",
    mood: "Data",
    scene: "Insights dashboard",
    aestheticScore: 7.5,
    tags: ["data", "insight", "results"],
    recommendedUse: "Insight slide",
  },
  {
    id: "a7",
    title: "Workshop room",
    kind: "photo",
    gradient: "linear-gradient(135deg,#7C2D12,#EA580C)",
    mood: "Energy",
    scene: "Event · group",
    aestheticScore: 8.0,
    tags: ["event", "community", "authority"],
    recommendedUse: "Authority slide",
  },
  {
    id: "a8",
    title: "Before / after metric",
    kind: "proof",
    gradient: "linear-gradient(135deg,#0F172A,#94A3B8)",
    mood: "Transformation",
    scene: "Before / after card",
    aestheticScore: 8.2,
    tags: ["proof", "transformation", "result"],
    recommendedUse: "Proof or insight slide",
  },
  {
    id: "a9",
    title: "Morning light desk",
    kind: "photo",
    gradient: "linear-gradient(135deg,#FDE68A,#F97316)",
    mood: "Warm",
    scene: "Workspace · golden hour",
    aestheticScore: 8.7,
    tags: ["lifestyle", "warm", "morning"],
    recommendedUse: "Pattern interrupt or context slide",
  },
  {
    id: "a10",
    title: "Whiteboard frame",
    kind: "photo",
    gradient: "linear-gradient(135deg,#0F766E,#22D3EE)",
    mood: "Teaching",
    scene: "Studio · teaching",
    aestheticScore: 7.8,
    tags: ["teaching", "framework"],
    recommendedUse: "Insight slide",
  },
  {
    id: "a11",
    title: "Studio backdrop",
    kind: "photo",
    gradient: "linear-gradient(135deg,#581C87,#A855F7)",
    mood: "Premium",
    scene: "Brand portrait",
    aestheticScore: 8.5,
    tags: ["premium", "brand", "portrait"],
    recommendedUse: "Authority slide",
  },
  {
    id: "a12",
    title: "Calm rooftop",
    kind: "photo",
    gradient: "linear-gradient(135deg,#FBBF24,#DC2626)",
    mood: "Reflective",
    scene: "Outdoor · sunset",
    aestheticScore: 8.3,
    tags: ["lifestyle", "reflective", "outdoor"],
    recommendedUse: "Pattern interrupt slide",
  },
  {
    id: "v1",
    title: "Talking head — hook",
    kind: "video",
    gradient: "linear-gradient(135deg,#1E293B,#3B82F6)",
    mood: "Confident",
    scene: "Talking head · 4:5",
    aestheticScore: 8.4,
    tags: ["talking head", "hook", "studio"],
    recommendedUse: "Hook slide",
    duration: 6,
  },
  {
    id: "v2",
    title: "B-roll — keyboard typing",
    kind: "video",
    gradient: "linear-gradient(135deg,#0F172A,#475569)",
    mood: "Focused",
    scene: "B-roll · BTS",
    aestheticScore: 7.9,
    tags: ["b-roll", "BTS", "typing"],
    recommendedUse: "Context slide",
    duration: 9,
  },
  {
    id: "v3",
    title: "Walk-and-talk clip",
    kind: "video",
    gradient: "linear-gradient(135deg,#7C2D12,#F59E0B)",
    mood: "Energetic",
    scene: "Outdoor · walking",
    aestheticScore: 8.0,
    tags: ["walk-and-talk", "energetic"],
    recommendedUse: "Insight slide",
    duration: 12,
  },
  {
    id: "v4",
    title: "Whiteboard reveal",
    kind: "video",
    gradient: "linear-gradient(135deg,#064E3B,#10B981)",
    mood: "Teaching",
    scene: "Whiteboard · reveal",
    aestheticScore: 8.1,
    tags: ["teaching", "reveal"],
    recommendedUse: "Insight or proof slide",
    duration: 14,
  },
  {
    id: "v5",
    title: "Long-form workshop clip",
    kind: "video",
    gradient: "linear-gradient(135deg,#0B1220,#6366F1)",
    mood: "Authority",
    scene: "Workshop · stage",
    aestheticScore: 8.2,
    tags: ["workshop", "long-form", "authority"],
    recommendedUse: "Trim before using in a sequence",
    duration: 22,
  },
];

export type SequenceType = "cta" | "educational" | "authority" | "bts" | "sales";
export const sequenceTypes: { key: SequenceType; label: string }[] = [
  { key: "cta", label: "CTA" },
  { key: "educational", label: "Educational" },
  { key: "authority", label: "Authority" },
  { key: "bts", label: "Behind the scenes" },
  { key: "sales", label: "Sales" },
];

export type SequenceStyle =
  | "raw"
  | "premium"
  | "founder"
  | "client-result"
  | "didactic";
export const sequenceStyles: { key: SequenceStyle; label: string }[] = [
  { key: "raw", label: "Raw & real" },
  { key: "premium", label: "Premium minimal" },
  { key: "founder", label: "Founder story" },
  { key: "client-result", label: "Client result" },
  { key: "didactic", label: "Teaching" },
];

export type SequenceGoal =
  | "dms"
  | "authority"
  | "warmup"
  | "sell"
  | "proof"
  | "educate";
export const sequenceGoals: { key: SequenceGoal; label: string }[] = [
  { key: "dms", label: "Get DMs" },
  { key: "authority", label: "Build authority" },
  { key: "warmup", label: "Warm up audience" },
  { key: "sell", label: "Sell offer" },
  { key: "proof", label: "Share proof" },
  { key: "educate", label: "Educate" },
];

export type SlidePurpose = "Hook" | "Context" | "Proof" | "Insight" | "CTA";

export type GeneratedSlide = {
  id: string;
  assetId: string;
  overlay: string;
  purpose: SlidePurpose;
  reason: string;
  /* Increments each time the slide is regenerated — used to rotate copy variants. */
  variant: number;
  locked: boolean;
};

export type GeneratedSequence = {
  id: string;
  title: string;
  goal: SequenceGoal;
  type: SequenceType;
  style: SequenceStyle;
  slides: GeneratedSlide[];
};

/* ─── Personas ────────────────────────────────────────────────────────
   Each persona has its own brand context + 2 copy variants per
   (goal, purpose) cell. Variant rotation drives Regenerate-slide.
   ──────────────────────────────────────────────────────────────────── */

export type PersonaKey =
  | "coach"
  | "tattoo"
  | "realestate"
  | "fitness"
  | "agency";

type PersonaData = {
  label: string;
  brandContext: { who: string; audience: string; tone: string; cta: string };
  titleByGoal: Record<SequenceGoal, string>;
  copyByGoal: Record<SequenceGoal, Record<SlidePurpose, [string, string]>>;
};

export const personas: Record<PersonaKey, PersonaData> = {
  coach: {
    label: "Online coach",
    brandContext: {
      who: "I help online coaches build content systems that turn educational content into sales calls.",
      audience: "Solo coaches, course creators, agency founders.",
      tone: "Direct, clear, founder-led. Premium. Not hypey.",
      cta: "DM keyword or book a call.",
    },
    titleByGoal: {
      dms: "Why your content isn't converting",
      authority: "What 90 days of content actually taught me",
      warmup: "Most creators never see this part",
      sell: "The system behind the offer",
      proof: "Real numbers. Real DMs. Real proof.",
      educate: "The 3 signals that change everything",
    },
    copyByGoal: {
      dms: {
        Hook: [
          "Most creators aren't losing because of bad ideas.",
          "Your content isn't the problem. Your structure is.",
        ],
        Context: [
          "They're losing because their content has no system behind it.",
          "Posts without a system are random reach, not predictable conversations.",
        ],
        Proof: [
          "When we tracked what actually drove DMs, the winning formats became obvious.",
          "Across 90 days, 4 formats drove 78% of total inbound DMs.",
        ],
        Insight: [
          "Educational authority posts drove 2.3× more conversations than lifestyle.",
          "Authority + a single keyword CTA is the highest-converting pair we've seen.",
        ],
        CTA: [
          "DM 'SYSTEM' and I'll send you the framework.",
          "Reply 'SYSTEM' — I'll send the breakdown today.",
        ],
      },
      authority: {
        Hook: [
          "I posted every day for 90 days. Here's what actually moved the needle.",
          "Volume isn't authority. Signal is.",
        ],
        Context: [
          "The volume didn't matter. The signal did.",
          "Three out of every ten posts carried the entire account.",
        ],
        Proof: [
          "Three Reels carried 64% of total reach.",
          "The top 5 posts produced more reach than the next 60 combined.",
        ],
        Insight: [
          "The pattern: a sub-2s hook + a clear receipt + an explicit CTA.",
          "Hook → proof → CTA. Three beats. Every winning post had all three.",
        ],
        CTA: [
          "Save this so you can run the same audit on your last 30 days.",
          "Bookmark this — the audit takes 11 minutes.",
        ],
      },
      warmup: {
        Hook: [
          "Before they buy from you, they need to feel something first.",
          "Cold buyers don't read sales posts. They read the post before it.",
        ],
        Context: [
          "Cold audiences don't buy systems. They buy the person behind them.",
          "The pre-pitch is where trust is actually built.",
        ],
        Proof: [
          "The accounts that converted best had 3 warmup posts before any pitch.",
          "Three warmup posts before any offer = 41% higher reply rate.",
        ],
        Insight: [
          "Build trust in public. Sell in private.",
          "Trust is built in feed. Sales close in DM.",
        ],
        CTA: [
          "Reply with one word: ready.",
          "Comment 'ready' — I'll DM the warmup template.",
        ],
      },
      sell: {
        Hook: [
          "If your offer isn't selling, your content isn't the problem.",
          "Bad offers don't sell. Disconnected ones don't either.",
        ],
        Context: [
          "The bridge between content and offer is missing.",
          "Most accounts have content. And an offer. And nothing in between.",
        ],
        Proof: [
          "The clients who hit $10K months had this bridge in place.",
          "Adding the bridge post lifted close rate from 6% to 19%.",
        ],
        Insight: [
          "Story → proof → offer. Not content → offer.",
          "The bridge is one post. It changes everything.",
        ],
        CTA: [
          "DM 'OFFER' for the full breakdown.",
          "Send 'OFFER' — I'll walk you through it.",
        ],
      },
      proof: {
        Hook: [
          "I'm done telling you it works. Here's the receipts.",
          "Stop trusting words. Start trusting numbers.",
        ],
        Context: [
          "Same system. Different industries. Same result.",
          "Three industries. Three results. One framework.",
        ],
        Proof: [
          "+412 followers · 18% reach lift · 22% more DMs in 7 days.",
          "From 11K to 13.6K in 21 days — same posting volume.",
        ],
        Insight: [
          "Proof is the most under-used asset in your content.",
          "Receipts beat opinions. Always.",
        ],
        CTA: [
          "Want this for your account? DM 'PROOF'.",
          "DM 'PROOF' — I'll send the full audit.",
        ],
      },
      educate: {
        Hook: [
          "Three signals will tell you exactly what's working.",
          "The metric most creators watch is the wrong one.",
        ],
        Context: [
          "Most creators are reading the wrong metrics.",
          "Likes are vanity. The signal is somewhere else.",
        ],
        Proof: [
          "Reach, save rate, DM volume — in that order.",
          "Save rate predicts next-week reach better than any other number.",
        ],
        Insight: [
          "If two go up together, you've found a winning format.",
          "Two metrics rising together = a format worth repeating.",
        ],
        CTA: [
          "Save this. Run the check on your last 5 posts.",
          "Bookmark — pull up your last 5 and check the pattern.",
        ],
      },
    },
  },

  tattoo: {
    label: "Tattoo artist",
    brandContext: {
      who: "Custom fine-line tattoo artist building a calm, premium studio brand.",
      audience: "Clients who want quiet, intentional, single-session pieces.",
      tone: "Calm, considered, craft-led. Quiet authority.",
      cta: "Book consult, join waitlist.",
    },
    titleByGoal: {
      dms: "Why most consults never turn into bookings",
      authority: "What 200 healed tattoos actually taught me",
      warmup: "Before you book — read this",
      sell: "The studio difference",
      proof: "Real healed work. Real client stories.",
      educate: "How to tell good linework from average",
    },
    copyByGoal: {
      dms: {
        Hook: ["Most people DM 5 artists. Then ghost all of them.", "Quiet inbox? Your portfolio isn't the problem."],
        Context: ["They're not flaky. The portfolio just didn't make the call obvious.", "When clients can't picture the consult, they pause."],
        Proof: ["Adding a consult-walkthrough post lifted my DM-to-book rate from 18% → 41%.", "Two studio walkthroughs. Bookings tripled in a month."],
        Insight: ["Show the room. Show the process. Make the consult feel done before it starts.", "The consult is sold before the DM."],
        CTA: ["DM 'CONSULT' — I'll send my 6-question intake.", "Send 'CONSULT' to start the intake."],
      },
      authority: {
        Hook: ["After 200 healed pieces, I stopped trusting fresh photos.", "Healed work tells a different story than day-one shots."],
        Context: ["Day-one photos sell. Healed photos prove.", "Anyone can post day one. Healed at 6 months is the real test."],
        Proof: ["6-month healed gallery. Same client. Same lighting. Different truth.", "Twelve healed pieces in this set. Each shot at 4–8 months."],
        Insight: ["Linework holds. Saturation rarely does. That's the only test that matters.", "If it's still crisp at 6 months, it was done right."],
        CTA: ["Save this. Then ask any artist for their healed work.", "Bookmark — show this to whoever you book next."],
      },
      warmup: {
        Hook: ["Before you book, here's what a session with me actually feels like.", "What the consult looks like — start to finish."],
        Context: ["Consult, design, day-of, aftercare — same four beats every time.", "We move slow. On purpose."],
        Proof: ["Average client books a 2nd piece within 7 months.", "8 in 10 clients return. That's the only review I trust."],
        Insight: ["Quiet sessions, no rush, healed work that lasts. That's the studio.", "Calm rooms make calm linework."],
        CTA: ["Reply 'STUDIO' — I'll send the studio walkthrough.", "DM 'STUDIO' for the full walkthrough."],
      },
      sell: {
        Hook: ["This is what €600 actually buys you here.", "Pricing is the conversation no one wants to have. So let's have it."],
        Context: ["The chair time, the design hours, the studio space, the aftercare.", "Half the price is what happens before you sit down."],
        Proof: ["Studio time, design hours, single-session policy, lifetime touch-ups.", "Three months of design queue. One session. Done right."],
        Insight: ["Cheap tattoos are expensive. Healed work is the only honest price.", "You're not paying for ink. You're paying for the years it has to last."],
        CTA: ["DM 'PRICING' — I'll send the full breakdown.", "Send 'PRICING' for the studio sheet."],
      },
      proof: {
        Hook: ["Twelve healed pieces. All my clients. Real work.", "No filters. No fresh-shot lighting. Just healed."],
        Context: ["Some at 4 months. Some at a year. All shot in studio light.", "Same lighting. Different timelines. Honest receipts."],
        Proof: ["6-month healed: lines crisp, saturation true, no blowout.", "Linework still sharp at 12 months. Every single one."],
        Insight: ["Healed proof is the only proof that matters in tattoo.", "Fresh ink looks great on everyone. Healed work tells the truth."],
        CTA: ["DM 'HEALED' — I'll send the full archive.", "Reply 'HEALED' to see the full set."],
      },
      educate: {
        Hook: ["Three things to check on every artist's portfolio before you book.", "The portfolio test most clients don't know to run."],
        Context: ["Most portfolios show day-one photos in studio lighting. That's not the test.", "Studio lighting hides everything. Daylight is the test."],
        Proof: ["Look for: healed shots, consistent linework, no fresh-only feed.", "Three signals: healed examples, consistent hand, real lighting."],
        Insight: ["If every photo is day-one and beautiful, you're seeing 30% of the truth.", "Day-one is marketing. Healed is the receipt."],
        CTA: ["Save this. Run the test before your next consult.", "Bookmark — use this on your next 3 portfolio reviews."],
      },
    },
  },

  realestate: {
    label: "Real estate agent",
    brandContext: {
      who: "Boutique real-estate agent specializing in city-center listings under $1M.",
      audience: "First-time buyers, second-home buyers, small investors.",
      tone: "Calm, informed, local. No pressure language.",
      cta: "Book showing, request listing brief.",
    },
    titleByGoal: {
      dms: "The neighborhoods nobody is telling you about",
      authority: "What 40 closings actually taught me",
      warmup: "Buying this year? Read this first.",
      sell: "Just listed — and why this one matters",
      proof: "Three closings, one quarter, real numbers",
      educate: "How to read a listing the way an agent does",
    },
    copyByGoal: {
      dms: {
        Hook: ["Most buyers DM about the listing. The smart ones DM about the street.", "The listing isn't the question. The block is."],
        Context: ["The listing is the surface. The street is the decision.", "Three blocks can mean three different markets."],
        Proof: ["Two streets over: 12% lower price-per-sqft and twice the foot traffic.", "Same school district, same price band — completely different resale."],
        Insight: ["The right block beats the right listing every time.", "Buy the block. The unit is just the entry point."],
        CTA: ["DM 'BLOCK' — I'll send a 3-street breakdown for your area.", "Reply 'BLOCK' for a personalized breakdown."],
      },
      authority: {
        Hook: ["After 40 closings, I stopped recommending the obvious neighborhoods.", "Forty deals in. Here's what I now do differently."],
        Context: ["The obvious ones get bid up 8% over ask. Every time.", "Crowded markets aren't the deal. The next street over is."],
        Proof: ["Last 12 closings — 9 were one street outside the 'hot' zip.", "Six of nine recent buyers won the bid by going one block over."],
        Insight: ["The deal lives at the edge of the popular zip, not inside it.", "The map is wrong by one block."],
        CTA: ["Save this. Pull up a heatmap of your shortlist tonight.", "Bookmark — apply this to your next 5 listings."],
      },
      warmup: {
        Hook: ["Before you start a search, here's what changed in this market.", "Three things to know before any showing this season."],
        Context: ["Inventory is up 14% YoY. Days on market are up too.", "More inventory + longer days = leverage. If you know how to use it."],
        Proof: ["More inventory + slower velocity = real leverage on inspection contingencies.", "Inspection asks landed in 7 of the last 10 deals I closed."],
        Insight: ["Patience is back. Use it.", "Speed lost. Patience won."],
        CTA: ["DM 'MARKET' — I'll send this week's local report.", "Send 'MARKET' for the weekly snapshot."],
      },
      sell: {
        Hook: ["I rarely post listings. This one is the exception.", "Listings I post are the ones I'd buy myself."],
        Context: ["Listed under comp. North-facing. Pre-renovation pricing.", "Priced under three nearby comps. Seller flexible."],
        Proof: ["Three nearby comps closed 7–11% above ask in the last 90 days.", "Comps say $720K. List says $678K."],
        Insight: ["Underpriced listings bring 4× the showings — but most expire before week 2.", "These listings move in 9 days, not 29."],
        CTA: ["DM 'TOUR' to book a showing this week.", "Reply 'TOUR' — I have 3 slots open this Saturday."],
      },
      proof: {
        Hook: ["Three closings last quarter. All over ask. All without bidding wars.", "Three buyers. Three offers. Zero overbidding."],
        Context: ["Different price bands, different blocks — same playbook.", "Same playbook, three different price points."],
        Proof: ["+$22K savings on inspection. +14 days to close. Clean keys.", "Average savings: $19K. Average time-to-close: 28 days."],
        Insight: ["The win wasn't the offer. It was the inspection contingency they kept.", "The offer was simple. The contingency was the win."],
        CTA: ["DM 'PLAYBOOK' — I'll send the full deal breakdown.", "Send 'PLAYBOOK' for the closing notes."],
      },
      educate: {
        Hook: ["Three lines on every listing tell you whether to even tour it.", "How to skip 80% of listings before you tour any of them."],
        Context: ["Most buyers tour 12 homes. They should tour 4.", "Stop touring everything. Start filtering smarter."],
        Proof: ["Days on market, price-cut history, square-foot anomaly — that's the filter.", "Three numbers: DOM, drops, $/sqft delta. That's the filter."],
        Insight: ["Two of the three flagged = call your agent. Three = walk.", "Two flags = caution. Three = move on."],
        CTA: ["Save this. Run the 3-line filter on your shortlist tonight.", "Bookmark — use this on every listing you save."],
      },
    },
  },

  fitness: {
    label: "Fitness creator",
    brandContext: {
      who: "Strength coach building hybrid strength + conditioning programs for busy professionals.",
      audience: "Working professionals, ages 28–45, training 3–4× a week.",
      tone: "Practical, no-fluff, evidence-led. Confident, not loud.",
      cta: "Apply for cohort, download program PDF.",
    },
    titleByGoal: {
      dms: "Why most training plans stall at month 2",
      authority: "After 6 cohorts, here's what actually drives progress",
      warmup: "Read this before your next program",
      sell: "Why our cohort is different",
      proof: "Three clients. Three transformations. Real numbers.",
      educate: "The 3 metrics that beat the scale",
    },
    copyByGoal: {
      dms: {
        Hook: ["Most programs stall at month 2. The reason isn't motivation.", "Plateau at week 8? It's structural, not motivational."],
        Context: ["The first program works because it's new. The second has to be smarter.", "Novelty drives the first 6 weeks. After that, structure has to."],
        Proof: ["68% of clients who plateau in month 2 lacked a deload week.", "Adding deload weeks: dropout rate fell from 41% to 12%."],
        Insight: ["Progress isn't linear. Your program shouldn't be either.", "Recovery isn't a break from the program. It is the program."],
        CTA: ["DM 'PLAN' — I'll send a deload-week template.", "Reply 'PLAN' for the deload framework."],
      },
      authority: {
        Hook: ["6 cohorts in. The needle-movers were not what I expected.", "After 6 cohorts, the surprises landed in the same three places."],
        Context: ["More volume didn't help. More consistency did.", "Volume plateaus. Consistency compounds."],
        Proof: ["Clients training 3×/week beat clients training 5×/week on every metric.", "3-day weeks: 92% adherence. 5-day weeks: 47%."],
        Insight: ["Adherence beats intensity. Always.", "The plan you'll do beats the perfect plan you won't."],
        CTA: ["Save this. Audit last month's training log tonight.", "Bookmark — pull up your last 30 days and check it."],
      },
      warmup: {
        Hook: ["Before you start the next program, here's the audit nobody runs.", "The 4-question audit before you write a single workout."],
        Context: ["Sleep. Stress. Recovery. Time. Then the program.", "Inputs decide the program. Not the other way around."],
        Proof: ["Clients who audited inputs first finished cohorts at 91%.", "Audit-first cohorts: 91% completion. No-audit: 58%."],
        Insight: ["You don't need a better program. You need an honest baseline.", "The baseline is the program."],
        CTA: ["DM 'AUDIT' — I'll send the 4-question form.", "Send 'AUDIT' for the form."],
      },
      sell: {
        Hook: ["This isn't a program. It's a system.", "We don't sell workouts. We sell adherence."],
        Context: ["Programs end. Systems compound.", "A good program lasts 12 weeks. A good system lasts years."],
        Proof: ["Cohort 4: 89% finish rate. Industry average: 24%.", "Average cohort completion: 87%. Industry: 24%."],
        Insight: ["The result isn't the workout. It's the adherence rate.", "Adherence rate is the only stat that predicts everything else."],
        CTA: ["DM 'COHORT' for the next intake.", "Reply 'COHORT' — applications close Friday."],
      },
      proof: {
        Hook: ["Three clients. 12 weeks. Real numbers, no filtering.", "Twelve weeks. Three clients. Same protocol."],
        Context: ["Different starting points. Same protocol. Same coaching.", "Different bodies. Same system. Same direction."],
        Proof: ["+18% strength · -8% body fat · 0 missed weeks across the cohort.", "Strength up 14–22%. Body fat down 6–11%. Across all three."],
        Insight: ["The win wasn't the program. It was the unmissed week.", "Show up every week. The program does the rest."],
        CTA: ["DM 'CASE' — I'll send the full progress logs.", "Send 'CASE' for the logs."],
      },
      educate: {
        Hook: ["Three metrics matter more than the scale.", "Stop watching the scale. Start watching these three."],
        Context: ["Bodyweight is noise. The signals are elsewhere.", "Daily weight is signal-poor. These three are signal-rich."],
        Proof: ["Resting HR, sleep score, lift volume — track those, ignore the rest.", "RHR. Sleep. Volume. That's the dashboard."],
        Insight: ["If two trend the right way, you're winning.", "Two of three trending green = on track."],
        CTA: ["Save this. Set up a weekly check tonight.", "Bookmark — set the weekly check on your phone."],
      },
    },
  },

  agency: {
    label: "Social media agency",
    brandContext: {
      who: "Boutique social agency running content systems for ecom and B2B SaaS founders.",
      audience: "Founders doing $30K–$300K/mo who can't keep up with content.",
      tone: "Sharp, direct, results-led. No agency fluff.",
      cta: "Book strategy call, download case studies.",
    },
    titleByGoal: {
      dms: "Why most agencies can't move your DMs",
      authority: "What 14 client accounts taught us about DMs",
      warmup: "Before you hire any agency, read this",
      sell: "Why our retainer is structured this way",
      proof: "Three clients. One quarter. Real lifts.",
      educate: "The 3 numbers we audit before any pitch",
    },
    copyByGoal: {
      dms: {
        Hook: ["Most agencies can't move your DMs because they're not measuring DMs.", "If your agency reports reach but not DMs, you already know."],
        Context: ["Reach is the metric agencies report. DMs is the metric founders need.", "Reach pays the agency. DMs pay you."],
        Proof: ["Across 14 client accounts: DM-focused content lifted inbound 2.7×.", "DM-tracked content: +172% qualified inbound in 60 days."],
        Insight: ["You can't optimize a number you don't track.", "Track DMs. Optimize DMs. Repeat."],
        CTA: ["DM 'AUDIT' — we'll run a 7-day inbound audit on your account.", "Reply 'AUDIT' for the inbound report."],
      },
      authority: {
        Hook: ["After 14 client accounts, the DM lever was always the same.", "14 accounts. One pattern that always worked."],
        Context: ["Different industries, different audiences, same structural fix.", "Same fix every time. Different industries."],
        Proof: ["Move the keyword CTA from caption to slide 5. Every time.", "CTA on slide 5 outperformed caption CTAs by 3.1×."],
        Insight: ["Captions are skipped. Final slides are not.", "Last slide is the CTA real estate. Use it."],
        CTA: ["Save this. Audit your last 10 carousels today.", "Bookmark — run this on your last 10 posts."],
      },
      warmup: {
        Hook: ["Before you hire any agency, ask them to show DM data, not reach.", "Three questions every founder should ask before signing."],
        Context: ["Reach decks are easy. DM dashboards are not.", "DM dashboards are the proof. Reach decks are the pitch."],
        Proof: ["3 of 5 agencies can't show DM tracking past 30 days.", "Most agencies don't track DMs past last week. Ask."],
        Insight: ["If they can't show 90 days of DM data, they're not running for DMs.", "No 90-day DM data = no DM strategy."],
        CTA: ["DM 'CHECKLIST' — we'll send the 7-question hiring checklist.", "Send 'CHECKLIST' for the form."],
      },
      sell: {
        Hook: ["Our retainer is structured backward. On purpose.", "Why we charge less for month 1, more for month 6."],
        Context: ["Month 1 is cheap. Month 6 is expensive. Most agencies do the opposite.", "Pay less when work is most. Pay more when work compounds."],
        Proof: ["Clients who stay 6+ months drive 80% of our case-study results.", "6+ month clients: 80% of our reportable wins."],
        Insight: ["You're not paying for posts. You're paying for compounding.", "The first 90 days are setup. The next 90 are the return."],
        CTA: ["DM 'RETAINER' for the structure breakdown.", "Reply 'RETAINER' — I'll send the model."],
      },
      proof: {
        Hook: ["Three clients. One quarter. Real lifts, no cherry-picking.", "Same playbook, three industries, last quarter."],
        Context: ["Same playbook. Different industries. Different audiences.", "Three industries. Same protocol."],
        Proof: ["+412 followers · +18% reach · +22% DMs in 7 days. Across all three.", "Avg 7-day lift: +18% reach, +22% DMs, +400 followers."],
        Insight: ["The lift isn't the format. It's the consistency of the format.", "The format works because we ran it 30 times, not 3."],
        CTA: ["DM 'CASES' for the full breakdown.", "Send 'CASES' — I'll share the deck."],
      },
      educate: {
        Hook: ["Three numbers we audit before any pitch.", "The 3-number audit we run before quoting any account."],
        Context: ["Most accounts have a 90-day pattern they can't see.", "Pattern recognition beats opinion every time."],
        Proof: ["Reach distribution, save rate trend, DM-to-reach ratio.", "Reach spread. Save trend. DM:reach ratio."],
        Insight: ["If two are trending wrong, the content needs a rewrite, not a redesign.", "Two of three red = rewrite. Three = restart."],
        CTA: ["Save this. Run the 3-number check on your account tonight.", "Bookmark — apply this every Monday."],
      },
    },
  },
};

/* Default brand context = coach persona, exposed for the BrandPanel default. */
export const brandContextDefault = personas.coach.brandContext;

const reasonByPurpose: Record<SlidePurpose, string> = {
  Hook: "Lead with a contrarian framing — boosts watch-through past the first 2s.",
  Context: "Sets the stakes before introducing the proof.",
  Proof: "Anchors trust with a concrete result your audience can verify.",
  Insight: "Translates the proof into a takeaway they can use.",
  CTA: "Single-keyword DM CTA — your highest-converting format.",
};

const purposeOrder: SlidePurpose[] = [
  "Hook",
  "Context",
  "Proof",
  "Insight",
  "CTA",
];

/* Pulls the first sentence from a free-text prompt, lightly tidied — used as
   the Hook overlay so the user's input visibly drives the output. Returns
   null if the prompt is empty or too short to be a usable Hook. */
export function hookFromPrompt(prompt: string): string | null {
  const t = prompt.trim();
  if (t.length < 8) return null;
  const m = t.match(/^[^.!?\n]+[.!?]?/);
  const first = (m?.[0] ?? t).trim().replace(/\s+/g, " ");
  if (first.length < 8) return null;
  const cleaned = first.charAt(0).toUpperCase() + first.slice(1);
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

export function copyForCell(
  persona: PersonaKey,
  goal: SequenceGoal,
  purpose: SlidePurpose,
  variant: number
): string {
  const variants = personas[persona].copyByGoal[goal][purpose];
  return variants[variant % variants.length];
}

export function generateSequence(
  selectedAssetIds: string[],
  goal: SequenceGoal,
  type: SequenceType,
  style: SequenceStyle,
  persona: PersonaKey = "coach",
  prompt: string = ""
): GeneratedSequence {
  const ids =
    selectedAssetIds.length > 0
      ? selectedAssetIds
      : sampleAssets.slice(0, 5).map((a) => a.id);

  const customHook = hookFromPrompt(prompt);

  const slides: GeneratedSlide[] = purposeOrder.map((purpose, i) => {
    const assetId = ids[i % ids.length];
    const overlay =
      purpose === "Hook" && customHook
        ? customHook
        : copyForCell(persona, goal, purpose, 0);
    return {
      id: `s-${Date.now()}-${i}`,
      assetId,
      overlay,
      purpose,
      reason: reasonByPurpose[purpose],
      variant: 0,
      locked: false,
    };
  });

  return {
    id: `seq-${Date.now()}`,
    title: personas[persona].titleByGoal[goal],
    goal,
    type,
    style,
    slides,
  };
}
