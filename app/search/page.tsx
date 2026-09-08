import type { Metadata } from "next";
import Link from "next/link";
import { GameCard } from "@/components/game-card";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { SortToggle } from "@/components/sort-toggle";
import { platformMeta } from "@/lib/data";
import { listGames } from "@/lib/content-store";

export const metadata: Metadata = { title: "搜索游戏" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; platform?: string; sort?: string }> }) {
  const { q = "", platform, sort: requestedSort } = await searchParams;
  const sort = requestedSort === "hot" ? "hot" : "latest";
  const matches = searchGamesFrom(await listGames(), q).filter((game) => !platform || game.platform === platform);
  const results = [...matches].sort((a, b) => sort === "hot" ? b.views - a.views || b.score - a.score : b.updated.localeCompare(a.updated));
  const searchHref = (nextSort: "latest" | "hot") => `/search?q=${encodeURIComponent(q)}${platform ? `&platform=${encodeURIComponent(platform)}` : ""}&sort=${nextSort}`;
  const platformHref = (nextPlatform?: string) => `/search?q=${encodeURIComponent(q)}${nextPlatform ? `&platform=${encodeURIComponent(nextPlatform)}` : ""}&sort=${sort}`;
  return (
    <>
      <PageHero className="page-hero--search" eyebrow="SEARCH LIBRARY" title="搜索整个游戏资源库" description="输入名称、类型、分类或平台关键词，快速定位可用资源。" icon="search">
        <form className="page-search page-search--wide" action="/search"><Icon name="search" size={25} /><input aria-label="搜索游戏资源" autoFocus defaultValue={q} name="q" placeholder="例如：冒险、PC、多人联机…" /><button>搜索游戏 <Icon name="arrow-right" size={18} /></button></form>
      </PageHero>
      <div className="shell section search-page">
        <div className="search-platforms"><Link className={!platform ? "is-active" : ""} href={platformHref()}>全部平台</Link>{platformMeta.map((item) => <Link className={platform === item.key ? "is-active" : ""} href={platformHref(item.key)} key={item.key}>{item.label}</Link>)}</div>
        <div className="list-heading"><div><h2>{q ? `“${q}” 的搜索结果` : "全部游戏"}</h2><p>找到 {results.length} 个匹配资源</p></div><SortToggle active={sort} hotHref={searchHref("hot")} latestHref={searchHref("latest")} /></div>
        {results.length ? <div className={`game-grid game-grid--search${results.length < 4 ? " game-grid--sparse" : ""}`}>{results.map((game) => <GameCard game={game} key={game.slug} />)}</div> : <div className="empty-state"><Icon name="search" size={30} /><h3>没有找到相关游戏</h3><p>试试更短的关键词，或者浏览其他平台分类。</p><Link className="button button--primary" href="/">返回首页</Link></div>}
      </div>
    </>
  );
}

function searchGamesFrom(games: Awaited<ReturnType<typeof listGames>>, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return games;
  return games.filter((game) => [game.title, game.englishTitle, game.category, game.genre, game.tagline].join(" ").toLowerCase().includes(normalized));
}
