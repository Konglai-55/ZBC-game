export type Platform =
  | "pc"
  | "switch"
  | "mobile"
  | "ps5"
  | "ps4"
  | "other";

export type GameBadge = "新游" | "更新" | "热门" | "精选";

export type DownloadSource = {
  id: "quark" | "baidu" | "xunlei" | "mobile";
  name: string;
  code?: string;
  url: string;
  qrCode?: string;
  recommended?: boolean;
};

export type Game = {
  slug: string;
  title: string;
  englishTitle: string;
  tagline: string;
  platform: Platform;
  category: string;
  genre: string;
  size: string;
  updated: string;
  badge: GameBadge;
  score: number;
  views: number;
  featured?: boolean;
  cover?: string;
  description: string[];
  requirements?: {
    minimum: string[];
    recommended: string[];
  };
  downloads: DownloadSource[];
};

export type ResourceGroup = "mod" | "tools";

export type ResourceItem = {
  id: string;
  group: ResourceGroup;
  category: string;
  name: string;
  description: string;
  iconUrl?: string;
  version: string;
  size: string;
  updated: string;
  fileUrl?: string;
  externalUrl?: string;
  published: boolean;
};

export type GuideCategory = Platform;

export type GuideItem = {
  id: string;
  slug: string;
  category: GuideCategory;
  title: string;
  summary: string;
  content: string;
  updated: string;
  published: boolean;
};

export type FeedbackRecord = {
  id: string;
  gameSlug: string;
  type: "update" | "broken";
  createdAt: string;
  status: "pending" | "resolved";
  note?: string;
};

export type SiteSettings = {
  siteName: string;
  announcement: string;
  contactEmail: string;
  rightsEmail: string;
};

export type LegalDocumentId = "about" | "infringement" | "copyright";

export type LegalDocumentItem = {
  id: LegalDocumentId;
  eyebrow: string;
  title: string;
  description: string;
  content: string;
  updated: string;
  published: boolean;
};

export type UploadRecord = {
  name: string;
  url: string;
  size: number;
  updatedAt: string;
  kind: "image" | "archive" | "document";
};

export type PlatformMeta = {
  key: Platform;
  label: string;
  shortLabel: string;
  description: string;
  filters: string[];
};
