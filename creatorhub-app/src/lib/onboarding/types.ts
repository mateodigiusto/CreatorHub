/* Onboarding profile — the single source of truth for personalization. */

export type CreatorType =
  | "creator"
  | "infoproduct"
  | "agency"
  | "tattoo"
  | "fitness"
  | "realestate"
  | "brand"
  | "other";

export type Goal =
  | "audience"
  | "dms"
  | "appointments"
  | "sell"
  | "consistency"
  | "analytics"
  | "sequences"
  | "clients"
  | "authority"
  | "reports";

export type Platform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "x"
  | "facebook";

export type ContentFormat =
  | "stories"
  | "reels"
  | "carousels"
  | "static"
  | "longform"
  | "client-results"
  | "testimonials"
  | "bts"
  | "educational"
  | "sales";

export type Frequency =
  | "rarely"
  | "1-3"
  | "4-7"
  | "daily"
  | "multi-daily"
  | "multi-account";

export type PlanningWorkflow =
  | "none"
  | "notes"
  | "sheets"
  | "notion"
  | "calendar"
  | "agency"
  | "editor"
  | "other";

export type Problem =
  | "what-to-post"
  | "inconsistent"
  | "analytics"
  | "no-conversion"
  | "no-system"
  | "lose-assets"
  | "reports"
  | "clients"
  | "sequences";

export type Selling =
  | "services"
  | "coaching"
  | "courses"
  | "digital"
  | "appointments"
  | "local"
  | "brand-deals"
  | "content-services"
  | "products"
  | "none";

export type Cta =
  | "dm-keyword"
  | "book-call"
  | "form"
  | "link"
  | "story-reply"
  | "comment-keyword"
  | "save-share"
  | "inquiry"
  | "appointment"
  | "custom";

export type BrandTone =
  | "premium"
  | "direct"
  | "friendly"
  | "educational"
  | "raw"
  | "luxury"
  | "bold"
  | "calm"
  | "funny"
  | "professional"
  | "founder";

export type SequenceUse =
  | "story-sequences"
  | "carousel-outlines"
  | "asset-to-post"
  | "sales-sequences"
  | "educational-sequences"
  | "proof-sequences"
  | "appointment-sequences"
  | "ctas";

export type AssetType =
  | "photos"
  | "short-videos"
  | "testimonials"
  | "client-screenshots"
  | "analytics-screenshots"
  | "before-after"
  | "product"
  | "studio"
  | "brand"
  | "offer";

export type ReportsNeed =
  | "personal-weekly"
  | "client"
  | "team"
  | "performance"
  | "sales-leads"
  | "none";

export type TeamSetup =
  | "solo"
  | "solo-editor"
  | "small-team"
  | "agency"
  | "multi-client"
  | "brand-team";

export type StartMode = "instagram" | "demo";

export type Profile = {
  version: 1;
  completedAt: string;
  displayName?: string;
  handle?: string;
  creatorType: CreatorType;
  niche: string;
  primaryGoal: Goal;
  secondaryGoals: Goal[];
  platforms: Platform[];
  contentFormats: ContentFormat[];
  frequency: Frequency;
  planningWorkflow: PlanningWorkflow[];
  biggestProblem: Problem;
  audience: { who: string; wants: string; problem: string };
  selling: Selling[];
  offerName?: string;
  ctaStyle: Cta;
  customCta?: string;
  brandTones: BrandTone[];
  sequenceUses: SequenceUse[];
  wantsNichePresets: boolean;
  assetTypes: AssetType[];
  reportsNeeds: ReportsNeed[];
  team: TeamSetup;
  startMode: StartMode;
};

/* In-progress draft — every field optional except the version stamp. */
export type ProfileDraft = Partial<Omit<Profile, "version" | "completedAt">> & {
  audience?: Partial<Profile["audience"]>;
};
