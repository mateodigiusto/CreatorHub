/* Onboarding profile — the single source of truth for personalization. */

export type CreatorType =
  | "creator"
  | "infoproduct"
  | "agency"
  | "fitness"
  | "realestate"
  | "content_manager"
  | "editor"
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

export type TrialPlan = "standard" | "pro";
export type TrialCycle = "monthly" | "annual";

export type Trial = {
  plan: TrialPlan;
  cycle: TrialCycle;
  startedAt: string;     // ISO
  expiresAt: string;     // ISO, +7d
};

export type Profile = {
  version: 2;
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
  trial?: Trial;
  emailNotifications?: boolean;
};

/* ─── Role-aware onboarding (account-type fork) ──────────────────────── */

/** The first onboarding fork: an agency (manages clients) vs a solo account. */
export type AccountType = "agency" | "solo";

export type AgencyTeamSize = "just-me" | "small" | "growing" | "large";
export type AgencyClientCount = "starting" | "handful" | "established" | "scaled";

/* In-progress draft — every field optional except the version stamp.
   Also carries the agency-branch fields, which never land on `Profile`
   (they go to the `organizations` row instead). */
export type ProfileDraft = Partial<Omit<Profile, "version" | "completedAt">> & {
  audience?: Partial<Profile["audience"]>;
  accountType?: AccountType;
  agencyName?: string;
  agencyTeamSize?: AgencyTeamSize;
  agencyClientCount?: AgencyClientCount;
};
