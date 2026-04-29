import { Post, Kpi, Idea, Platform } from "./types";

export const profile = {
  handle: "@ella.moreno",
  name: "Ella Moreno",
  followers: 13080,
  followersDelta: 1240,
  avatar: "EM",
  plan: "Pro plan · 2 seats",
};

export const platforms: Platform[] = ["YouTube", "Instagram", "TikTok", "X"];

export const platformReach = [
  { platform: "YouTube", reach: 128400 },
  { platform: "Instagram", reach: 92800 },
  { platform: "TikTok", reach: 48200 },
  { platform: "X", reach: 15200 },
];

export const kpis: Kpi[] = [
  { label: "Reach", value: "284.6K", raw: 284600, delta: 12.4, deltaLabel: "vs last 30 days" },
  { label: "Engagement rate", value: "5.8%", raw: 5.8, delta: 0.6, deltaLabel: "vs last 30 days" },
  { label: "New followers", value: "+4,128", raw: 4128, delta: 8.2, deltaLabel: "vs last 30 days" },
  { label: "Top post CTR", value: "3.1%", raw: 3.1, delta: -0.2, deltaLabel: "vs last 30 days" },
];

export const kpiTrends: Record<string, number[]> = {
  Reach: [20, 28, 24, 40, 36, 52, 60, 58, 72, 80],
  "Engagement rate": [3.2, 3.8, 4.1, 4.0, 4.6, 5.0, 5.4, 5.2, 5.6, 5.8],
  "New followers": [120, 180, 210, 260, 240, 310, 360, 340, 400, 420],
  "Top post CTR": [3.6, 3.5, 3.4, 3.5, 3.4, 3.3, 3.2, 3.1, 3.0, 3.1],
};

export const reachSeries14d = [
  42, 55, 50, 71, 64, 80, 88, 84, 99, 110, 102, 118, 124, 140,
];

export const followerSeriesWeekly = [
  12940, 12970, 12998, 13020, 13042, 13061, 13080,
];

export const followerSeriesMonthly = [
  12200, 12340, 12450, 12610, 12790, 12970, 13080,
];

export const followerSeries12w = [
  12200, 12260, 12340, 12380, 12450, 12520, 12610, 12680, 12790, 12880, 12970, 13080,
];

export const analyticsReachSeries = [
  180, 220, 210, 260, 250, 320, 290, 340, 380, 360, 420, 460, 440, 500,
];

export const contentTypeBreakdown = [
  { type: "Reels", reach: 248000, share: 60 },
  { type: "Carousels", reach: 112000, share: 27 },
  { type: "Static", reach: 38000, share: 9 },
  { type: "Stories", reach: 14800, share: 4 },
];

const grads = [
  "linear-gradient(135deg,#1E3A8A,#3B82F6)",
  "linear-gradient(135deg,#3B82F6,#60A5FA)",
  "linear-gradient(135deg,#0B1220,#2563EB)",
  "linear-gradient(135deg,#070B14,#3B82F6)",
  "linear-gradient(135deg,#2563EB,#0B1220)",
  "linear-gradient(135deg,#6366F1,#1E3A8A)",
  "linear-gradient(135deg,#0B1220,#6366F1)",
];

