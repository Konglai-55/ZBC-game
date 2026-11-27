import type { Game } from "./types";

export type GameSummary = Omit<Game, "downloads" | "description" | "requirements" | "resourceIds"> & { updatedLabel?: string };
export function summary({ downloads, description, requirements, resourceIds, ...card }: Game): GameSummary {
  return { ...card, updatedLabel:relativeDate(card.updated,card.updatedAt) };
}

export function relativeDate(date: string, timestamp?: string, now = Date.now()) {
  if (timestamp) {
    const minutes = Math.floor((now - Date.parse(timestamp)) / 60000);
    if (minutes >= 0 && minutes < 60) return minutes ? `${minutes}分钟前` : "刚刚";
    if (minutes >= 60 && minutes < 1440) return `${Math.floor(minutes / 60)}小时前`;
  }
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return parts ? `${Number(parts[2])}月${Number(parts[3])}日` : date;
}

export function updatePeriods(now = new Date()) {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(now);
  const monday = new Date(today + "T00:00:00Z");
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  return { today, week: monday.toISOString().slice(0, 10), month: today.slice(0, 7) + "-01" };
}

export function recommendations(game: Game, games: Game[]) {
  const weight = (item: Game) => Number(Boolean(game.series && item.series === game.series)) * 4
    + Number(Boolean(game.genre && item.genre === game.genre)) * 2
    + Number(Boolean(game.category && item.category === game.category));
  return games.filter(item => item.slug !== game.slug && weight(item) > 0)
    .sort((a, b) => weight(b) - weight(a) || b.views - a.views).slice(0, 8);
}

export function discoveryPage(games: Game[], platform: string, sort: string, page: number) {
  const scoped = games.filter(game => game.platform === platform);
  scoped.sort((a,b) => sort === "hot" ? b.views-a.views || b.score-a.score : b.updated.localeCompare(a.updated));
  const pageCount = Math.max(1,Math.ceil(scoped.length/10));
  const current = Math.max(1, Math.min(Number.isSafeInteger(page) ? page : 1, pageCount));
  return { items: scoped.slice((current-1)*10,current*10).map(summary), page: current, pageCount };
}

export function weeklySelection(games: Game[]) {
  const byHeat = (a: Game,b: Game) => b.views-a.views || b.score-a.score;
  const pc = games.filter(game => game.platform === "pc");
  const selected = new Set([...pc.sort(byHeat).slice(0,16), ...pc.sort((a,b) => b.updated.localeCompare(a.updated)).slice(0,16),
    ...[...games].sort(byHeat).slice(0,18)]);
  return games.filter(game => selected.has(game)).map(summary);
}

export function rankingScore(mode: string, a: GameSummary,b: GameSummary) {
  if (mode === "month") return b.score-a.score || b.views-a.views || b.updated.localeCompare(a.updated);
  if (mode === "history") return b.views+b.score*100-(a.views+a.score*100) || b.updated.localeCompare(a.updated);
  return b.views-a.views || b.score-a.score || b.updated.localeCompare(a.updated);
}
