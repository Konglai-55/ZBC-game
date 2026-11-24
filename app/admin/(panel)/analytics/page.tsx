import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { requireAdminPage } from "@/lib/admin-auth";
import { listGames } from "@/lib/content-store";
import { readSiteAnalytics, trafficDates, type TrafficDay } from "@/lib/site-analytics";
import { TrafficChart } from "./traffic-chart";
import styles from "./analytics.module.css";

export const metadata: Metadata = { title: "站长统计" };

const number = new Intl.NumberFormat("zh-CN");
const ranges = [
  { key: "today", label: "今天", days: 1 },
  { key: "7", label: "近 7 天", days: 7 },
  { key: "14", label: "近 14 天", days: 14 },
] as const;
const rankings = [
  { key: "pages", label: "热门页面" },
  { key: "games", label: "热门游戏" },
  { key: "sources", label: "访问来源" },
] as const;
const headings = ["日期", "页面浏览", "源站请求", "阅读上报", "传输量", "4xx", "5xx", "平均耗时"];
const sourceLabels: Record<string, string> = {
  "(none)": "无来源记录", "(internal)": "站内跳转", "(unknown)": "无法识别", "(other)": "其他",
};
const pathLabels: Record<string, string> = {
  "/": "首页", "/search": "站内搜索", "/category/pc": "电脑游戏", "/category/switch": "Switch 游戏",
  "/category/mobile": "手机游戏", "/category/ps5": "PS5 游戏", "/category/ps4": "PS4 游戏",
  "/category/other": "其他游戏", "/resources": "资源列表", "/help": "帮助中心",
};

function transfer(value: number) {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GB`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)} MB`;
  return `${Math.round(value / 1e3)} KB`;
}

