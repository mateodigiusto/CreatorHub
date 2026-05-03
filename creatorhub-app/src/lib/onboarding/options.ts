/* Display labels + descriptions for every onboarding option. */

import type {
  CreatorType,
  Goal,
  Platform,
  ContentFormat,
  Frequency,
  PlanningWorkflow,
  Problem,
  Selling,
  Cta,
  BrandTone,
  SequenceUse,
  AssetType,
  ReportsNeed,
  TeamSetup,
} from "./types";

type Opt<T extends string> = { key: T; label: string; description?: string };

export const creatorTypes: Opt<CreatorType>[] = [
  { key: "creator", label: "Personal brand", description: "Solo creator building an audience around you." },
  { key: "agency", label: "Social media agency", description: "Running content for multiple clients." },
  { key: "infoproduct", label: "Info product / coaching", description: "Selling courses, coaching, or knowledge products." },
  { key: "realestate", label: "Real estate", description: "Listings, neighborhoods, market insights." },
  { key: "fitness", label: "Fitness", description: "Coaching, programming, transformations." },
  { key: "other", label: "Something else", description: "Pick this if none of the above fit." },
];

export const niches: { key: string; label: string }[] = [
  { key: "realestate", label: "Real estate" },
  { key: "coaching", label: "Coaching / Education" },
  { key: "finance", label: "Finance" },
  { key: "info", label: "Info / Content business" },
  { key: "beauty", label: "Beauty / Lifestyle" },
  { key: "marketing", label: "Business / Marketing" },
  { key: "fitness", label: "Fitness" },
  { key: "fashion", label: "Fashion" },
  { key: "music", label: "Music / Entertainment" },
  { key: "food", label: "Food / Hospitality" },
  { key: "other", label: "Other" },
];

export const goals: Opt<Goal>[] = [
  { key: "audience", label: "Grow my audience", description: "Reach + follower growth." },
  { key: "dms", label: "Get more DMs / leads", description: "Inbound conversations." },
  { key: "appointments", label: "Book more appointments", description: "Bookings + inquiries." },
  { key: "sell", label: "Sell an offer", description: "Move offer revenue." },
  { key: "consistency", label: "Plan content consistently", description: "Show up every week." },
  { key: "analytics", label: "Understand what works", description: "Read data confidently." },
  { key: "sequences", label: "Better story sequences", description: "Higher-converting story sets." },
  { key: "clients", label: "Manage clients", description: "For agencies + freelancers." },
  { key: "authority", label: "Build authority", description: "Become the go-to in your space." },
  { key: "reports", label: "Improve reports", description: "Cleaner client + team reports." },
];

export const platforms: Opt<Platform>[] = [
  { key: "instagram", label: "Instagram", description: "Stories, Reels, posts." },
  { key: "tiktok", label: "TikTok", description: "Short-form video." },
  { key: "youtube", label: "YouTube", description: "Long + short video." },
  { key: "linkedin", label: "LinkedIn", description: "Professional network." },
  { key: "x", label: "X / Twitter", description: "Threads + posts." },
  { key: "facebook", label: "Facebook", description: "Pages + groups." },
];

export const contentFormats: Opt<ContentFormat>[] = [
  { key: "stories", label: "Stories" },
  { key: "reels", label: "Reels / short videos" },
  { key: "carousels", label: "Carousels" },
  { key: "static", label: "Static posts" },
  { key: "longform", label: "Long-form videos" },
  { key: "client-results", label: "Client results" },
  { key: "testimonials", label: "Testimonials" },
  { key: "bts", label: "Behind-the-scenes" },
  { key: "educational", label: "Educational" },
  { key: "sales", label: "Sales / promo" },
];

export const frequencies: Opt<Frequency>[] = [
  { key: "rarely", label: "Rarely" },
  { key: "1-3", label: "1–3 / week" },
  { key: "4-7", label: "4–7 / week" },
  { key: "daily", label: "Daily" },
  { key: "multi-daily", label: "Multiple daily" },
  { key: "multi-account", label: "Multiple accounts" },
];

export const planningWorkflows: Opt<PlanningWorkflow>[] = [
  { key: "none", label: "I don't plan" },
  { key: "notes", label: "Notes app" },
  { key: "sheets", label: "Google Sheets" },
  { key: "notion", label: "Notion" },
  { key: "calendar", label: "Calendar" },
  { key: "agency", label: "Agency workflow" },
  { key: "editor", label: "I work with an editor / team" },
  { key: "other", label: "Other" },
];

