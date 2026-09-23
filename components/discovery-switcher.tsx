"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GameArtwork } from "@/components/game-artwork";
import { Icon } from "@/components/icon";
import type { Game, Platform } from "@/lib/types";

type Tab = { key: string; label: string; icon?: "sparkles"; platform: Platform; sort: "latest" | "hot" };
const tabs: Tab[] = [
  { key: "pc-new", label: "必玩新游", icon: "sparkles", platform: "pc", sort: "latest" },
  { key: "pc-hot", label: "热门游戏", platform: "pc", sort: "hot" },
  { key: "switch", label: "Switch新游", platform: "switch", sort: "latest" },
  { key: "ps5", label: "PS5新游", platform: "ps5", sort: "latest" },
  { key: "ps4", label: "PS4新游", platform: "ps4", sort: "latest" },
  { key: "mobile", label: "手机新游", platform: "mobile", sort: "latest" },
];

function gamesForTab(games: Game[], tab: Tab) {
  const scoped = games.filter((game) => game.platform === tab.platform);
  return [...scoped].sort((a, b) => tab.sort === "hot" ? b.views - a.views || b.score - a.score : b.updated.localeCompare(a.updated));
}

export function DiscoverySwitcher({ games }: { games: Game[] }) {
  const [active, setActive] = useState("pc-new");
  const [page, setPage] = useState(1);
  const activeTab = tabs.find((tab) => tab.key === active) || tabs[0];
  const items = useMemo(() => gamesForTab(games, activeTab), [games, activeTab]);
  const pageCount = Math.max(1, Math.ceil(items.length / 10));
  const visibleItems = items.slice((page - 1) * 10, page * 10);
  const selectTab = (key: string) => { setActive(key); setPage(1); };
  return <div className="discovery-switcher"><div className="discovery-tabs" role="tablist" aria-label="精选游戏栏目"><>{tabs.map((tab) => <button className={tab.key === active ? "is-active" : ""} key={tab.key} type="button" role="tab" aria-selected={tab.key === active} aria-controls="discovery-panel" onClick={() => selectTab(tab.key)}>{tab.icon && <Icon name={tab.icon} size={16} />}{tab.label}</button>)}<Link className="discovery-tabs__link" href="/category/other"><Icon name="grid" size={16} />其他游戏资源</Link></></div><div className="discovery-list" id="discovery-panel" role="tabpanel" aria-live="polite">{visibleItems.length ? visibleItems.map((game) => <Link className="discovery-card" href={`/games/${game.slug}`} key={game.slug} target="_blank" rel="noopener noreferrer"><GameArtwork game={game} variant="card" /><div className="discovery-card__body"><strong>{game.title}</strong><small><Icon name="calendar" size={13} />发布日期：{game.updated}</small></div></Link>) : <div className="discovery-empty"><Icon name="search" size={20} />暂时没有收录内容</div>}</div>{pageCount > 1 && <div className="discovery-pagination" aria-label="精选游戏分页"><button aria-label="上一页" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button"><Icon name="arrow-right" size={17} className="discovery-pagination__previous" /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((value) => <button className={value === page ? "is-active" : ""} aria-label={`第${value}页`} aria-current={value === page ? "page" : undefined} key={value} onClick={() => setPage(value)} type="button">{value}</button>)}<button aria-label="下一页" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} type="button"><Icon name="arrow-right" size={17} /></button></div>}</div>;
}
