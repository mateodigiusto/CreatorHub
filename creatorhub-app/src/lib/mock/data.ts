import { Post, Kpi, Idea } from "./types";

export const profile = {
  handle: "@mateo.creates",
  name: "Mateo Garcia",
  followers: 48230,
  followersDelta: 1240,
  avatar: "MG",
};

export const kpis: Kpi[] = [
  { label: "Reach", value: "284.6K", raw: 284600, delta: 12.4, deltaLabel: "vs last 30d" },
  { label: "Engagement", value: "5.8%", raw: 5.8, delta: 0.6, deltaLabel: "vs last 30d" },
  { label: "Messages / Leads", value: "342", raw: 342, delta: 18.2, deltaLabel: "vs last 30d" },
  { label: "Posts Published", value: "21", raw: 21, delta: 5, deltaLabel: "this month" },
];

const days = 30;
export const reachSeries = Array.from({ length: days }, (_, i) => {
  const base = 6500 + Math.sin(i / 3) * 2000 + i * 120;
  const noise = Math.sin(i * 1.7) * 1500;
  return {
    date: `D${i + 1}`,
    reach: Math.round(Math.max(2000, base + noise)),
    engagement: Math.round((Math.max(2000, base + noise)) * (0.045 + Math.sin(i / 5) * 0.012)),
  };
});

export const followerSeries = Array.from({ length: 12 }, (_, i) => ({
  week: `W${i + 1}`,
  followers: 38000 + i * 850 + Math.round(Math.sin(i / 2) * 400),
}));

export const contentTypeBreakdown = [
  { type: "Reels", reach: 184200, share: 64 },
  { type: "Carousels", reach: 62100, share: 22 },
  { type: "Static", reach: 28400, share: 10 },
  { type: "Stories", reach: 9900, share: 4 },
];

const thumbs = [
  "linear-gradient(135deg,#1E3A8A,#3B82F6)",
  "linear-gradient(135deg,#3B82F6,#60A5FA)",
  "linear-gradient(135deg,#0B1220,#2563EB)",
  "linear-gradient(135deg,#070B14,#3B82F6)",
  "linear-gradient(135deg,#2563EB,#0B1220)",
  "linear-gradient(135deg,#6366F1,#1E3A8A)",
];

const titles = [
  "3 hooks that broke 1M views",
  "How I plan a week of content in 30 min",
  "The retention edit pattern I keep reusing",
  "Stop posting these 4 captions",
  "Behind a 220K reach Reel",
  "What 90 days of carousels taught me",
  "The 4-second rule for opening shots",
  "My weekly analytics review, on screen",
  "Content batching: my real workflow",
  "Why this Reel out-performed by 6x",
  "The CTA pattern driving DMs",
  "Repurposing one idea into 5 formats",
  "What stopped my Reels from flopping",
  "A carousel template you can steal",
  "How creators read their analytics wrong",
  "From 2K to 48K followers — what worked",
  "The 3 metrics I actually track",
  "My pre-publish checklist (10 steps)",
];

export const posts: Post[] = titles.map((title, i) => {
  const types: Post["type"][] = ["Reel", "Carousel", "Static", "Reel", "Reel", "Carousel"];
  const type = types[i % types.length];
  const reach = Math.round(8000 + Math.random() * 240000);
  const likes = Math.round(reach * (0.03 + Math.random() * 0.06));
  const comments = Math.round(likes * (0.02 + Math.random() * 0.05));
  const saves = Math.round(likes * (0.08 + Math.random() * 0.12));
  const shares = Math.round(likes * (0.04 + Math.random() * 0.08));
  const er = +(((likes + comments + saves + shares) / reach) * 100).toFixed(2);
  const statuses: Post["status"][] = [
    "Published", "Published", "Published", "Analyzed", "Published",
    "Scheduled", "Editing", "Review", "Recording", "Script",
    "Idea", "Published", "Published", "Scheduled", "Editing",
    "Published", "Analyzed", "Idea",
  ];
  const status = statuses[i] ?? "Published";
  const date = new Date();
  date.setDate(date.getDate() - i * 1.6);
  return {
    id: `p${i + 1}`,
    title,
    caption: title + ". Save this for your next batch day.",
    type,
    status,
    thumbnail: thumbs[i % thumbs.length],
    publishedAt: status === "Published" || status === "Analyzed" ? date.toISOString() : undefined,
    scheduledAt: status === "Scheduled" ? new Date(Date.now() + (i - 5) * 86400000).toISOString() : undefined,
    reach,
    likes,
    comments,
    saves,
    shares,
    engagementRate: er,
  };
});

