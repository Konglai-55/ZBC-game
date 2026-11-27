import "server-only";

import { matchTotp } from "@/lib/totp";
import { cache } from "react";
import { factorSecret, getAdminSession } from "@/lib/admin-auth";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { defaultGuides, defaultResources, defaultSiteSettings, formatGameDate, games as defaultGames, resourceReferenceId } from "@/lib/data";
import { defaultLegalDocuments } from "@/lib/legal-defaults";
import { deleteObject, listObjects, objectPublicUrl, putObject } from "@/lib/object-storage";
import type { FeedbackRecord, Game, GuideItem, LegalDocumentId, LegalDocumentItem, ResourceItem, SiteSettings, UploadRecord } from "@/lib/types";

const dataDirectory = process.env.ZBC_DATA_DIR || path.join(process.cwd(), "data");
const uploadDirectory = process.env.ZBC_UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
const queue = globalThis as typeof globalThis & { zbcContentWrite?: Promise<unknown> };

type GameViewStat = {
  total: number;
  viewers: Record<string, number>;
};

type GameViewStats = Record<string, GameViewStat>;

const emptyViewStats: GameViewStats = {};
const viewDeduplicationWindow = 24 * 60 * 60 * 1000;
const viewVisitorRetention = viewDeduplicationWindow;
const gameBadgeDuration = 15 * 24 * 60 * 60 * 1000;

async function readRaw<T>(name: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(dataDirectory, name), "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return structuredClone(fallback);
  }
}

async function writeRaw<T>(name: string, value: T): Promise<void> {
  await fs.mkdir(dataDirectory, { recursive: true });
  const target = path.join(dataDirectory, name);
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), { encoding:"utf8", mode:0o600 });
  await fs.rename(temporary, target);
}

type Stamp = { at: string; actor: string };
type StoredRow = Record<string, unknown> & { _trash?: Stamp };
const archiveSources: Record<string, { key: string; defaults: unknown[] }> = {
  "games.json": { key: "slug", defaults: defaultGames }, "resources.json": { key: "id", defaults: defaultResources },
  "guides.json": { key: "id", defaults: defaultGuides }, "feedback.json": { key: "id", defaults: [] },
};
type AuditEvent = Stamp & { action: string; source: string; target: string; fields: string[] };

async function audit(action: string, source: string, target: string, fields: string[], actor: string) {
  await fs.mkdir(dataDirectory, { recursive: true });
  const event: AuditEvent = { at: new Date().toISOString(), actor, action, source, target, fields };
  await fs.appendFile(path.join(dataDirectory, "admin-audit.ndjson"), JSON.stringify(event) + "\n");
}

export async function enrollFactor(code?: string) {
  const session = await getAdminSession();
  if (!session) throw new Error("请登录");
  return enqueueWrite(async () => {
    if (await factorSecret()) throw new Error("动态验证已启用");
    const pendingFile = "admin-factor-pending.json";
    if (!code) {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
      const secret = Array.from({ length:32 },() => alphabet[randomInt(32)]).join("");
      await writeRaw(pendingFile, { secret, until:Date.now()+600000 });
      return { secret };
    }
    const pending = await readRaw(pendingFile,{ secret:"", until:0 });
    const step = matchTotp(pending.secret,code);
    if (pending.until < Date.now() || step < 0) throw new Error("验证码不正确或设置已过期");
    await writeRaw("admin-login-state.json",{ failures:0,until:0,lastStep:step });
    await writeRaw("admin-factor.json",{ secret:pending.secret });
    await fs.unlink(path.join(dataDirectory,pendingFile));
    await audit("启用动态验证","auth",session.username,[],session.username);
    return { enabled:true };
  });
}

export async function checkLogin(username: string, validPassword: boolean, code: string) {
  if (username !== process.env.ADMIN_USERNAME) return false;
  return enqueueWrite(async () => {
    const name = "admin-login-state.json";
    const state = await readRaw(name, { failures: 0, until: 0, lastStep: -1 });
    const now = Date.now();
    if (state.until <= now) { state.failures = 0; state.until = now + 15*60000; }
    if (state.failures >= 8) return false;
    const secret = await factorSecret();
    const step = validPassword && secret ? matchTotp(secret,code,now) : -1;
    const valid = validPassword && (!secret || (step >= 0 && step > state.lastStep));
    if (valid) { state.failures = 0; state.until = 0; state.lastStep = step; }
    else state.failures++;
    await writeRaw(name, state);
    await audit(valid ? "登录成功" : "验证失败", "auth", username, [], username);
    return valid;
  });
}