export const posts: Post[] = [
  {
    id: "p1",
    title: "I quit my agency to build my own thing",
    caption: "I quit my agency to build my own thing. Save this for your next pivot.",
    type: "YouTube",
    platform: "YouTube",
    status: "Published",
    thumbnail: grads[0],
    publishedAt: "2026-04-22T10:00:00Z",
    reach: 84200,
    likes: 6210,
    comments: 482,
    saves: 1024,
    shares: 318,
    engagementRate: 7.8,
  },
  {
    id: "p2",
    title: "How I plan a month of content in 2 hours",
    caption: "How I plan a month of content in 2 hours.",
    type: "Reel",
    platform: "Instagram",
    status: "Published",
    thumbnail: grads[1],
    publishedAt: "2026-04-19T17:30:00Z",
    reach: 62400,
    likes: 5120,
    comments: 386,
    saves: 1480,
    shares: 412,
    engagementRate: 9.1,
  },
  {
    id: "p3",
    title: "5 things I changed in 2026",
    caption: "5 things I changed in 2026.",
    type: "Carousel",
    platform: "Instagram",
    status: "Scheduled",
    thumbnail: grads[2],
    scheduledAt: "2026-04-30T08:00:00Z",
    reach: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    shares: 0,
    engagementRate: 0,
  },
  {
    id: "p4",
    title: "My current desk setup",
    caption: "My current desk setup.",
    type: "Reel",
    platform: "Instagram",
    status: "Editing",
    thumbnail: grads[3],
    reach: 38200,
    likes: 2210,
    comments: 184,
    saves: 612,
    shares: 142,
    engagementRate: 6.4,
  },
  {
    id: "p5",
    title: "Why I stopped chasing virality",
    caption: "Why I stopped chasing virality.",
    type: "YouTube",
    platform: "YouTube",
    status: "Script",
    thumbnail: grads[4],
    reach: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    shares: 0,
    engagementRate: 0,
  },
  {
    id: "p6",
    title: "3 hooks I'm testing this week",
    caption: "3 hooks I'm testing this week.",
    type: "Reel",
    platform: "Instagram",
    status: "Idea",
    thumbnail: grads[5],
    reach: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    shares: 0,
    engagementRate: 0,
  },
  {
    id: "p7",
    title: "Behind the scenes — studio reset",
    caption: "Behind the scenes — studio reset.",
    type: "Carousel",
    platform: "Instagram",
    status: "Scheduled",
    thumbnail: grads[6],
    scheduledAt: "2026-04-24T08:15:00Z",
    reach: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    shares: 0,
    engagementRate: 0,
  },
  {
    id: "p8",
    title: "Edit your reels in 6 minutes flat",
    caption: "Edit your reels in 6 minutes flat.",
    type: "Reel",
    platform: "Instagram",
    status: "Published",
    thumbnail: grads[1],
    publishedAt: "2026-04-12T18:00:00Z",
    reach: 41700,
    likes: 2710,
    comments: 220,
    saves: 304,
    shares: 188,
    engagementRate: 6.4,
  },
  {
    id: "p9",
    title: "5 ways to monetize a small audience",
    caption: "5 ways to monetize a small audience.",
    type: "Reel",
    platform: "Instagram",
    status: "Published",
    thumbnail: grads[0],
    publishedAt: "2026-04-22T18:00:00Z",
    reach: 64200,
    likes: 4900,
    comments: 410,
    saves: 412,
    shares: 296,
    engagementRate: 7.6,
  },
  {
    id: "p10",
    title: "Why your hook isn't landing",
    caption: "Why your hook isn't landing.",
    type: "Carousel",
    platform: "Instagram",
    status: "Published",
    thumbnail: grads[6],
    publishedAt: "2026-04-18T11:00:00Z",
    reach: 48100,
    likes: 3200,
    comments: 312,
    saves: 286,
    shares: 154,
    engagementRate: 6.7,
  },
  {
    id: "p11",
    title: "Notion template for content planning",
    caption: "Notion template for content planning.",
    type: "Static",
    platform: "Instagram",
    status: "Published",
    thumbnail: grads[3],
    publishedAt: "2026-04-14T09:00:00Z",
    reach: 22800,
    likes: 1480,
    comments: 96,
    saves: 198,
    shares: 80,
    engagementRate: 5.9,
  },
  {
    id: "p12",
    title: "Quick tip — caption hook formula",
    caption: "Quick tip — caption hook formula.",
    type: "Reel",
    platform: "Instagram",
    status: "Scheduled",
    thumbnail: grads[5],
    scheduledAt: "2026-04-28T18:00:00Z",
    reach: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    shares: 0,
    engagementRate: 0,
  },
];

export const topPosts = [...posts]
  .filter((p) => p.status === "Published" || p.status === "Analyzed")
  .sort((a, b) => b.reach - a.reach)
  .slice(0, 5);

export const upcoming = posts
  .filter((p) => p.status === "Scheduled")
  .slice(0, 5);

export const ideas: Idea[] = [
  {
    id: "i1",
    title: "Why I stopped chasing 'going viral' — and what I do instead",
    hypothesis: "Personal pivot. Contrarian framing performs 2× on your account.",
    format: "Reel",
    source: "Personal pivot · contrarian",
    score: 92,
    saved: true,
  },
  {
    id: "i2",
    title: "The 4-hour content batch that runs my whole month",
    hypothesis: "Workflow content drove your highest YouTube watch-through last month.",
    format: "YouTube",
    source: "Workflow · process",
    score: 88,
    saved: false,
  },
  {
    id: "i3",
    title: "I tested 12 hooks last week — here are the 3 that hit",
    hypothesis: "Data-backed carousels lift saves by 38% on average.",
    format: "Carousel",
    source: "Data-backed · educational",
    score: 85,
    saved: false,
  },
  {
    id: "i4",
    title: "What I'd say to myself at 10K followers",
    hypothesis: "Reflection / evergreen Reels carry your highest reach quartile.",
    format: "Reel",
    source: "Reflection · evergreen",
    score: 81,
    saved: true,
  },
  {
    id: "i5",
    title: "Behind every '7-figure creator' there's this one boring habit",
    hypothesis: "Hot take YouTube videos drove +28 leads in March.",
    format: "YouTube",
    source: "Hot take · narrative",
    score: 79,
    saved: false,
  },
  {
    id: "i6",
    title: "I rebuilt my entire workflow in Notion — full template inside",
    hypothesis: "Resource carousels with templates are your top save format.",
    format: "Carousel",
    source: "Resource · tactical",
    score: 76,
    saved: false,
  },
];

export const winningFormats = [
  { name: "Hook → Receipt → CTA Reel", uses: 6, avgReach: "182K", lift: "+74%" },
  { name: "7-frame 'mistake' carousel", uses: 4, avgReach: "92K", lift: "+38%" },
  { name: "BTS process Reel", uses: 3, avgReach: "121K", lift: "+52%" },
];

