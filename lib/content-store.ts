import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { defaultGuides, defaultResources, defaultSiteSettings, games as defaultGames } from "@/lib/data";
import { defaultLegalDocuments } from "@/lib/legal-defaults";
import { deleteObject, listObjects, objectPublicUrl, putObject } from "@/lib/object-storage";
import type { FeedbackRecord, Game, GuideItem, LegalDocumentId, LegalDocumentItem, ResourceItem, SiteSettings, UploadRecord } from "@/lib/types";

const dataDirectory = path.join(process.cwd(), "data");
const uploadDirectory = path.join(process.cwd(), "public", "uploads");
let writeQueue: Promise<unknown> = Promise.resolve();

type GameViewStat = {
  total: number;
  viewers: Record<string, number>;
};

type GameViewStats = Record<string, GameViewStat>;

const emptyViewStats: GameViewStats = {};
const viewDeduplicationWindow = 24 * 60 * 60 * 1000;
const viewVisitorRetention = viewDeduplicationWindow;

async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(dataDirectory, name), "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return structuredClone(fallback);
  }
}

async function writeJson<T>(name: string, value: T): Promise<void> {
  await fs.mkdir(dataDirectory, { recursive: true });
  const target = path.join(dataDirectory, name);
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(temporary, target);
}

function enqueueWrite<T>(callback: () => Promise<T>): Promise<T> {
  const operation = writeQueue.then(callback);
  writeQueue = operation.catch(() => undefined);
  return operation;
}

function updateJson<T>(name: string, fallback: T, updater: (current: T) => T | Promise<T>): Promise<T> {
  return enqueueWrite(async () => {
    const current = await readJson(name, fallback);
    const next = await updater(current);
    await writeJson(name, next);
    return next;
  });
}

function effectiveViewTotal(stat?: GameViewStat) {
  return stat && Number.isSafeInteger(stat.total) && stat.total >= 0 ? stat.total : 0;
}

export async function listGames(): Promise<Game[]> {
  const [games, viewStats] = await Promise.all([
    readJson("games.json", defaultGames),
    readJson("view-stats.json", emptyViewStats),
  ]);
  return games.map((game) => ({ ...game, views: effectiveViewTotal(viewStats[game.slug]) }));
}

export async function findGame(slug: string): Promise<Game | undefined> {
  return (await listGames()).find((game) => game.slug === slug);
}

export async function createGame(game: Game): Promise<Game> {
  const created = { ...game, views: 0 };
  await updateJson("games.json", defaultGames, (items) => {
    if (items.some((item) => item.slug === created.slug)) throw new Error("游戏标识已存在");
    return [created, ...items];
  });
  return created;
}

export async function updateGame(originalSlug: string, game: Game): Promise<Game> {
  await enqueueWrite(async () => {
    const items = await readJson("games.json", defaultGames);
    const index = items.findIndex((item) => item.slug === originalSlug);
    if (index < 0) throw new Error("游戏不存在");
    if (game.slug !== originalSlug && items.some((item) => item.slug === game.slug)) throw new Error("新的游戏标识已存在");
    const next = [...items];
    next[index] = { ...game, views: 0 };
    await writeJson("games.json", next);

    if (game.slug !== originalSlug) {
      const viewStats = await readJson("view-stats.json", emptyViewStats);
      if (viewStats[originalSlug]) {
        const nextViewStats = { ...viewStats, [game.slug]: viewStats[originalSlug] };
        delete nextViewStats[originalSlug];
        await writeJson("view-stats.json", nextViewStats);
      }
    }
  });
  return (await findGame(game.slug)) ?? { ...game, views: 0 };
}

export async function deleteGame(slug: string): Promise<boolean> {
  let removed = false;
  await enqueueWrite(async () => {
    const items = await readJson("games.json", defaultGames);
    removed = items.some((item) => item.slug === slug);
    if (!removed) return;
    await writeJson("games.json", items.filter((item) => item.slug !== slug));
    const viewStats = await readJson("view-stats.json", emptyViewStats);
    if (viewStats[slug]) {
      const nextViewStats = { ...viewStats };
      delete nextViewStats[slug];
      await writeJson("view-stats.json", nextViewStats);
    }
  });
  return removed;
}

export function recordGameView(slug: string, visitorKey: string, now = Date.now()): Promise<{ views: number; counted: boolean } | undefined> {
  return enqueueWrite(async () => {
    const games = await readJson("games.json", defaultGames);
    if (!games.some((game) => game.slug === slug)) return undefined;

    const viewStats = await readJson("view-stats.json", emptyViewStats);
    const current = viewStats[slug] ?? { total: 0, viewers: {} };
    const views = effectiveViewTotal(current);
    const previousView = current.viewers?.[visitorKey];
    if (Number.isFinite(previousView) && now - previousView < viewDeduplicationWindow) {
      return { views, counted: false };
    }

    const retentionCutoff = now - viewVisitorRetention;
    const viewers = Object.fromEntries(
      Object.entries(current.viewers ?? {}).filter(([, viewedAt]) => Number.isFinite(viewedAt) && viewedAt >= retentionCutoff),
    );
    viewers[visitorKey] = now;
    const nextViews = views + 1;
    await writeJson("view-stats.json", {
      ...viewStats,
      [slug]: { total: nextViews, viewers },
    });
    return { views: nextViews, counted: true };
  });
}

