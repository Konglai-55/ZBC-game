import type { DownloadSource } from "@/lib/types";

export const downloadProviders: Record<DownloadSource["id"] | "file" | "external", string> = {
  quark: "夸克网盘",
  baidu: "百度网盘",
  xunlei: "迅雷云盘",
  mobile: "移动云盘",
  file: "站内附件",
  external: "外部链接",
};

export type ActivityEvent =
  | { type: "visit" }
  | { type: "search"; term: string; noResults: boolean }
  | { type: "download"; kind: "game" | "resource"; id: string; provider: keyof typeof downloadProviders };

export const activityDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" });

export function normalizeSearchTerm(value: string) {
  const term = value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  if (!term || term.length > 80 || /[@<>]|https?:\/\/|www\.|[0-9][0-9 +()-]{7,}[0-9]|[a-z0-9_-]{32,}/i.test(term)) return "";
  return term;
}
