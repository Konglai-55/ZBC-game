import { downloadProviders } from "@/lib/activity-events";
import { listGames, listResources } from "@/lib/content-store";
import type { readSiteActivity } from "@/lib/site-activity-store";
import styles from "./analytics.module.css";

const number = new Intl.NumberFormat("zh-CN");

function ContentRanking({ title, items, names }: { title: string; items: Map<string, number>; names?: Map<string, string> }) {
  const rows = [...items].sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b, "zh-CN")).slice(0, 10);
  const max = rows[0]?.[1] ?? 1;
  return (
    <section className={styles.detail}>
      <header><h2>{title}</h2><small>次数</small></header>
      {rows.length ? <ol className={styles.contentRanking}>
        {rows.map(([key, count], position) => <li key={key}>
          <span className={styles.rankIndex} aria-hidden="true">{position + 1}</span>
          <span title={names?.get(key) ?? key}>{names?.get(key) ?? key}</span>
          <strong>{number.format(count)}</strong>
          <span className={styles.rankTrack} aria-hidden="true"><span style={{ width: `${100 * count / max}%` }} /></span>
        </li>)}
      </ol> : <p className={styles.empty}>这个时段暂无记录。</p>}
    </section>
  );
}

export async function ContentPerformance({ activity, days }: { activity: Awaited<ReturnType<typeof readSiteActivity>>; days: number }) {
  const [games, resources] = activity.downloads.size ? await Promise.all([listGames(), listResources()]) : [[], []];
  const titles = new Map([
    ...games.map((game) => [`game/${game.slug}`, game.title] as const),
    ...resources.map((resource) => [`resource/${resource.id}`, resource.name] as const),
  ]);
  const metrics = [
    ["搜索次数", number.format(activity.searchCount), "站内游戏搜索"],
    ["无结果搜索", number.format(activity.missCount), activity.searchCount ? `占搜索的 ${(100 * activity.missCount / activity.searchCount).toFixed(1)}%` : "按全站游戏库匹配"],
    ["下载入口点击", number.format(activity.downloadCount), "含网盘二维码与资源链接"],
    ["有采集记录", `${activity.recordedDays} / ${days} 天`, "按所选时间范围"],
  ];
  return <>
    <div className={styles.summary}>{metrics.map(([title, value, note], index) =>
      <div key={title}><span>{title}</span><strong>{activity.recordedDays || index === 3 ? value : "—"}</strong><small>{note}</small></div>,
    )}</div>
    {activity.recordedDays < days && <p className={styles.coverage} role="status">{activity.recordedDays
      ? `当前范围内有 ${days - activity.recordedDays} 天没有采集记录，以下仅统计已记录的数据。`
      : "搜索和下载点击从功能启用后开始采集，请用「今天」查看当天的数据。"}</p>}
    <div className={styles.contentGrid}>
      <ContentRanking title="热门搜索" items={activity.searches} />
      <ContentRanking title="无结果搜索" items={activity.misses} />
      <ContentRanking title="下载入口排行" items={activity.downloads} names={titles} />
      <ContentRanking title="下载渠道" items={activity.providers} names={new Map(Object.entries(downloadProviders))} />
    </div>
    <details className={styles.method}><summary>统计口径</summary>
      <p>搜索词按大小写和空格归并，过滤疑似联系方式与链接。无结果以全站游戏库匹配为准。下载入口点击包括打开网盘二维码和点击资源链接，实际下载是否完成由第三方网盘决定。</p>
    </details>
  </>;
}
