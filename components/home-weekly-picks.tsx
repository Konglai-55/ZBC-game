"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GameCard, RankedGame } from "@/components/game-card";
import { Icon } from "@/components/icon";
import type { Game } from "@/lib/types";

type SortMode = "latest" | "hot";

export function HomeWeeklyPicks({ games, initialSort }: { games: Game[]; initialSort: SortMode }) {
  const [sort, setSort] = useState<SortMode>(initialSort);
  const weeklyGames = useMemo(() => games.filter((game) => game.platform === "pc").sort((a, b) => sort === "hot" ? b.views - a.views || b.score - a.score : b.updated.localeCompare(a.updated)).slice(0, 16), [games, sort]);
  const rankedGames = useMemo(() => [...games].sort((a, b) => b.views - a.views || b.score - a.score).slice(0, 9), [games]);

  function selectSort(nextSort: SortMode) {
    setSort(nextSort);
    window.history.replaceState(null, "", `/?sort=${nextSort}#weekly-picks`);
  }

  return (
    <section className="section shell" id="weekly-picks">
      <div className="section-heading">
        <div>
          <span className="eyebrow"><Icon name="sparkles" size={15} />本周推荐</span>
          <h2>必玩电脑游戏</h2>
          <p>{sort === "hot" ? "按阅读量查看当前最受欢迎的电脑游戏。" : "按发布时间查看当前最新的电脑游戏。"}</p>
        </div>
        <div className="section-heading__actions">
          <nav className="sort-toggle" aria-label="内容排序">
            <button className={sort === "latest" ? "is-active" : ""} type="button" aria-pressed={sort === "latest"} onClick={() => selectSort("latest")}>最新</button>
            <button className={sort === "hot" ? "is-active" : ""} type="button" aria-pressed={sort === "hot"} onClick={() => selectSort("hot")}>热门</button>
          </nav>
          <Link className="text-link" href="/category/pc">查看全部 <Icon name="arrow-right" size={17} /></Link>
        </div>
      </div>
      <div className="home-content-grid">
        <div className="game-grid">
          {weeklyGames.map((game) => <GameCard game={game} key={game.slug} />)}
        </div>
        <aside className="ranking-panel ranking-panel--sticky">
          <div className="ranking-panel__heading"><span><Icon name="trending" size={18} />全站热门</span><small>实时</small></div>
          <div className="ranking-list">{rankedGames.map((game, index) => <RankedGame game={game} rank={index + 1} key={game.slug} />)}</div>
        </aside>
      </div>
    </section>
  );
}