export async function recentAudit(): Promise<AuditEvent[]> {
  try {
    const contents = await fs.readFile(path.join(dataDirectory, "admin-audit.ndjson"), "utf8");
    return contents.trim().split("\n").filter(Boolean).slice(-300).reverse().map(line => JSON.parse(line));
  } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}

async function readJson<T>(name: string, fallback: T): Promise<T> {
  const value = await readRaw(name, fallback);
  return archiveSources[name] && Array.isArray(value) ? value.filter(row => !row._trash) as T : value;
}

async function writeJson<T>(name: string, value: T) {
  const config = archiveSources[name];
  if (!config && name !== "settings.json" && name !== "legal-documents.json") return writeRaw(name, value);
  const prior = await readRaw<unknown>(name, config?.defaults ?? (name === "settings.json" ? defaultSiteSettings : defaultLegalDocuments));
  const key = config?.key ?? "id";
  const oldRows: StoredRow[] = Array.isArray(prior) ? prior : [prior as StoredRow];
  const newRows: StoredRow[] = Array.isArray(value) ? value : [value as StoredRow];
  const hidden = oldRows.filter(row => row._trash);
  const oldById = new Map(oldRows.map(row => [row[key],row]));
  if (newRows.some(row => oldById.get(row[key])?._trash)) throw new Error("此标识位于回收站，请先恢复或使用新标识");
  const session = await getAdminSession();
  await writeRaw(name, Array.isArray(value) ? [...newRows, ...hidden] : value);
  if (!session) return;
  for (const row of newRows) {
    const old = oldById.get(row[key]);
    const fields = [...new Set([...Object.keys(old ?? {}), ...Object.keys(row)])].filter(field =>
      JSON.stringify(old?.[field]) !== JSON.stringify(row[field]));
    const describe = (value: unknown) => {
      if (Array.isArray(value)) return `${value.length} 项`;
      if (value && typeof value === "object") return Object.keys(value).join("、");
      return String(value ?? "空").slice(0,100);
    };
    const changes = old ? fields.map(field => `${field}：${describe(old[field])} → ${describe(row[field])}`) : fields;
    if (changes.length) await audit(old ? "修改" : "新增", name, String(row[key] ?? "站点设置"), changes, session.username);
  }
  const retained = new Set(newRows.map(row => row[key]));
  for (const old of oldRows) if (!old._trash && !retained.has(old[key])) {
    await audit("更改标识", name, String(old[key]), [key], session.username);
  }
}

async function markContent(source: string, id: string, restore = false) {
  const config = archiveSources[source];
  const actor = (await getAdminSession())?.username;
  if (!config || !actor) throw new Error("操作无效");
  return enqueueWrite(async () => {
    const rows = await readRaw(source, config.defaults as StoredRow[]);
    const row = rows.find(item => item[config.key] === id && Boolean(item._trash) === restore);
    if (!row) return false;
    if (restore) delete row._trash;
    else row._trash = { at: new Date().toISOString(), actor };
    await writeRaw(source, rows);
    await audit(restore ? "恢复" : "移入回收站", source, id, [], actor);
    return true;
  });
}

type RecycledFile = { name: string; url: string } & Stamp;
const fileBin = "recycled-uploads.json";
export async function listTrash() {
  const groups = await Promise.all(Object.entries(archiveSources).map(async ([source,config]) => {
    const rows = await readRaw(source, config.defaults as StoredRow[]);
    return rows.filter(row => row._trash).map(row => ({ source, id: String(row[config.key]),
      title: String(row.title ?? row.name ?? row.gameSlug ?? row[config.key]), ...row._trash! }));
  }));
  const files = await readRaw<RecycledFile[]>(fileBin, []);
  return [...groups.flat(), ...files.map(file => ({ ...file, source: "uploads", id: file.url, title: file.name }))]
    .sort((a,b) => b.at.localeCompare(a.at));
}

