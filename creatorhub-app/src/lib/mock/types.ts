export type ContentStatus =
  | "Idea"
  | "Script"
  | "Recording"
  | "Editing"
  | "Review"
  | "Scheduled"
  | "Published"
  | "Analyzed";

export type PostType = "Reel" | "Carousel" | "Static" | "Story" | "YouTube";

export type Platform = "YouTube" | "Instagram" | "TikTok" | "X";

export type Post = {
  id: string;
  title: string;
  caption: string;
  type: PostType;
  platform: Platform;
  status: ContentStatus;
  thumbnail: string;
  publishedAt?: string;
  scheduledAt?: string;
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  engagementRate: number;
};

export type Kpi = {
  label: string;
  value: string;
  raw: number;
  delta: number;
  deltaLabel: string;
};

export type Idea = {
  id: string;
  title: string;
  hypothesis: string;
  format: PostType;
  source: string;
  score: number;
  saved: boolean;
};
