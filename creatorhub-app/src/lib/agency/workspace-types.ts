/**
 * TypeScript shapes for Phase 3 workspace data.
 *
 * Lives separately from src/lib/agency/types.ts (which Phase 2 owns) so
 * the parallel Phase 2 + Phase 3 sessions don't collide. At cutover the
 * two files can be merged.
 */

// ─── Brand build (14 fields) + strategy (4 fields) — same row ────────
export const BRAND_BUILD_FIELDS = [
  "bio",
  "mission",
  "vision",
  "valuesText",
  "voice",
  "visualStyle",
  "audiencePersona",
  "audiencePainPoints",
  "uniqueValueProp",
  "positioningStatement",
  "flagshipOffer",
  "signatureFormat",
  "doNotPost",
] as const;

export const STRATEGY_FIELDS = [
  "nextStepsGoal",
  "nextStepsFocus",
  "nextStepsMetrics",
  "nextStepsBlockers",
] as const;

export type BrandBuildField = (typeof BRAND_BUILD_FIELDS)[number];
export type StrategyField = (typeof STRATEGY_FIELDS)[number];

/**
 * Long-form fields = 13 plain text + `contentPillars` (string[]) + 4 strategy
 * fields. The DB has bio + 13 others; contentPillars is the 14th brand build
 * "field" but rendered as a multi-input.
 */
export type BrandProfile = {
  clientId: string;
  organizationId: string;
  bio: string | null;
  mission: string | null;
  vision: string | null;
  valuesText: string | null;
  voice: string | null;
  visualStyle: string | null;
  audiencePersona: string | null;
  audiencePainPoints: string | null;
  uniqueValueProp: string | null;
  positioningStatement: string | null;
  contentPillars: string[];
  flagshipOffer: string | null;
  signatureFormat: string | null;
  doNotPost: string | null;
  nextStepsGoal: string | null;
  nextStepsFocus: string | null;
  nextStepsMetrics: string | null;
  nextStepsBlockers: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BrandProfilePatch = Partial<
  Omit<BrandProfile, "clientId" | "organizationId" | "createdAt" | "updatedAt">
>;

/** Reasonable empty default for new clients. */
export const EMPTY_BRAND_PROFILE: Omit<
  BrandProfile,
  "clientId" | "organizationId" | "createdAt" | "updatedAt"
> = {
  bio: null,
  mission: null,
  vision: null,
  valuesText: null,
  voice: null,
  visualStyle: null,
  audiencePersona: null,
  audiencePainPoints: null,
  uniqueValueProp: null,
  positioningStatement: null,
  contentPillars: [],
  flagshipOffer: null,
  signatureFormat: null,
  doNotPost: null,
  nextStepsGoal: null,
  nextStepsFocus: null,
  nextStepsMetrics: null,
  nextStepsBlockers: null,
};

// ─── Internal notes ──────────────────────────────────────────────────
export type ClientInternalNotes = {
  clientId: string;
  organizationId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

// ─── AI transcript analyzer ──────────────────────────────────────────
/**
 * The analyzer returns one entry per inferred brand-profile field. The
 * UI shows them as checkboxes; selected ones are PATCHed to the row.
 */
export type AnalyzerSuggestion = {
  field: BrandBuildField | StrategyField | "contentPillars";
  /** Suggested value. For contentPillars this is a string[]; everything else is string. */
  value: string | string[];
  /** Short why-this-was-extracted hint for the UI. */
  rationale: string;
  /** 0–1; renders as a bar. */
  confidence: number;
};

export type AnalyzerResult = {
  suggestions: AnalyzerSuggestion[];
  /** Number of tokens consumed against the org's monthly AI quota. */
  tokensUsed: number;
};

// ─── Field metadata for forms ────────────────────────────────────────
/** Display + helper copy for each brand-build field. The form renders from this. */
export const BRAND_BUILD_FIELD_META: Record<
  BrandBuildField | "contentPillars",
  { label: string; placeholder: string; helper: string; rows?: number }
> = {
  bio: {
    label: "Short bio",
    placeholder: "One-paragraph elevator pitch.",
    helper: "What this creator is, in 2–3 sentences.",
    rows: 3,
  },
  mission: {
    label: "Mission",
    placeholder: "Why this work exists.",
    helper: "The change they want to make in the world.",
    rows: 3,
  },
  vision: {
    label: "Vision",
    placeholder: "Where this is going in 5 years.",
    helper: "The endgame — what success looks like.",
    rows: 3,
  },
  valuesText: {
    label: "Values",
    placeholder: "Three to five guiding principles.",
    helper: "What they say yes to, what they say no to.",
    rows: 4,
  },
  voice: {
    label: "Voice",
    placeholder: "Tone, register, recurring phrases.",
    helper: "How they sound — calm, sharp, warm, irreverent.",
    rows: 3,
  },
  visualStyle: {
    label: "Visual style",
    placeholder: "Palette, framing, typography cues.",
    helper: "The visual fingerprint a viewer would recognize.",
    rows: 3,
  },
  audiencePersona: {
    label: "Audience persona",
    placeholder: "Who shows up — age, role, life stage.",
    helper: "One specific reader/viewer in mind.",
    rows: 3,
  },
  audiencePainPoints: {
    label: "Audience pain points",
    placeholder: "The struggles the audience brings.",
    helper: "What hurts that this creator addresses.",
    rows: 3,
  },
  uniqueValueProp: {
    label: "Unique value prop",
    placeholder: "The single most-different thing.",
    helper: "If they only said one thing, this is it.",
    rows: 3,
  },
  positioningStatement: {
    label: "Positioning statement",
    placeholder: "For [audience], we help [outcome] by [mechanism].",
    helper: "One sentence positioning, fill-in-the-blank style.",
    rows: 3,
  },
  contentPillars: {
    label: "Content pillars",
    placeholder: "Add a pillar and press Enter.",
    helper: "3–5 themes every piece of content fits inside.",
  },
  flagshipOffer: {
    label: "Flagship offer",
    placeholder: "The main thing they sell or aim toward.",
    helper: "Course, cohort, agency engagement, newsletter, etc.",
    rows: 3,
  },
  signatureFormat: {
    label: "Signature format",
    placeholder: "Talking-head reels, voiceover B-roll, ...",
    helper: "The format this creator owns.",
    rows: 2,
  },
  doNotPost: {
    label: "Do not post",
    placeholder: "Topics, tones, or formats to avoid.",
    helper: "Hard nos — politics, religion, competitor names, etc.",
    rows: 3,
  },
};

export const STRATEGY_FIELD_META: Record<
  StrategyField,
  { label: string; placeholder: string; helper: string; rows: number }
> = {
  nextStepsGoal: {
    label: "Goal for the next 30 days",
    placeholder: "What we want true at the end of this month.",
    helper: "Specific, measurable, time-boxed.",
    rows: 3,
  },
  nextStepsFocus: {
    label: "Focus areas",
    placeholder: "The 2–3 things we're investing in.",
    helper: "Where attention goes; everything else is noise.",
    rows: 3,
  },
  nextStepsMetrics: {
    label: "Metrics to watch",
    placeholder: "Reach, watch time, CTR, etc.",
    helper: "The numbers that prove we're moving.",
    rows: 3,
  },
  nextStepsBlockers: {
    label: "Open questions / blockers",
    placeholder: "What's slowing us down.",
    helper: "Decisions, dependencies, things we don't know yet.",
    rows: 3,
  },
};
