import type { DownloadSource, FeedbackRecord, Game, GuideItem, LegalDocumentId, LegalDocumentItem, Platform, ResourceGroup, ResourceItem, SiteSettings } from "@/lib/types";
import { isManagedMediaUrl } from "@/lib/media-url";

const platforms: Platform[] = ["pc", "switch", "mobile", "ps5", "ps4", "other"];
const badges: Game["badge"][] = ["新游", "更新", "热门", "精选"];

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("请求内容格式无效");
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, options: { required?: boolean; max?: number } = {}) {
  const result = typeof value === "string" ? value.trim() : "";
  if (options.required && !result) throw new Error(`${label}不能为空`);
  if (result.length > (options.max ?? 5000)) throw new Error(`${label}内容过长`);
  return result;
}

function number(value: unknown, label: string, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  const result = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(result) || result < minimum || result > maximum) throw new Error(`${label}格式无效`);
  return result;
}

function boolean(value: unknown) {
  return value === true;
}

function slug(value: unknown, label: string) {
  const result = text(value, label, { required: true, max: 80 }).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) throw new Error(`${label}只能使用小写字母、数字和连字符`);
  return result;
}

function date(value: unknown, label: string) {
  const result = text(value, label, { required: true, max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new Error(`${label}格式应为 YYYY-MM-DD`);
  return result;
}

function email(value: unknown, label: string) {
  const result = text(value, label, { required: true, max: 200 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new Error(`${label}格式无效`);
  return result;
}

function url(value: unknown, label: string, required = false) {
  const result = text(value, label, { required, max: 2000 });
  if (!result) return "";
  if (result.startsWith("/uploads/") || result.startsWith("/covers/")) return result;
  try {
    const parsed = new URL(result);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
    return result;
  } catch {
    throw new Error(`${label}必须是 http(s) 地址或站内上传路径`);
  }
}

function assetUrl(value: unknown, label: string) {
  const result = text(value, label, { max: 2000 });
  if (!result) return "";
  if (!isManagedMediaUrl(result)) throw new Error(`${label}请使用后台上传后的对象存储地址`);
  return result;
}

function lines(value: unknown, label: string) {
  if (Array.isArray(value)) return value.map((item) => text(item, label, { max: 500 })).filter(Boolean);
  return text(value, label).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function download(value: unknown, id: DownloadSource["id"]): DownloadSource {
  const source = object(value);
  return {
    id,
    name: text(source.name, "网盘名称", { required: true, max: 30 }),
    // Keep the legacy URL optional for existing records; new downloads use the uploaded QR image.
    url: url(source.url, "网盘链接"),
    qrCode: assetUrl(source.qrCode, "网盘二维码") || undefined,
    code: text(source.code, "提取码", { max: 50 }) || undefined,
    recommended: boolean(source.recommended),
  };
}

export function parseGame(value: unknown): Game {
  const body = object(value);
  const platform = text(body.platform, "游戏平台") as Platform;
  if (!platforms.includes(platform)) throw new Error("游戏平台无效");
  const badge = text(body.badge, "状态标签") as Game["badge"];
  if (!badges.includes(badge)) throw new Error("状态标签无效");
  const rawDownloads = Array.isArray(body.downloads) ? body.downloads : [];
  const downloads = (["quark", "baidu", "xunlei", "mobile"] as const).map((id) => {
    const matched = rawDownloads.find((item) => object(item).id === id);
    return matched ? download(matched, id) : undefined;
  }).filter((source): source is DownloadSource => Boolean(source));
  const minimum = lines(object(body.requirements ?? {}).minimum, "最低配置");
  const recommended = lines(object(body.requirements ?? {}).recommended, "推荐配置");
  return {
    slug: slug(body.slug, "游戏标识"),
    title: text(body.title, "中文名称", { required: true, max: 100 }),
    englishTitle: text(body.englishTitle, "英文名称", { required: true, max: 140 }),
    tagline: text(body.tagline, "一句话介绍", { required: true, max: 220 }),
    platform,
    category: text(body.category, "分类", { required: true, max: 40 }),
    genre: text(body.genre, "类型", { required: true, max: 60 }),
    size: text(body.size, "文件大小", { required: true, max: 30 }),
    updated: date(body.updated, "更新时间"),
    badge,
    score: number(body.score, "评分", 0, 10),
    views: 0,
    featured: boolean(body.featured),
    cover: assetUrl(body.cover, "封面地址") || undefined,
    description: lines(body.description, "游戏介绍"),
    requirements: platform === "pc" && (minimum.length || recommended.length) ? { minimum, recommended } : undefined,
    downloads,
  };
}

export function parseResource(value: unknown): ResourceItem {
  const body = object(value);
  const group = text(body.group, "资源分组") as ResourceGroup;
  if (group !== "mod" && group !== "tools") throw new Error("资源分组无效");
  return {
    id: slug(body.id, "资源标识"),
    group,
    category: text(body.category, "资源分类", { required: true, max: 40 }),
    name: text(body.name, "资源名称", { required: true, max: 140 }),
    description: text(body.description, "资源说明", { required: true, max: 2000 }),
    iconUrl: url(body.iconUrl, "工具图标地址") || undefined,
    version: text(body.version, "版本", { required: true, max: 50 }),
    size: text(body.size, "文件大小", { required: true, max: 30 }),
    updated: date(body.updated, "更新时间"),
    fileUrl: url(body.fileUrl, "附件地址") || undefined,
    externalUrl: url(body.externalUrl, "外部地址") || undefined,
    published: boolean(body.published),
  };
}

export function parseGuide(value: unknown): GuideItem {
  const body = object(value);
  const category = text(body.category, "教程分类") as Platform;
  if (!platforms.includes(category)) throw new Error("教程分类无效");
  return {
    id: slug(body.id, "教程标识"),
    slug: slug(body.slug, "教程地址标识"),
    category,
    title: text(body.title, "教程标题", { required: true, max: 160 }),
    summary: text(body.summary, "教程摘要", { required: true, max: 300 }),
    content: text(body.content, "教程正文", { required: true, max: 20000 }),
    updated: date(body.updated, "更新时间"),
    published: boolean(body.published),
  };
}

export function parseFeedbackPatch(value: unknown): Pick<FeedbackRecord, "status" | "note"> {
  const body = object(value);
  const status = text(body.status, "处理状态") as FeedbackRecord["status"];
  if (status !== "pending" && status !== "resolved") throw new Error("处理状态无效");
  return { status, note: text(body.note, "处理备注", { max: 1000 }) || undefined };
}

export function parseSettings(value: unknown): SiteSettings {
  const body = object(value);
  return {
    siteName: text(body.siteName, "站点名称", { required: true, max: 40 }),
    announcement: text(body.announcement, "首页公告", { required: true, max: 120 }),
    contactEmail: email(body.contactEmail, "联系邮箱"),
    rightsEmail: email(body.rightsEmail, "侵权投诉邮箱"),
  };
}

export function parseLegalDocument(value: unknown, expectedId: LegalDocumentId): LegalDocumentItem {
  const body = object(value);
  const id = text(body.id, "文书标识", { required: true }) as LegalDocumentId;
  if (id !== expectedId || !["about", "infringement", "copyright"].includes(id)) throw new Error("站点文书标识无效");
  return {
    id,
    eyebrow: text(body.eyebrow, "英文标识", { required: true, max: 60 }),
    title: text(body.title, "文书标题", { required: true, max: 80 }),
    description: text(body.description, "文书简介", { required: true, max: 240 }),
    content: text(body.content, "文书正文", { required: true, max: 40000 }),
    updated: date(body.updated, "更新时间"),
    published: boolean(body.published),
  };
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作失败";
}