export function listResources(): Promise<ResourceItem[]> {
  return readJson("resources.json", defaultResources);
}

export async function findResource(id: string): Promise<ResourceItem | undefined> {
  return (await listResources()).find((resource) => resource.id === id);
}

export async function createResource(resource: ResourceItem): Promise<ResourceItem> {
  await updateJson("resources.json", defaultResources, (items) => {
    if (items.some((item) => item.id === resource.id)) throw new Error("资源标识已存在");
    return [resource, ...items];
  });
  return resource;
}

export async function updateResource(id: string, resource: ResourceItem): Promise<ResourceItem> {
  await updateJson("resources.json", defaultResources, (items) => {
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("资源不存在");
    if (resource.id !== id && items.some((item) => item.id === resource.id)) throw new Error("新的资源标识已存在");
    const next = [...items];
    next[index] = resource;
    return next;
  });
  return resource;
}

export async function deleteResource(id: string): Promise<boolean> {
  let removed = false;
  await updateJson("resources.json", defaultResources, (items) => {
    removed = items.some((item) => item.id === id);
    return items.filter((item) => item.id !== id);
  });
  return removed;
}

export function listGuides(): Promise<GuideItem[]> {
  return readJson("guides.json", defaultGuides);
}

export async function findGuide(slug: string): Promise<GuideItem | undefined> {
  return (await listGuides()).find((guide) => guide.slug === slug);
}

export async function createGuide(guide: GuideItem): Promise<GuideItem> {
  await updateJson("guides.json", defaultGuides, (items) => {
    if (items.some((item) => item.id === guide.id || item.slug === guide.slug)) throw new Error("教程标识已存在");
    return [guide, ...items];
  });
  return guide;
}

export async function updateGuide(id: string, guide: GuideItem): Promise<GuideItem> {
  await updateJson("guides.json", defaultGuides, (items) => {
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("教程不存在");
    if (items.some((item) => item.id !== id && (item.id === guide.id || item.slug === guide.slug))) throw new Error("新的教程标识已存在");
    const next = [...items];
    next[index] = guide;
    return next;
  });
  return guide;
}

export async function deleteGuide(id: string): Promise<boolean> {
  let removed = false;
  await updateJson("guides.json", defaultGuides, (items) => {
    removed = items.some((item) => item.id === id);
    return items.filter((item) => item.id !== id);
  });
  return removed;
}

export function listFeedback(): Promise<FeedbackRecord[]> {
  return readJson("feedback.json", []).then((items: FeedbackRecord[]) =>
    items.map((item) => ({ ...item, status: item.status ?? "pending" })),
  );
}

export async function createFeedback(record: FeedbackRecord): Promise<FeedbackRecord> {
  await updateJson<FeedbackRecord[]>("feedback.json", [], (items) => [...items, record]);
  return record;
}

export async function updateFeedback(id: string, patch: Pick<FeedbackRecord, "status" | "note">): Promise<FeedbackRecord> {
  let updated: FeedbackRecord | undefined;
  await updateJson<FeedbackRecord[]>("feedback.json", [], (items) => items.map((item) => {
    if (item.id !== id) return item;
    updated = { ...item, status: patch.status, note: patch.note };
    return updated;
  }));
  if (!updated) throw new Error("反馈不存在");
  return updated;
}

export async function deleteFeedback(id: string): Promise<boolean> {
  let removed = false;
  await updateJson<FeedbackRecord[]>("feedback.json", [], (items) => {
    removed = items.some((item) => item.id === id);
    return items.filter((item) => item.id !== id);
  });
  return removed;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const stored = await readJson<Partial<SiteSettings>>("settings.json", defaultSiteSettings);
  return { ...defaultSiteSettings, ...stored };
}

export async function saveSiteSettings(settings: SiteSettings): Promise<SiteSettings> {
  await writeJson("settings.json", settings);
  return settings;
}

export async function listLegalDocuments(): Promise<LegalDocumentItem[]> {
  const stored = await readJson("legal-documents.json", defaultLegalDocuments);
  return defaultLegalDocuments.map((fallback) => ({
    ...fallback,
    ...stored.find((document) => document.id === fallback.id),
    id: fallback.id,
  }));
}

export async function findLegalDocument(id: LegalDocumentId): Promise<LegalDocumentItem | undefined> {
  return (await listLegalDocuments()).find((document) => document.id === id);
}

