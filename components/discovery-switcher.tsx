"use client";

import { relativeDate } from "@/lib/catalog";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GameArtwork } from "@/components/game-artwork";
import { Icon } from "@/components/icon";
import { getVisiblePages } from "@/lib/pagination";
import type { GameSummary as Game } from "@/lib/catalog";
import type { Platform } from "@/lib/types";

type Tab = { key: string; label: string; icon?: "sparkles"; platform: Platform; sort: "latest" | "hot" };
const tabs: Tab[] = [
  { key: "pc-new", label: "必玩新游", icon: "sparkles", platform: "pc", sort: "latest" },
  { key: "pc-hot", label: "热门游戏", platform: "pc", sort: "hot" },
  { key: "switch", label: "Switch新游", platform: "switch", sort: "latest" },
  { key: "ps5", label: "PS5新游", platform: "ps5", sort: "latest" },
  { key: "ps4", label: "PS4新游", platform: "ps4", sort: "latest" },
  { key: "mobile", label: "手机新游", platform: "mobile", sort: "latest" },
];

type Result = { items: Game[]; page: number; pageCount: number };
export function DiscoverySwitcher({ initial }: { initial: Result }) {
  const [active,setActive] = useState("pc-new");
  const [page,setPage] = useState(1);
  const [result,setResult] = useState(initial);
  const [message,setMessage] = useState("");
  const activeTab = tabs.find(tab => tab.key === active) || tabs[0];
  useEffect(() => {
    if (active === "pc-new" && page === 1) { setResult(initial);setMessage("");return; }
    const controller = new AbortController();
    setMessage("加载中…");
    const query = new URLSearchParams({ discovery: "1", platform:activeTab.platform, sort:activeTab.sort, page:String(page) });
    fetch("/api/games?" + query, { signal:controller.signal }).then(async response => {
      if (!response.ok) throw new Error("加载失败，请重新选择栏目");
      const data = await response.json();
      if (!controller.signal.aborted) { setResult(data); setMessage(""); }
    }).catch(error => { if (!controller.signal.aborted) setMessage(error.message); });
    return () => controller.abort();
  }, [active,activeTab,page,initial]);
  const pageCount = result.pageCount;
  const visibleItems = message ? [] : result.items;
  const selectTab = (key: string) => { setActive(key); setPage(1); };
  return <div className="discovery-switcher"><div className="discovery-tabs" role="tablist" aria-label="精选游戏栏目"><>{tabs.map((tab) => <button className={tab.key === active ? "is-active" : ""} key={tab.key} type="button" role="tab" aria-selected={tab.key === active} aria-controls="discovery-panel" onClick={() => selectTab(tab.key)}>{tab.icon && <Icon name={tab.icon} size={16} />}{tab.label}</button>)}<Link className="discovery-tabs__link" href="/category/other"><Icon name="grid" size={16} />其他游戏</Link></></div><div className="discovery-list" id="discovery-panel" role="tabpanel" aria-live="polite">{visibleItems.length ? visibleItems.map((game) => <Link className="discovery-card" href={`/games/${game.slug}`} key={game.slug} prefetch={false} target="_blank" rel="noopener noreferrer"><GameArtwork game={game} variant="card" /><div className="discovery-card__body"><strong>{game.title}</strong><small><Icon name="calendar" size={13} />更新于 {game.updatedLabel ?? relativeDate(game.updated, game.updatedAt)}</small></div></Link>) : <div className="discovery-empty"><Icon name="search" size={20} />{message || "暂时没有收录内容"}</div>}</div>{pageCount > 1 && <div className="discovery-pagination" aria-label="精选游戏分页"><button aria-label="上一页" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button"><Icon name="arrow-right" size={17} className="discovery-pagination__previous" /></button>{getVisiblePages(page, pageCount).map((value) => <button className={value === page ? "is-active" : ""} aria-label={`第${value}页`} aria-current={value === page ? "page" : undefined} key={value} onClick={() => setPage(value)} type="button">{value}</button>)}<button aria-label="下一页" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} type="button"><Icon name="arrow-right" size={17} /></button></div>}</div>;
}
