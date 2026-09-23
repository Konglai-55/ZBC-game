"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GameArtwork } from "@/components/game-artwork";
import { Icon } from "@/components/icon";
import { getPlatform } from "@/lib/data";
import type { Game } from "@/lib/types";

type RankingMode = "week" | "month" | "history";

const tabs: Array<{ key: RankingMode; label: string }> = [
  { key: "week", label: "本周最热" },
  { key: "month", label: "本月最热" },
  { key: "history", label: "历史最热" },
];

export function DetailRanking({ games }: { games: Game[] }) {
  const [mode, setMode] = useState<RankingMode>("week");
  const ranked = useMemo(() => [...games].sort((a, b) => {
    if (mode === "month") return b.score - a.score || b.views - a.views || b.updated.localeCompare(a.updated);
    if (mode === "history") return b.views + b.score * 100 - (a.views + a.score * 100) || b.updated.localeCompare(a.updated);
    return b.views - a.views || b.score - a.score || b.updated.localeCompare(a.updated);
  }).slice(0, 9), [games, mode]);

  return (
    <section className="detail-random detail-ranking" aria-labelledby="detail-ranking-title">
      <div className="detail-ranking__tabs" id="detail-ranking-title" role="tablist" aria-label="热门榜单周期">
        {tabs.map((tab) => <button className={mode === tab.key ? "is-active" : ""} key={tab.key} type="button" role="tab" aria-selected={mode === tab.key} onClick={() => setMode(tab.key)}>{tab.label}</button>)}
      </div>
      <div className="detail-ranking__list">
        {ranked.map((item, index) => (
          <Link href={`/games/${item.slug}`} key={item.slug} target="_blank" rel="noopener noreferrer">
            <span className={`detail-ranking__rank rank-${index + 1}`}>{String(index + 1).padStart(2, "0")}</span>
            <GameArtwork game={item} variant="compact" />
            <span className="detail-ranking__copy"><strong>{item.title}<em>{item.badge}</em></strong><small><Icon name="star" size={12} />{item.score} · {item.size} · {getPlatform(item.platform)?.shortLabel} · {item.genre}</small></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
