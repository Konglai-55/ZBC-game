import "server-only";

import { readFile } from "node:fs/promises";

export type TrafficDay = {
  requests: number;
  bytes: number;
  pageViews: number;
  viewReports: number;
  botRequests: number;
  clientErrors: number;
  serverErrors: number;
  requestSeconds: number;
  hours: number[];
  pages: Record<string, number>;
  sources: Record<string, number>;
  devices: Record<string, number>;
  statuses: Record<string, number>;
};

type Snapshot = {
  version: 1;
  updatedAt: string;
  days: Record<string, TrafficDay>;
};

export async function readSiteAnalytics(): Promise<Snapshot | null> {
  const path = process.env.ZBC_ANALYTICS_FILE || "/var/lib/zbc-analytics/snapshot.json";
  try {
    const data = JSON.parse(await readFile(path, "utf8")) as Snapshot;
    if (data.version !== 1 || !Number.isFinite(Date.parse(data.updatedAt)) || !data.days) {
      throw new Error("Invalid site analytics snapshot");
    }
    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("ZBC analytics read failed", error);
    return null;
  }
}

const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" });

export function trafficDates(days: number, today = new Date()) {
  return Array.from({ length: days }, (_, index) =>
    date.format(new Date(today.getTime() - (days - index - 1) * 86_400_000)),
  );
}