export async function updateLegalDocument(id: LegalDocumentId, document: LegalDocumentItem): Promise<LegalDocumentItem> {
  await updateJson("legal-documents.json", defaultLegalDocuments, (items) => {
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("站点文书不存在");
    const next = [...items];
    next[index] = { ...document, id };
    return next;
  });
  return { ...document, id };
}

const uploadKinds: Record<string, UploadRecord["kind"]> = {
  ".jpg": "image", ".jpeg": "image", ".png": "image", ".webp": "image", ".gif": "image",
  ".zip": "archive", ".7z": "archive", ".rar": "archive",
  ".pdf": "document", ".txt": "document", ".json": "document",
};

const imageContentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function hasImageSignature(bytes: Uint8Array, extension: string) {
  if (extension === ".jpg" || extension === ".jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (extension === ".png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
  }
  if (extension === ".gif") {
    const header = Buffer.from(bytes.subarray(0, 6)).toString("ascii");
    return header === "GIF87a" || header === "GIF89a";
  }
  if (extension === ".webp") {
    return bytes.length >= 12
      && Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF"
      && Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP";
  }
  return false;
}

export function getUploadKind(filename: string): UploadRecord["kind"] | undefined {
  return uploadKinds[path.extname(filename).toLowerCase()];
}

export async function listUploads(): Promise<UploadRecord[]> {
  const [localResult, remoteResult] = await Promise.allSettled([
    (async () => {
      await fs.mkdir(uploadDirectory, { recursive: true });
      const entries = await fs.readdir(uploadDirectory, { withFileTypes: true });
      return Promise.all(entries.filter((entry) => entry.isFile() && !entry.name.startsWith(".")).map(async (entry) => {
        const info = await fs.stat(path.join(uploadDirectory, entry.name));
        return {
          name: entry.name,
          url: `/uploads/${encodeURIComponent(entry.name)}`,
          size: info.size,
          updatedAt: info.mtime.toISOString(),
          kind: getUploadKind(entry.name) ?? "document",
        } satisfies UploadRecord;
      }));
    })(),
    listObjects("uploads/"),
  ]);

  if (localResult.status === "rejected") {
    console.error("[content-store:listUploads] 本地上传目录暂时不可用", errorCode(localResult.reason));
  }
  if (remoteResult.status === "rejected") {
    console.error("[content-store:listUploads] 对象存储暂时不可用", errorCode(remoteResult.reason));
  }

  const localRecords = localResult.status === "fulfilled" ? localResult.value : [];
  const remoteRecords = remoteResult.status === "fulfilled" ? remoteResult.value.map((item) => {
    const name = item.key.slice("uploads/".length);
    return { name, url: objectPublicUrl(item.key), size: item.size, updatedAt: item.updatedAt, kind: "image" as const };
  }) : [];
  return [...remoteRecords, ...localRecords].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function errorCode(error: unknown) {
  if (!error || typeof error !== "object") return "UNKNOWN";
  const candidate = error as { code?: unknown; name?: unknown };
  return String(candidate.code || candidate.name || "UNKNOWN");
}

export async function saveUpload(file: File): Promise<UploadRecord> {
  const kind = getUploadKind(file.name);
  if (!kind) throw new Error("不支持该文件格式");
  if (file.size <= 0) throw new Error("文件内容为空");
  if (kind === "image" && file.size > 5 * 1024 * 1024) throw new Error("单张图片不能超过 5 MB");
  if (kind !== "image" && file.size > 128 * 1024 * 1024) throw new Error("单个附件不能超过 128 MB，大文件请使用网盘链接");
  const extension = path.extname(file.name).toLowerCase();
  const stem = path.basename(file.name, extension).normalize("NFKC").replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "file";
  const name = `${Date.now()}-${stem}${extension}`;
  if (kind === "image") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasImageSignature(bytes, extension)) throw new Error("图片内容与文件格式不匹配或文件已损坏");
    const key = `uploads/${name}`;
    const url = await putObject(key, bytes, imageContentTypes[extension]);
    return { name, url, size: file.size, updatedAt: new Date().toISOString(), kind };
  }
  await fs.mkdir(uploadDirectory, { recursive: true });
  const target = path.join(uploadDirectory, name);
  await fs.writeFile(target, Buffer.from(await file.arrayBuffer()), { flag: "wx" });
  return { name, url: `/uploads/${encodeURIComponent(name)}`, size: file.size, updatedAt: new Date().toISOString(), kind };
}

export async function deleteUpload(name: string): Promise<boolean> {
  const normalized = path.basename(name);
  if (normalized !== name || name.startsWith(".")) return false;
  if (getUploadKind(name) === "image") {
    await deleteObject(`uploads/${name}`);
    return true;
  }
  const target = path.join(uploadDirectory, normalized);
  const resolved = path.resolve(target);
  if (!resolved.startsWith(`${path.resolve(uploadDirectory)}${path.sep}`)) return false;
  try {
    await fs.unlink(resolved);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