function rank(rows: TrafficDay[], key: "pages" | "sources" | "statuses" | "devices") {
  const totals = new Map<string, number>();
  for (const row of rows) {
    for (const [label, count] of Object.entries(row[key])) {
      totals.set(label, (totals.get(label) ?? 0) + count);
    }
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function Ranking({ selected, period, rows, label, total }: {
  selected: (typeof rankings)[number]["key"];
  period: (typeof ranges)[number]["key"];
  rows: [string, number][];
  label: (key: string) => string;
  total: number;
}) {
  return (
    <section className={styles.detail} aria-labelledby="traffic-ranking">
      <header><h2 id="traffic-ranking">流量排行</h2><small>按页面浏览量</small></header>
      <nav className={styles.rankTabs} aria-label="流量排行类型">{rankings.map(({ key, label: text }) => (
        <Link key={key} href={`/admin/analytics?range=${period}&ranking=${key}`} scroll={false} aria-current={key === selected ? "page" : undefined}>{text}</Link>
      ))}</nav>
      <div className={styles.rankHeader}><span>{rankings.find(({ key }) => key === selected)?.label}</span><span>次数</span><span>占比</span></div>
      {rows.length ? <ol className={styles.ranking}>
        {rows.map(([key, count], index) => {
          const percent = total ? 100 * count / total : 0;
          const name = label(key);
          return <li key={key}>
            <div><span className={styles.rankIndex} aria-hidden="true">{index + 1}</span><span className={styles.rankLabel} title={key}>{name}</span></div>
            <strong>{number.format(count)}</strong><small>{percent.toFixed(1)}%</small>
            <span className={styles.rankTrack} aria-hidden="true"><span style={{ width: `${percent}%` }} /></span>
          </li>;
        })}
      </ol> : <p className={styles.empty}>该时段暂无记录。</p>}
    </section>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string; ranking?: string }> }) {
  await requireAdminPage();
  const { range, ranking } = await searchParams;
  const period = ranges.find(({ key }) => key === range) ?? ranges[1];
  const selectedRanking = rankings.find(({ key }) => key === ranking)?.key ?? "pages";
  const [snapshot, games] = await Promise.all([readSiteAnalytics(), listGames()]);
  const today = period.key === "today";
  const now = new Date();
  const dates = trafficDates(period.days + Number(!today), now).slice(0, period.days);
  const days = dates.map((date) => ({ date, row: snapshot?.days[date] }));
  const rows = days.flatMap(({ row }) => row ? [row] : []);
  const total = (key: "pageViews" | "requests" | "bytes" | "viewReports" | "serverErrors" | "clientErrors" | "botRequests" | "requestSeconds") =>
    rows.reduce((sum, row) => sum + row[key], 0);
  const views = total("pageViews");
  const requests = total("requests");
  const mobile = rows.reduce((sum, row) => sum + (row.devices.mobile ?? 0), 0);
  const averageLatency = requests ? Math.round(total("requestSeconds") * 1000 / requests) : 0;
  const currentHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", hourCycle: "h23" }).format(new Date(snapshot?.updatedAt ?? now)));
  const points = today
    ? Array.from({ length: currentHour + 1 }, (_, hour) => ({
      key: String(hour), label: `${String(hour).padStart(2, "0")}:00`,
      pageViews: rows[0]?.hours[hour] ?? 0, requests: 0, bytes: 0, viewReports: 0, partial: hour === currentHour,
    }))
    : days.flatMap(({ date, row }) => row ? [{
      key: date, label: date.slice(5), pageViews: row.pageViews, requests: row.requests, bytes: row.bytes, viewReports: row.viewReports,
    }] : []);
  const gameNames = new Map(games.map((game) => [`/games/${game.slug}`, game.title]));
  const pages = rank(rows, "pages");
  const pageName = (path: string) => gameNames.get(path) ?? pathLabels[path] ?? path;
  const rankedItems = selectedRanking === "sources" ? rank(rows, "sources")
    : selectedRanking === "games" ? pages.filter(([url]) => url.startsWith("/games/")) : pages;
  const rankedName = selectedRanking === "sources" ? (key: string) => sourceLabels[key] ?? key : pageName;
  const peak = points.reduce<(typeof points)[number] | undefined>(
    (highest, point) => !highest || point.pageViews > highest.pageViews ? point : highest, undefined,
  );
  const updated = snapshot ? new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(snapshot.updatedAt)) : null;
  const stale = snapshot && now.getTime() - Date.parse(snapshot.updatedAt) > 35 * 60_000;
  const summary = [
    { title: "页面浏览", value: number.format(views), note: peak?.pageViews ? `峰值 ${peak.label}，${number.format(peak.pageViews)} 次` : "当前范围" },
    { title: "源站请求", value: number.format(requests), note: `识别到爬虫 ${number.format(total("botRequests"))} 次` },
    { title: "传输量", value: transfer(total("bytes")), note: "源站响应正文" },
    { title: "游戏阅读上报", value: number.format(total("viewReports")), note: "含重复上报" },
  ];

  return (
    <div className={`admin-page ${styles.analytics}`}>
      <header className={styles.pageHead}>
        <div><h1><Icon name="trending" size={29} />站长统计</h1><p>{dates[0]}{!today && ` 至 ${dates.at(-1)}`} · 北京时间</p></div>
        <div className={styles.controls}>
          <nav aria-label="统计时间范围">{ranges.map(({ key, label }) =>
            <Link key={key} href={`/admin/analytics?range=${key}&ranking=${selectedRanking}`} aria-current={period.key === key ? "page" : undefined}>{label}</Link>,
          )}</nav>
          {updated && <small>{stale ? "统计延迟 · " : ""}更新于 {updated}{today ? " · 今日数据未结束" : rows.length < days.length ? ` · ${days.length - rows.length} 天缺少记录` : ""}</small>}
        </div>
      </header>
      {!rows.length ? <section className={styles.detail}><h2>暂无统计数据</h2><p className={styles.empty}>{snapshot ? "这个日期范围内没有采集记录。" : "源站日志尚未生成统计快照。"}</p></section> : <>
        <div className={styles.summary}>{summary.map(({ title, value, note }) =>
          <div key={title}><span>{title}</span><strong>{value}</strong><small>{note}</small></div>,
        )}</div>
        <TrafficChart key={period.key} points={points} hourly={today} />
        <div className={styles.detailsGrid}>
          <Ranking selected={selectedRanking} period={period.key} rows={rankedItems.slice(0, 10)} label={rankedName} total={views} />
          <div className={styles.stack}>
            <section className={styles.detail}>
              <header><h2>访问设备</h2><small>按浏览器标识估算</small></header>
              <div className={styles.splitBar} aria-hidden="true"><span style={{ width: `${views ? 100 * mobile / views : 0}%` }} /></div>
              <div className={styles.deviceLegend}><span><i />桌面 <strong>{number.format(views - mobile)}</strong></span><span><i />移动 <strong>{number.format(mobile)}{views ? ` · ${(100 * mobile / views).toFixed(1)}%` : ""}</strong></span></div>
            </section>
            <section className={styles.detail}>
              <header><h2>源站状态</h2><small>响应与错误</small></header>
              <div className={styles.service}><span>平均响应<strong>{averageLatency} ms</strong></span><span>请求错误 4xx<strong>{number.format(total("clientErrors"))}</strong></span><span>服务错误 5xx<strong>{number.format(total("serverErrors"))}</strong></span></div>
              <details className={styles.method}><summary>查看状态码分布</summary><div className={styles.codes}>{rank(rows, "statuses").slice(0, 7).map(([code, count]) =>
                <span key={code}><b>{code}</b> {number.format(count)}</span>,
              )}</div></details>
            </section>
          </div>
        </div>
        <details className={`${styles.detail} ${styles.daily}`}>
          <summary><span>每日明细</span><small>{days.length} 天 · 北京时间</small><Icon name="chevron-down" size={18} /></summary>
          <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="每日统计明细">
            <table><thead><tr>{headings.map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
              <tbody>{[...days].reverse().map(({ date, row }) => <tr key={date}>
                <th scope="row">{date}</th>
                {row ? [number.format(row.pageViews), number.format(row.requests), number.format(row.viewReports), transfer(row.bytes), number.format(row.clientErrors), number.format(row.serverErrors), `${Math.round(1000 * row.requestSeconds / (row.requests || 1))} ms`].map((cell, index) => <td key={index}>{cell}</td>)
                  : <td colSpan={7}>暂无记录</td>}
              </tr>)}</tbody>
            </table>
          </div>
        </details>
        <details className={styles.method}><summary>统计口径</summary>
          <p>数据来自 zbcyx.com 与 www.zbcyx.com 的 Nginx 回源日志。页面浏览按成功的浏览器请求估算，已排除可识别的爬虫和预取。源站日志无法可靠统计独立访客（UV）。Cloudflare 缓存命中、对象存储直出和外部网盘下载未计入。请求耗时为 Nginx 源站耗时。</p>
        </details>
      </>}
    </div>
  );
}
