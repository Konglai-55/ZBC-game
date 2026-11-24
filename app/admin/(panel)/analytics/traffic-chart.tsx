"use client";

import { useState } from "react";
import styles from "./analytics.module.css";

const metricOptions = [
  { key: "pageViews", label: "页面浏览" },
  { key: "requests", label: "源站请求" },
  { key: "bytes", label: "传输量" },
  { key: "viewReports", label: "阅读上报" },
] as const;

type Metric = (typeof metricOptions)[number]["key"];
type Point = { key: string; label: string; partial?: boolean } & Record<Metric, number>;

export function TrafficChart({ points, hourly }: { points: Point[]; hourly: boolean }) {
  const [metric, setMetric] = useState<Metric>("pageViews");
  const [selection, setSelection] = useState<string>();
  const selected = points.find((point) => point.key === selection) ?? points.at(-1);
  const peak = Math.max(0, ...points.map((point) => point[metric]));
  const format = (value: number, compact = false) => metric === "bytes"
    ? value >= 1e9 ? `${(value / 1e9).toFixed(2)} GB` : value >= 1e6 ? `${(value / 1e6).toFixed(1)} MB` : `${Math.round(value / 1e3)} KB`
    : new Intl.NumberFormat("zh-CN", compact ? { notation: "compact", maximumFractionDigits: 1 } : {}).format(value);

  return (
    <section className={styles.trend} aria-labelledby="zbc-traffic-trend">
      <div className={styles.sectionHead}>
        <h2 id="zbc-traffic-trend">访问趋势</h2>
        <div className={styles.metrics} role="group" aria-label="切换趋势指标">
          {!hourly && metricOptions.map(({ key, label }) => (
            <button key={key} type="button" aria-pressed={metric === key} onClick={() => setMetric(key)}>{label}</button>
          ))}
        </div>
      </div>
      <div className={styles.reading} aria-live="polite">
        <span>{selected?.label}{selected?.partial ? " · 未结束" : ""}</span>
        <strong>{format(selected?.[metric] ?? 0)}</strong>
      </div>
      <div className={styles.plot}>
        <div className={styles.scale} aria-hidden="true">{[peak, peak / 2, 0].map((value, index) => <span key={index}>{format(Math.round(value), true)}</span>)}</div>
        <div className={styles.columns} style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
          {points.map((point, index) => (
            <button type="button" key={point.key} className={styles.column} data-selected={selected?.key === point.key} data-partial={point.partial || undefined}
              onClick={() => setSelection(point.key)} aria-pressed={selected?.key === point.key} aria-label={`${point.label} ${format(point[metric])}`} title={`${point.label} · ${format(point[metric])}`}>
              <span className={styles.barTrack}><span className={styles.bar} style={{ height: `${peak ? 100 * point[metric] / peak : 0}%` }} /></span>
              <span className={styles.tick} data-minor={points.length > 14 && index % 3 !== 0 && index !== points.length - 1 || undefined}>{point.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