export const problems: Opt<Problem>[] = [
  { key: "what-to-post", label: "I don't know what to post" },
  { key: "inconsistent", label: "I'm inconsistent" },
  { key: "analytics", label: "I don't understand my analytics" },
  { key: "no-conversion", label: "My content doesn't convert" },
  { key: "no-system", label: "I have no system" },
  { key: "lose-assets", label: "I lose track of assets" },
  { key: "reports", label: "I need better reports" },
  { key: "clients", label: "I need to manage clients" },
  { key: "sequences", label: "I need better story sequences" },
];

export const sellingTypes: Opt<Selling>[] = [
  { key: "services", label: "Services" },
  { key: "coaching", label: "Coaching" },
  { key: "courses", label: "Courses" },
  { key: "digital", label: "Digital products" },
  { key: "appointments", label: "Appointments" },
  { key: "local", label: "Local service" },
  { key: "brand-deals", label: "Brand deals" },
  { key: "content-services", label: "Content services" },
  { key: "products", label: "Physical products" },
  { key: "none", label: "Not selling yet" },
];

export const ctaStyles: Opt<Cta>[] = [
  { key: "dm-keyword", label: "DM keyword" },
  { key: "book-call", label: "Book a call" },
  { key: "form", label: "Fill out form" },
  { key: "link", label: "Visit link" },
  { key: "story-reply", label: "Reply to story" },
  { key: "comment-keyword", label: "Comment keyword" },
  { key: "save-share", label: "Save / share" },
  { key: "inquiry", label: "Send inquiry" },
  { key: "appointment", label: "Book appointment" },
  { key: "custom", label: "Custom" },
];

export const brandTones: Opt<BrandTone>[] = [
  { key: "premium", label: "Premium" },
  { key: "direct", label: "Direct" },
  { key: "friendly", label: "Friendly" },
  { key: "educational", label: "Educational" },
  { key: "raw", label: "Raw & real" },
  { key: "luxury", label: "Luxury" },
  { key: "bold", label: "Bold" },
  { key: "calm", label: "Calm" },
  { key: "funny", label: "Funny" },
  { key: "professional", label: "Professional" },
  { key: "founder", label: "Founder-led" },
];

export const sequenceUses: Opt<SequenceUse>[] = [
  { key: "story-sequences", label: "Story sequences" },
  { key: "carousel-outlines", label: "Carousel outlines" },
  { key: "asset-to-post", label: "Turn assets into posts" },
  { key: "sales-sequences", label: "Sales sequences" },
  { key: "educational-sequences", label: "Educational sequences" },
  { key: "proof-sequences", label: "Proof / testimonial sequences" },
  { key: "appointment-sequences", label: "Appointment-booking sequences" },
  { key: "ctas", label: "Generate CTAs" },
];

export const assetTypes: Opt<AssetType>[] = [
  { key: "photos", label: "Photos" },
  { key: "short-videos", label: "Short videos (≤15s)" },
  { key: "testimonials", label: "Testimonials" },
  { key: "client-screenshots", label: "Client screenshots" },
  { key: "analytics-screenshots", label: "Analytics screenshots" },
  { key: "before-after", label: "Before / after" },
  { key: "product", label: "Product photos" },
  { key: "studio", label: "Studio / process shots" },
  { key: "brand", label: "Brand assets" },
  { key: "offer", label: "Offer screenshots" },
];

export const reportsNeeds: Opt<ReportsNeed>[] = [
  { key: "personal-weekly", label: "Personal weekly" },
  { key: "client", label: "Client reports" },
  { key: "team", label: "Team reports" },
  { key: "performance", label: "Content performance" },
  { key: "sales-leads", label: "Sales / lead summaries" },
  { key: "none", label: "I don't need reports yet" },
];

export const teamSetups: Opt<TeamSetup>[] = [
  { key: "solo", label: "Just me", description: "Solo operator." },
  { key: "solo-editor", label: "Me + editor", description: "Solo with one collaborator." },
  { key: "small-team", label: "Small team", description: "2–5 people." },
  { key: "agency", label: "Agency", description: "Multi-role agency." },
  { key: "multi-client", label: "Multiple clients", description: "Independent freelancer with clients." },
  { key: "brand-team", label: "Brand / content team", description: "In-house team." },
];

/* Tiny lookup helper for label rendering. */
export function labelOf<T extends string>(opts: Opt<T>[], key: T | undefined): string {
  if (!key) return "—";
  return opts.find((o) => o.key === key)?.label ?? key;
}
