import "server-only";

import { appendFile, mkdir, readdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { ActivityEvent } from "@/lib/activity-events";
import { trafficDates } from "@/lib/site-analytics";

type Visit = { type: "visit"; visitor: string; firstDay: string };
type StoredEvent = Visit | Exclude<ActivityEvent, { type: "visit" }>;
const directory = process.env.ZBC_ACTIVITY_DIR || path.join(process.cwd(), "data", "site-activity");
const logName = /^\d{4}-\d{2}-\d{2}\.ndjson$/;
let prepared: { day: string; result: Promise<void> } | undefined;

async function prepareDirectory() {
  await mkdir(directory, { recursive: true, mode: 0o750 });
  const cutoff = trafficDates(30)[0] + ".ndjson";
  for (const file of await readdir(directory)) {
    if (logName.test(file) && file < cutoff) {
      await unlink(path.join(directory, file)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
  }
}

export async function appendSiteActivity(day: string, event: StoredEvent) {
  if (prepared?.day !== day) {
    const result = prepareDirectory().catch((error: unknown) => {
      if (prepared?.day === day) prepared = undefined;
      throw error;
    });
    prepared = { day, result };
  }
  await prepared.result;
  await appendFile(path.join(directory, day + ".ndjson"), JSON.stringify(event) + "\n", { mode: 0o640 });
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

export async function readSiteActivity(dates: string[]) {
  const tally = {
    visitors: new Map<string, string>(), searches: new Map<string, number>(),
    misses: new Map<string, number>(), providers: new Map<string, number>(),
    downloads: new Map<string, number>(), searchCount: 0, missCount: 0, downloadCount: 0, recordedDays: 0,
  };
  for (const day of dates) {
    let log: string;
    try {
      log = await readFile(path.join(directory, day + ".ndjson"), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      continue;
    }
    ++tally.recordedDays;
    for (const line of log.trim().split("\n")) {
      if (!line) continue;
      let record: StoredEvent;
      try { record = JSON.parse(line) as StoredEvent; } catch { continue; }
      if (record.type === "visit") {
        const first = tally.visitors.get(record.visitor);
        if (!first || record.firstDay < first) tally.visitors.set(record.visitor, record.firstDay);
      } else if (record.type === "search") {
        ++tally.searchCount;
        increment(tally.searches, record.term);
        if (record.noResults) {
          ++tally.missCount;
          increment(tally.misses, record.term);
        }
      } else if (record.type === "download") {
        ++tally.downloadCount;
        increment(tally.providers, record.provider);
        increment(tally.downloads, `${record.kind}/${record.id}`);
      }
    }
  }
  const first = dates[0];
  const newVisitors = [...tally.visitors.values()].filter((value) => value >= first).length;
  return { ...tally, totalVisitors: tally.visitors.size, newVisitors, returningVisitors: tally.visitors.size - newVisitors };
}