export const aiInsights = {
  dashboard:
    "Your Reels are pulling 64% of total reach but only 21% of your published volume. Doubling Reel output the next 14 days is the highest-leverage move — your top 3 Reels averaged 2.4× the reach of your average post.",
  analytics:
    "Your Reels drove 60% of reach this period — a 12pp increase versus last month. Hook strength on the top 3 was unusually high (avg 7.4% ER vs portfolio 4.2%). Lean into 'concrete result in first 2s' framing; it shows up in every overperformer.",
  reportsWeekly:
    "Strong week. Your Wed Reel drove 38% of total reach (64.2K) and pulled +28 leads via DM. Carousels held steady; Stories underperformed — 14.8K reach across 4 posts. Keep Reels in the Wed/Sat 6–8pm pocket; consider replacing 2 Stories slots next week with a second Carousel.",
  reportsMonthly:
    "April was your strongest month: 412.8K reach (+22%), 342 leads (+18%). Reels carried the period (60% share). Engagement rate ticked up to 5.2% (+0.6pp). Top-of-funnel is healthy; next constraint is conversion — 11% of DM leads booked vs target 18%.",
  ideas:
    "Based on the last 30 days, your audience is 2.4× more responsive to first-person process content than to listicles. The ideas below are weighted toward hooks that match that voice.",
};

type SeriesPoint = { x?: string; y: number };

function dayDiff(from: Date, to: Date) {
  return Math.max(
    1,
    Math.round((+to - +from) / (1000 * 60 * 60 * 24)) + 1
  );
}

function bucketLabel(d: Date, totalDays: number) {
  if (totalDays <= 14)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (totalDays <= 90) return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  return d.toLocaleDateString("en-US", { month: "short" });
}

// Deterministic pseudo-random series so the chart shape changes per range
// but never flips between renders.
function genSeries(
  from: Date,
  to: Date,
  base: number,
  amplitude: number,
  trend: number
): SeriesPoint[] {
  const totalDays = dayDiff(from, to);
  const points = totalDays <= 14 ? totalDays : totalDays <= 90 ? 14 : 12;
  const labelEvery = Math.max(1, Math.floor(points / 5));
  const out: SeriesPoint[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / Math.max(1, points - 1);
    const date = new Date(+from + t * (+to - +from));
    const seasonal = Math.sin(i * 0.7 + from.getDate() * 0.13) * amplitude;
    const noise = Math.sin(i * 1.9 + from.getMonth()) * amplitude * 0.4;
    const linear = trend * i;
    const y = Math.max(0, Math.round(base + seasonal + noise + linear));
    out.push({
      x: i % labelEvery === 0 || i === points - 1 ? bucketLabel(date, totalDays) : "",
      y,
    });
  }
  return out;
}

export function getReachSeries(from: Date, to: Date): SeriesPoint[] {
  const totalDays = dayDiff(from, to);
  const base = 60 + Math.min(totalDays, 90) * 1.2;
  const amp = 22 + Math.min(totalDays, 90) * 0.4;
  const trend = totalDays <= 14 ? 7 : totalDays <= 90 ? 4 : 2;
  return genSeries(from, to, base, amp, trend);
}

export function getFollowerSeries(from: Date, to: Date): SeriesPoint[] {
  const totalDays = dayDiff(from, to);
  const points = totalDays <= 14 ? totalDays : totalDays <= 90 ? 12 : 12;
  const labelEvery = Math.max(1, Math.floor(points / 4));
  const start = 12200;
  const end = 13080;
  const out: SeriesPoint[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / Math.max(1, points - 1);
    const date = new Date(+from + t * (+to - +from));
    const linear = start + (end - start) * t;
    const wobble = Math.sin(i * 0.8) * 60;
    out.push({
      x: i % labelEvery === 0 || i === points - 1 ? bucketLabel(date, totalDays) : "",
      y: Math.round(linear + wobble),
    });
  }
  return out;
}

export function getWeek() {
  const out: { date: Date; key: string; items: Post[] }[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay() + 1);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push({ date: d, key: d.toISOString().slice(0, 10), items: [] });
  }
  posts.forEach((p, idx) => {
    if (p.status !== "Scheduled" && p.status !== "Published") return;
    const slot = out[idx % 7];
    if (slot.items.length < 2) slot.items.push(p);
  });
  return out;
}

export const reports = {
  weekly: {
    range: "Apr 22 – Apr 28, 2026",
    posts: 6,
    reach: "92.4K",
    reachDelta: 18,
    engagement: "5.7%",
    engagementDelta: 0.4,
    leads: 84,
    leadsDelta: 22,
    followers: "13,080",
  },
  monthly: {
    range: "April 2026",
    posts: 24,
    reach: "412.8K",
    reachDelta: 22,
    engagement: "5.2%",
    engagementDelta: 0.6,
    leads: 342,
    leadsDelta: 18,
    followers: "13,080",
  },
};
