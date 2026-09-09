import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GameCard } from "@/components/game-card";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { SortToggle } from "@/components/sort-toggle";
import { getPlatform, platformMeta } from "@/lib/data";
import { getSiteSettings, listGames } from "@/lib/content-store";
import type { Platform } from "@/lib/types";

type PageProps = { params: Promise<{ platform: string }>; searchParams: Promise<{ filter?: string; sort?: string }> };

export async function generateStaticParams() {
  return platformMeta.map((item) => ({ platform: item.key }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { platform } = await params;
  const meta = getPlatform(platform);
  if (!meta) return { title: "游戏分类" };
  const settings = await getSiteSettings();
  const description = platform in settings.categoryIntroductions
    ? settings.categoryIntroductions[platform as keyof typeof settings.categoryIntroductions]
    : meta.description;
  return { title: meta.label, description };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { platform } = await params;
  const meta = getPlatform(platform);
  if (!meta) notFound();
  const settings = await getSiteSettings();
  const categoryIntroduction = platform in settings.categoryIntroductions
    ? settings.categoryIntroductions[platform as keyof typeof settings.categoryIntroductions]
    : `${meta.shortLabel} ${meta.description}`;
  const defaultFilter = platform === "pc" ? "最新游戏" : platform === "switch" ? "switch游戏" : platform === "ps5" ? "PS5游戏" : "全部";
  const { filter: requestedFilter = defaultFilter, sort: requestedSort } = await searchParams;
  const filter = meta.filters.length === 0 ? "全部" : platform === "pc" && requestedFilter === "最近更新" ? "最新游戏" : requestedFilter;
  const supportsUpdateSort = platform === "pc" || platform === "switch";
  const sort = supportsUpdateSort && requestedSort === "update" ? "update" : requestedSort === "latest" ? "latest" : "hot";
  const allGames = (await listGames()).filter((game) => game.platform === platform);
  const isOverviewFilter = filter === "全部" || (platform === "pc" && filter === "最新游戏") || (platform === "switch" && filter === "switch游戏") || (platform === "ps5" && filter === "PS5游戏");
  const filteredBase = isOverviewFilter
    ? allGames
    : allGames.filter((game) => game.category.includes(filter) || game.genre.includes(filter) || game.badge.includes(filter.replace("近期", "")) || ((filter === "高分推荐" || filter === "经典必玩" || filter === "推荐") && game.score >= 8.8));
  const filtered = [...filteredBase].sort((a, b) => sort === "hot" ? b.views - a.views || b.score - a.score : sort === "update" ? b.updated.localeCompare(a.updated) : 0);
  const sortHrefPrefix = meta.filters.length === 0 ? `/category/${platform}?` : `/category/${platform}?filter=${encodeURIComponent(filter)}&`;

  return (
    <>
      <PageHero eyebrow={categoryIntroduction} title={meta.label} description="" icon={platform === "mobile" ? "smartphone" : platform === "pc" ? "monitor" : "gamepad"} />
      <div className="shell section category-layout">
        <div>
          {meta.filters.length > 0 && <div className="filter-row" aria-label={`${meta.label}分类筛选`}>
            {meta.filters.map((item) => <Link aria-current={filter === item ? "page" : undefined} className={filter === item ? "is-active" : ""} href={`/category/${platform}?filter=${encodeURIComponent(item)}${sort !== "latest" ? `&sort=${sort}` : ""}`} key={item}>{item}</Link>)}
          </div>}
          <form className="category-search category-search--prominent" action="/search">
            <Icon name="search" size={19} />
            <input aria-label={`搜索${meta.label}`} name="q" placeholder={`输入关键词，搜索${meta.label}…`} />
            <input type="hidden" name="platform" value={platform} />
            <button type="submit">搜索</button>
          </form>
          <div className="list-heading">
            <div><h2>{isOverviewFilter ? (sort === "hot" ? "热门游戏" : sort === "update" ? "最近更新" : "最新游戏") : filter}</h2></div>
            <div className="list-heading__actions">
              <SortToggle active={sort} hotHref={`${sortHrefPrefix}sort=hot`} latestHref={`${sortHrefPrefix}sort=latest`} updateHref={supportsUpdateSort ? `${sortHrefPrefix}sort=update` : undefined} />
            </div>
          </div>
          {filtered.length > 0 ? <div className={`game-grid game-grid--category${filtered.length < 4 ? " game-grid--sparse" : ""}`}>{filtered.map((game) => <GameCard game={game} key={game.slug} />)}</div> : <div className="empty-state"><Icon name="search" size={28} /><h3>暂时没有匹配内容</h3><p>换一个筛选条件试试。</p></div>}
        </div>
      </div>
    </>
  );
}
