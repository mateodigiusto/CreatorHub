/**
 * Content DNA shapes — kept loose (jsonb-friendly) but typed at the
 * boundaries so UI components can render confidently.
 */

export type SourcePlatform = "youtube" | "instagram" | "tiktok" | "other";

export type AnalysisStatus = "analyzing" | "ready" | "failed";

export type StructureBeat = {
  name: string;          // e.g. "Hook", "Setup", "Payoff"
  timestamp: string;     // e.g. "0:00–0:08"
  description: string;
};

export type WhyItWorked = {
  hook_psychology: string;
  retention_triggers: string;
  emotional_pattern: string;
  story_structure: string;
};

export type AnalysisVariations = {
  hooks: string[];
  angles: string[];
  titles: string[];
};

export type ContentAnalysis = {
  id: string;
  userId: string;
  sourceUrl: string;
  sourcePlatform: SourcePlatform;
  sourceTitle: string | null;
  sourceCreator: string | null;
  sourceThumbnail: string | null;
  transcription: string | null;
  hook: string | null;
  structure: StructureBeat[] | null;
  whyItWorked: WhyItWorked | null;
  variations: AnalysisVariations | null;
  status: AnalysisStatus;
  createdAt: string;
  updatedAt: string;
};

export type ScriptShot = {
  description: string;
  duration_seconds: number;
};

export type ContentDraft = {
  id: string;
  analysisId: string;
  userId: string;
  angle: string | null;
  audience: string | null;
  targetPlatform: string | null;
  tone: string | null;
  script: string | null;
  hooks: string[] | null;
  shots: ScriptShot[] | null;
  captions: string[] | null;
  createdAt: string;
  updatedAt: string;
};
