export type AssetKind = "photo" | "proof" | "screenshot" | "testimonial";

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
};

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
    gradient: "linear-gradient(135deg,#3B82F6,#60A5FA)",
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
    gradient: "linear-gradient(135deg,#070B14,#3B82F6)",
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
    gradient: "linear-gradient(135deg,#2563EB,#070B14)",
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
    gradient: "linear-gradient(135deg,#60A5FA,#2563EB)",
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
    gradient: "linear-gradient(135deg,#0B1220,#3B82F6)",
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
    gradient: "linear-gradient(135deg,#070B14,#2563EB)",
    mood: "Transformation",
    scene: "Before / after card",
    aestheticScore: 8.2,
    tags: ["proof", "transformation", "result"],
    recommendedUse: "Proof or insight slide",
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
  | "educational";
export const sequenceStyles: { key: SequenceStyle; label: string }[] = [
  { key: "raw", label: "Raw & real" },
  { key: "premium", label: "Premium minimal" },
  { key: "founder", label: "Founder story" },
  { key: "client-result", label: "Client result" },
  { key: "educational", label: "Educational" },
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

export const brandContextDefault = {
  who: "I help online coaches build content systems that turn educational content into sales calls.",
  audience: "Solo coaches, course creators, agency founders.",
  tone: "Direct, clear, founder-led. Premium. Not hypey.",
  cta: "DM keyword or book a call.",
};

export type SlidePurpose = "Hook" | "Context" | "Proof" | "Insight" | "CTA";

export type GeneratedSlide = {
  id: string;
  assetId: string;
  overlay: string;
  purpose: SlidePurpose;
  reason: string;
};

export type GeneratedSequence = {
  id: string;
  title: string;
  goal: SequenceGoal;
  type: SequenceType;
  style: SequenceStyle;
  slides: GeneratedSlide[];
};

const titleByGoal: Record<SequenceGoal, string> = {
  dms: "Why your content isn't converting",
  authority: "What 90 days of content actually taught me",
  warmup: "Most creators never see this part",
  sell: "The system behind the offer",
  proof: "Real numbers. Real DMs. Real proof.",
  educate: "The 3 signals that change everything",
};

const copyByGoal: Record<SequenceGoal, Record<SlidePurpose, string>> = {
  dms: {
    Hook: "Most creators aren't losing because of bad ideas.",
    Context: "They're losing because their content has no system behind it.",
    Proof: "When we tracked what actually drove DMs, the winning formats became obvious.",
    Insight: "Educational authority posts drove 2.3× more conversations than lifestyle.",
    CTA: "DM 'SYSTEM' and I'll send you the framework.",
  },
  authority: {
    Hook: "I posted every day for 90 days. Here's what actually moved the needle.",
    Context: "The volume didn't matter. The signal did.",
    Proof: "Three Reels carried 64% of total reach.",
    Insight: "The pattern: a sub-2s hook + a clear receipt + an explicit CTA.",
    CTA: "Save this so you can run the same audit on your last 30 days.",
  },
  warmup: {
    Hook: "Before they buy from you, they need to feel something first.",
    Context: "Cold audiences don't buy systems. They buy the person behind them.",
    Proof: "The accounts that converted best had 3 warmup posts before any pitch.",
    Insight: "Build trust in public. Sell in private.",
    CTA: "Reply with one word: ready.",
  },
  sell: {
    Hook: "If your offer isn't selling, your content isn't the problem.",
    Context: "The bridge between content and offer is missing.",
    Proof: "The clients who hit $10K months had this bridge in place.",
    Insight: "Story → proof → offer. Not content → offer.",
    CTA: "DM 'OFFER' for the full breakdown.",
  },
  proof: {
    Hook: "I'm done telling you it works. Here's the receipts.",
    Context: "Same system. Different industries. Same result.",
    Proof: "+412 followers · 18% reach lift · 22% more DMs in 7 days.",
    Insight: "Proof is the most under-used asset in your content.",
    CTA: "Want this for your account? DM 'PROOF'.",
  },
  educate: {
    Hook: "Three signals will tell you exactly what's working.",
    Context: "Most creators are reading the wrong metrics.",
    Proof: "Reach, save rate, DM volume — in that order.",
    Insight: "If two go up together, you've found a winning format.",
    CTA: "Save this. Run the check on your last 5 posts.",
  },
};

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

export function generateSequence(
  selectedAssetIds: string[],
  goal: SequenceGoal,
  type: SequenceType,
  style: SequenceStyle
): GeneratedSequence {
  const ids = selectedAssetIds.length > 0 ? selectedAssetIds : sampleAssets.slice(0, 5).map((a) => a.id);
  const slides: GeneratedSlide[] = purposeOrder.map((purpose, i) => {
    const assetId = ids[i % ids.length];
    return {
      id: `s-${Date.now()}-${i}`,
      assetId,
      overlay: copyByGoal[goal][purpose],
      purpose,
      reason: reasonByPurpose[purpose],
    };
  });
  return {
    id: `seq-${Date.now()}`,
    title: titleByGoal[goal],
    goal,
    type,
    style,
    slides,
  };
}