export const topPosts = [...posts]
  .filter((p) => p.status === "Published" || p.status === "Analyzed")
  .sort((a, b) => b.reach - a.reach)
  .slice(0, 5);

export const upcoming = posts
  .filter((p) => p.status === "Scheduled")
  .slice(0, 4);

export const ideas: Idea[] = [
  {
    id: "i1",
    title: "Re-cut your top Reel with a faster opening 2 seconds",
    hypothesis: "Hook latency is your biggest lever. Top Reel had a 1.4s hook.",
    format: "Reel",
    source: "Top performing Reel — 224K reach",
    score: 92,
    saved: true,
  },
  {
    id: "i2",
    title: "Carousel: 7 caption mistakes killing your saves",
    hypothesis: "Save rate jumps 3x when carousels lead with 'don't' frames.",
    format: "Carousel",
    source: "Carousel pattern from 4 winning posts",
    score: 88,
    saved: false,
  },
  {
    id: "i3",
    title: "Reel: behind the scenes of your weekly analytics review",
    hypothesis: "BTS / process content drives 2.4x more DMs than tutorials.",
    format: "Reel",
    source: "Messages / Leads pattern — last 14 days",
    score: 84,
    saved: true,
  },
  {
    id: "i4",
    title: "Static: a screenshot of your batching calendar",
    hypothesis: "High-context single shots over-perform when reach is up week-over-week.",
    format: "Static",
    source: "Static pattern — 30d window",
    score: 71,
    saved: false,
  },
  {
    id: "i5",
    title: "Carousel: turn your top 3 Reel hooks into a swipeable",
    hypothesis: "Top hooks reused as carousels lift saves by 38% on average.",
    format: "Carousel",
    source: "Cross-format winning hooks",
    score: 79,
    saved: false,
  },
  {
    id: "i6",
    title: "Reel: 'I changed one thing and reach 6x'd' — show your edit",
    hypothesis: "Concrete before/after edits drive the highest watch-through.",
    format: "Reel",
    source: "Watch-through analysis — 30d",
    score: 86,
    saved: true,
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
    "Reach is up 12.4% on a flat publish cadence — engagement rate per post is doing the work. The pattern: Reels with a sub-2s hook and an explicit CTA in the caption are out-performing the rest by 2.1×. Carousels are healthy on saves but flat on reach.",
  reportsWeekly:
    "You published 5 posts this week, reach was up 18% week-over-week, and DM volume increased 22%. The standout was a Reel that earned 41% of your weekly reach in a single piece of content. Recommended next step: ship a follow-up Reel using the same hook structure within 5 days.",
  ideas:
    "These ideas are derived from your 5 highest-reach posts in the last 30 days. Save an idea to lock it in for next week's plan.",
};

export function getDayLabel(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export function getWeek() {
  const out: { date: Date; key: string; items: Post[] }[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push({ date: d, key: d.toISOString().slice(0, 10), items: [] });
  }
  // distribute scheduled + published items
  posts.forEach((p, idx) => {
    if (p.status !== "Scheduled" && p.status !== "Published") return;
    const slot = out[idx % 7];
    if (slot.items.length < 2) slot.items.push(p);
  });
  return out;
}

export const reports = {
  weekly: {
    range: "This week",
    posts: 5,
    reach: "62.8K",
    reachDelta: 18,
    engagement: "6.1%",
    engagementDelta: 0.4,
    leads: 86,
    leadsDelta: 22,
    followers: "+412",
  },
  monthly: {
    range: "This month",
    posts: 21,
    reach: "284.6K",
    reachDelta: 12.4,
    engagement: "5.8%",
    engagementDelta: 0.6,
    leads: 342,
    leadsDelta: 18.2,
    followers: "+1,240",
  },
};