export async function restoreItem(source: string, id: string) {
  if (source !== "uploads") return markContent(source, id, true);
  const actor = (await getAdminSession())?.username;
  if (!actor) throw new Error("请登录");
  return enqueueWrite(async () => {
    const items = await readRaw<RecycledFile[]>(fileBin, []);
    const next = items.filter(file => file.url !== id);
    if (next.length === items.length) return false;
    await writeRaw(fileBin, next);
    await audit("恢复", source, id, [], actor);
    return true;
  });
}

function enqueueWrite<T>(callback: () => Promise<T>): Promise<T> {
  const operation = (queue.zbcContentWrite ?? Promise.resolve()).then(callback);
  queue.zbcContentWrite = operation.catch(() => undefined);
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

function effectiveGameBadge(game: Game, cutoff = formatGameDate(new Date(Date.now() - gameBadgeDuration))): Game["badge"] {
  if (game.badge !== "新游" && game.badge !== "更新") return game.badge;
  if (game.updated >= cutoff || !/^\d{4}-\d{2}-\d{2}$/.test(game.updated)) return game.badge;

  const date = new Date(`${game.updated}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === game.updated ? "精选" : game.badge;
}

export const listGames = cache(async function listGames(): Promise<Game[]> {
  const [games, viewStats, downloads] = await Promise.all([
    readJson("games.json", defaultGames),
    readJson("view-stats.json", emptyViewStats),
    readJson<Record<string, DownloadStat>>("download-counts.json", {}),
  ]);
  const cutoff = formatGameDate(new Date(Date.now() - gameBadgeDuration));
  return games.map((game) => ({
    ...game,
    badge: effectiveGameBadge(game, cutoff),
    downloadCount: downloads[game.communityId ?? game.slug]?.total ?? 0,
    views: effectiveViewTotal(viewStats[game.slug]),
  }));
});

export async function findGame(slug: string): Promise<Game | undefined> {
  return (await listGames()).find((game) => game.slug === slug);
}

async function verifyResourceIds(ids: string[] | undefined, previousIds: string[] = []) {
  const added = ids?.filter((id) => !previousIds.includes(id));
  if (!added?.length) return;
  const choices = new Set((await listResources()).filter(({ group }) => group !== "tools").map(resourceReferenceId));
  if (added.some((id) => !choices.has(id))) throw new Error("所选资源已删除或不属于 MOD、修改器、存档，请刷新后重新选择");
}

export async function createGame(game: Game): Promise<Game> {
  const created = { ...game, communityId: randomUUID(), updatedAt: editTimestamp(game.updated), views: 0 };
  await updateJson("games.json", defaultGames, async (items) => {
    if (items.some((item) => item.slug === created.slug)) throw new Error("游戏标识已存在");
    await verifyResourceIds(created.resourceIds);
    return [created, ...items];
  });
  return { ...created, badge: effectiveGameBadge(created) };
}

export async function updateGame(originalSlug: string, game: Game): Promise<Game> {
  await enqueueWrite(async () => {
    const items = await readJson("games.json", defaultGames);
    const index = items.findIndex((item) => item.slug === originalSlug);
    if (index < 0) throw new Error("游戏不存在");
    if (game.slug !== originalSlug && items.some((item) => item.slug === game.slug)) throw new Error("新的游戏标识已存在");
    await verifyResourceIds(game.resourceIds, items[index].resourceIds);
    const next = [...items];
    next[index] = { ...game, communityId: items[index].communityId ?? originalSlug, updatedAt: editTimestamp(game.updated,items[index]), resourceIds: game.resourceIds ?? items[index].resourceIds, views: 0 };
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

export function deleteGame(slug: string) {
  return markContent("games.json", slug);
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

type DownloadStat = { total: number; day: string; visitors: Record<string, true> };

export async function countDownload(slug: string, provider: string, visitor: string) {
  await enqueueWrite(async () => {
    const games = await readJson("games.json", defaultGames);
    const game = games.find(item => item.slug === slug);
    if (!game?.downloads.some(line => line.id === provider && line.qrCode)) return;
    const counts = await readJson<Record<string, DownloadStat>>("download-counts.json", {});
    const id = game.communityId ?? slug;
    const day = formatGameDate();
    const old = Object.hasOwn(counts,id) ? counts[id] : undefined;
    const visitors = old?.day === day ? old.visitors : {};
    if (Object.hasOwn(visitors,visitor)) return;
    counts[id] = { total: (old?.total ?? 0) + 1, day, visitors: { ...visitors, [visitor]: true } };
    await writeJson("download-counts.json", counts);
  });
}

export function listResources(): Promise<ResourceItem[]> {
  return readJson("resources.json", defaultResources);
}

export async function findResource(id: string): Promise<ResourceItem | undefined> {
  return (await listResources()).find((resource) => resource.id === id);
}

function editTimestamp(date: string, old?: { updated: string; updatedAt?: string }) {
  return date === formatGameDate() ? new Date().toISOString() : date === old?.updated ? old.updatedAt : undefined;
}

export async function createResource(resource: ResourceItem): Promise<ResourceItem> {
  const created = { ...resource, updatedAt:editTimestamp(resource.updated), referenceId: randomUUID() };
  await updateJson("resources.json", defaultResources, (items) => {
    if (items.some((item) => item.id === resource.id)) throw new Error("资源标识已存在");
    return [created, ...items];
  });
  return created;
}

export async function updateResource(id: string, resource: ResourceItem): Promise<ResourceItem> {
  const updated = await updateJson("resources.json", defaultResources, (items) => {
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("资源不存在");
    if (resource.id !== id && items.some((item) => item.id === resource.id)) throw new Error("新的资源标识已存在");
    const next = [...items];
    next[index] = { ...resource, updatedAt:editTimestamp(resource.updated,items[index]), referenceId: resourceReferenceId(items[index]) };
    return next;
  });
  return updated.find((item) => item.id === resource.id)!;
}

export function deleteResource(id: string) {
  return markContent("resources.json", id);
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
    guide = { ...guide, updatedAt:editTimestamp(guide.updated) };
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
    guide = { ...guide, updatedAt:editTimestamp(guide.updated,items[index]) };
    next[index] = guide;
    return next;
  });
  return guide;
}

export function deleteGuide(id: string) {
  return markContent("guides.json", id);
}

export function listFeedback(): Promise<FeedbackRecord[]> {
  return readJson("feedback.json", []).then((items: FeedbackRecord[]) =>
    items.map((item) => ({ ...item, status: item.status ?? "pending" })),
  );
}

export async function createFeedback(record: FeedbackRecord, picture?: Buffer) {
  return enqueueWrite(async () => {
    const items = await readJson<FeedbackRecord[]>("feedback.json", []);
    const prior = items.find(item => item.fingerprint === record.fingerprint && Date.parse(item.createdAt) > Date.now() - 86400000);
    if (prior) return prior.id;
    if (picture) {
      const directory = path.join(dataDirectory, "feedback-images");
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(path.join(directory, record.id), picture, { flag: "wx" });
      record.screenshot = `/api/admin/feedback/${record.id}/image`;
    }
    await writeJson("feedback.json", [record, ...items]);
    return record.id;
  });
}

export async function feedbackImage(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) return null;
  try { return await fs.readFile(path.join(dataDirectory, "feedback-images", id)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}

export function parseScreenshot(value: unknown) {
  if (!value) return undefined;
  const match = typeof value === "string" && /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+=*)$/.exec(value);
  if (!match) throw new Error("请选择 JPG、PNG 或 WebP 截图");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 512 * 1024 || !hasImageSignature(bytes, "." + match[1])) throw new Error("截图格式无效或超过 512 KB");
  return bytes;
}

export async function updateFeedbackBatch(ids: string[], patch: Pick<FeedbackRecord, "status" | "note">) {
  const selected = new Set(ids);
  const items = await updateJson<FeedbackRecord[]>("feedback.json", [], entries => {
    if (entries.filter(item => selected.has(item.id)).length !== selected.size) throw new Error("所选反馈已变更，请刷新");
    return entries.map(item => selected.has(item.id) ? { ...item, status: patch.status, note: patch.note ?? item.note } : item);
  });
  return items.filter(item => selected.has(item.id));
}

export async function updateFeedback(id: string, patch: Pick<FeedbackRecord, "status" | "note">) {
  return (await updateFeedbackBatch([id], patch))[0];
}

export type GameComment = { answer?: string; id: string; nickname: string; message: string; createdAt: string };
type CommentRecord = GameComment & { gameSlug: string; authorKey: string };

export async function commentQuestions() {
  const all = await readJson<CommentRecord[]>("comments.json", []);
  const games = await listGames();
  const titles = new Map(games.map(game => [game.communityId ?? game.slug,game.title]));
  return all.filter(item => titles.has(item.gameSlug)).map(({ id,gameSlug,nickname,message,answer }) => ({
    id,game:titles.get(gameSlug)!, nickname,message,answer,
  }));
}

export async function answerComment(id: string, answer: string) {
  const actor = (await getAdminSession())?.username;
  if (!actor || answer.length > 1200) throw new Error("答案最多 1200 字");
  await enqueueWrite(async () => {
    const rows = await readRaw<CommentRecord[]>("comments.json", []);
    const row = rows.find(item => item.id === id);
    if (!row) throw new Error("评论不存在");
    row.answer = answer.trim() || undefined;
    await writeRaw("comments.json",rows);
    await audit(row.answer ? "置顶 FAQ 答案" : "撤下 FAQ 答案","comments",id,[row.message, answer],actor);
  });
}

export async function gameComments(slug: string) {
  const items = await readJson<CommentRecord[]>("comments.json", []);
  return items.filter(item => item.gameSlug === slug).map(({ authorKey, gameSlug, ...comment }) => comment);
}

export async function addComment(gameSlug: string, nickname: string, message: string, authorKey: string) {
  const item = { id: randomUUID(), gameSlug, nickname, message, authorKey, createdAt: new Date().toISOString() };
  await updateJson<CommentRecord[]>("comments.json", [], items => {
    if (items.some(old => old.gameSlug === gameSlug && old.authorKey === authorKey && old.message === message
      && Date.parse(old.createdAt) > Date.now() - 86400000)) throw new Error("这条评论已经提交");
    return [item, ...items];
  });
}

export function deleteFeedback(id: string) {
  return markContent("feedback.json", id);
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const stored = await readJson<Partial<SiteSettings>>("settings.json", defaultSiteSettings);
  return {
    ...defaultSiteSettings,
    ...stored,
    categoryIntroductions: {
      ...defaultSiteSettings.categoryIntroductions,
      ...(stored.categoryIntroductions ?? {}),
    },
  };
}

export async function saveSiteSettings(settings: SiteSettings): Promise<SiteSettings> {
  await enqueueWrite(() => writeJson("settings.json", settings));
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
  const [hidden, references] = await Promise.all([readRaw<RecycledFile[]>(fileBin, []), referencedMedia()]);
  const archived = new Set(hidden.map(item => item.url));
  return [...remoteRecords, ...localRecords].filter(item => !archived.has(item.url))
    .map(item => ({ ...item, referenced: references.has(mediaKey(item.url)) })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function errorCode(error: unknown) {
  if (!error || typeof error !== "object") return "UNKNOWN";
  const candidate = error as { code?: unknown; name?: unknown };
  return String(candidate.code || candidate.name || "UNKNOWN");
}

export async function saveUpload(file: File, owner = "shared", purpose = "file"): Promise<UploadRecord> {
  const kind = getUploadKind(file.name);
  if (!kind) throw new Error("不支持该文件格式");
  if (file.size <= 0) throw new Error("文件内容为空");
  if (kind === "image" && file.size > 5 * 1024 * 1024) throw new Error("单张图片不能超过 5 MB");
  if (kind !== "image" && file.size > 128 * 1024 * 1024) throw new Error("单个附件不能超过 128 MB，大文件请使用网盘链接");
  const extension = path.extname(file.name).toLowerCase();
  const stem = path.basename(file.name, extension).normalize("NFKC").replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "file";
  if (!/^[a-z0-9-]{1,80}$/.test(owner) || !/^[a-z0-9-]{1,32}$/.test(purpose)) throw new Error("请先填写有效的游戏或资源标识");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 20);
  const label = purpose === "file" ? stem : purpose;
  const filename = `${owner}-${label}-${formatGameDate()}-${hash}${extension}`;
  const name = kind === "image" ? `${owner}/${filename}` : filename;
  return enqueueWrite(async () => {
    if (kind === "image") {
      if (!hasImageSignature(bytes, extension)) throw new Error("图片内容与文件格式不匹配或文件已损坏");
      const key = `uploads/${name}`;
      const url = await putObject(key, bytes, imageContentTypes[extension]);
      await registerUpload(name, url);
      return { name, url, size: file.size, updatedAt: new Date().toISOString(), kind };
    }
    await fs.mkdir(uploadDirectory, { recursive: true });
    const target = path.join(uploadDirectory, name);
    try { await fs.writeFile(target, bytes, { flag: "wx" }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    await registerUpload(name, `/uploads/${encodeURIComponent(name)}`);
    return { name, url: `/uploads/${encodeURIComponent(name)}`, size: file.size, updatedAt: new Date().toISOString(), kind };
  });
}

async function registerUpload(name: string, url: string) {
  const actor = (await getAdminSession())?.username;
  if (!actor) throw new Error("请登录");
  const archived = await readRaw<RecycledFile[]>(fileBin, []);
  if (archived.some(item => item.url === url)) await writeRaw(fileBin, archived.filter(item => item.url !== url));
  await audit("上传", "uploads", name, [], actor);
}

function mediaKey(value: string) {
  try {
    const url = new URL(value, "https://zbcyx.com");
    return decodeURIComponent(url.pathname).replace(/^\/media\/uploads\//, "/uploads/");
  } catch { return value; }
}

async function referencedMedia() {
  const datasets = await Promise.all([
    ...Object.entries(archiveSources).map(([source, config]) => readRaw(source, config.defaults)),
    listLegalDocuments(), getSiteSettings(),
  ]);
  const references = new Set<string>();
  function visit(value: unknown) {
    if (typeof value === "string") {
      if (value.startsWith("/") || value.startsWith("https://") || value.startsWith("http://")) references.add(mediaKey(value));
      for (const match of value.matchAll(/(?:https?:\/\/[^\s"'<>()[\]]+|\/(?:media\/)?uploads\/[^\s"'<>()[\]]+)/g)) references.add(mediaKey(match[0]));
    } else if (value && typeof value === "object") Object.values(value).forEach(visit);
  }
  datasets.forEach(visit);
  return references;
}

export async function recycleUploads(urls: string[]) {
  const actor = (await getAdminSession())?.username;
  if (!actor) throw new Error("请登录");
  const catalog = await listUploads();
  const byUrl = new Map(catalog.map(item => [item.url, item]));
  return enqueueWrite(async () => {
    const refs = await referencedMedia();
    const items = await readRaw<RecycledFile[]>(fileBin, []);
    const hidden = new Set(items.map(item => item.url));
    const added: RecycledFile[] = [];
    for (const url of new Set(urls)) {
      if (hidden.has(url)) continue;
      const file = byUrl.get(url);
      if (!file || refs.has(mediaKey(url))) throw new Error("文件已被引用或文件库已变更");
      added.push({ name: file.name, url, at: new Date().toISOString(), actor });
    }
    await writeRaw(fileBin, [...added, ...items]);
    for (const file of added) await audit("移入回收站", "uploads", file.name, [], actor);
    return added.length;
  });
}

export async function purgeRecycledFile(url: string) {
  const actor = (await getAdminSession())?.username;
  if (!actor) throw new Error("请登录");
  return enqueueWrite(async () => {
    const files = await readRaw<RecycledFile[]>(fileBin, []);
    const file = files.find(item => item.url === url);
    if (!file) throw new Error("回收站中找不到此文件");
    if ((await referencedMedia()).has(mediaKey(url))) throw new Error("文件仍被引用");
    if (url.startsWith("/uploads/")) {
      if (path.basename(file.name) !== file.name || file.name.startsWith(".")) throw new Error("文件名无效");
      await fs.rm(path.join(uploadDirectory,file.name), { force:true });
    } else {
      if (file.name.split("/").some(part => !part || part.startsWith(".") || part.includes("\\"))) throw new Error("对象名称无效");
      await deleteObject("uploads/" + file.name);
    }
    await writeRaw(fileBin, files.filter(item => item !== file));
    await audit("彻底删除","uploads",file.name,[],actor);
  });
}

export async function deleteUpload(name: string) {
  const matches = (await listUploads()).filter(item => item.name === name);
  if (matches.length !== 1) return false;
  return Boolean(await recycleUploads([matches[0].url]));
}
