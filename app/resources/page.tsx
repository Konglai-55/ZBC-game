import type { Metadata } from "next";
import Link from "next/link";
import { GamePagination } from "@/components/game-pagination";
import { Icon } from "@/components/icon";
import { mediaUrl } from "@/lib/media-url";
import { PageHero } from "@/components/page-hero";
import { SortToggle } from "@/components/sort-toggle";
import { resourceGroupLabels } from "@/lib/data";
import { listResources } from "@/lib/content-store";

export const metadata: Metadata = { title: "MOD、修改器与软件工具", description: "游戏 MOD、修改器、补丁与常用软件工具。" };

const resourcePageSize = 20;

const resourceGroups = {
  mod: [
    { title: "MOD整合" },
    { title: "存档" },
  ],
  trainer: [{ title: "最新更新" }, { title: "游戏修改器" }],
  save: [{ title: "最新更新" }, { title: "游戏存档" }],
  tools: [
    { title: "最新更新" },
    { title: "修改软件" },
    { title: "工具软件" },
    { title: "系统软件" },
  ],
};

const resourceCategoryAliases: Record<string, string[]> = {
  "MOD整合": ["MOD整合", "MOD 整合"],
  "存档": ["存档", "修改器/存档", "修改器 / 存档"],
};

function matchesResourceCategory(category: string, requested: string) {
  return (resourceCategoryAliases[requested] || [requested]).includes(category);
}

function canonicalResourceCategory(category: string) {
  return Object.entries(resourceCategoryAliases).find(([, aliases]) => aliases.includes(category))?.[0] || category;
}

export default async function ResourcesPage({ searchParams }: {
  searchParams: Promise<{ type?: string; sort?: string; category?: string; q?: string | string[]; page?: string | string[] }>;
}) {
  const { type, sort: requestedSort, category: requestedCategory, q: requestedQuery, page: requestedPage } = await searchParams;
  const active = type === "mod" || type === "trainer" || type === "save" ? type : "tools";
  const sort = requestedSort === "hot" ? "hot" : "latest";
  const canonicalRequestedCategory = requestedCategory ? canonicalResourceCategory(requestedCategory) : undefined;
  const defaultCategory = active === "mod" ? "MOD整合" : "最新更新";
  const activeCategory = canonicalRequestedCategory && resourceGroups[active].some((group) => group.title === canonicalRequestedCategory) ? canonicalRequestedCategory : defaultCategory;
  const showSavesInMod = active === "mod" && activeCategory === "存档";
  const hotCategoryOrder = ["修改软件", "工具软件", "系统软件", "MOD整合", "存档"];
  const q = typeof requestedQuery === "string" ? requestedQuery.trim() : "";
  const query = q.toLowerCase();
  const allManagedResources = (await listResources()).filter((item) => item.published && (item.group === active || (showSavesInMod && item.group === "save")));
  const managedResources = allManagedResources.filter((item) => {
    const matchesQuery = !query || [item.name, item.category, item.description, item.version].join(" ").toLowerCase().includes(query);
    return matchesQuery && (activeCategory === "最新更新" || (showSavesInMod && (item.group === "save" || item.category === "游戏存档")) || matchesResourceCategory(item.category, activeCategory));
  }).sort((a, b) => {
    if (sort === "hot") return (hotCategoryOrder.indexOf(canonicalResourceCategory(a.category)) - hotCategoryOrder.indexOf(canonicalResourceCategory(b.category))) || b.updated.localeCompare(a.updated);
    return b.updated.localeCompare(a.updated);
  });
  const paginate = active === "tools" || active === "trainer";
  const pageCount = paginate ? Math.max(1, Math.ceil(managedResources.length / resourcePageSize)) : 1;
  const pageNumber = typeof requestedPage === "string" ? Number(requestedPage) : 1;
  const currentPage = Number.isSafeInteger(pageNumber) ? Math.min(Math.max(1, pageNumber), pageCount) : 1;
  const start = (currentPage - 1) * resourcePageSize;
  const pageResources = paginate ? managedResources.slice(start, start + resourcePageSize) : managedResources;
  function listHref(category: string, order = sort, page = 1) {
    const params = new URLSearchParams({ type: active, category });
    if (order === "hot") params.set("sort", order);
    if (q) params.set("q", q);
    if (page > 1) params.set("page", String(page));
    return `/resources?${params}`;
  }
  const listHeading = activeCategory === "最新更新" ? `${sort === "hot" ? "热门" : "最新"}${resourceGroupLabels[active]}` : activeCategory;
  return (
    <>
      <PageHero eyebrow="RESOURCE LIBRARY" title="MOD、修改器与软件工具" description="让游戏更好玩，也让安装与运行少走弯路。" icon="wrench" />
      <div className="shell section resources-page">
        <div className="resources-toolbar">
          <div className="resource-tabs">
            {Object.entries(resourceGroupLabels).map(([key, label]) =>
              <Link key={key} className={active === key ? "is-active" : ""} aria-current={active === key ? "page" : undefined} href={`/resources?type=${key}`}>{label}</Link>,
            )}
          </div>
          <form className="resource-search" action="/resources">
            <Icon name="search" size={17} />
            <input aria-label="搜索软件工具和资源" defaultValue={q} name="q" placeholder="搜索资源名称、分类或关键词…" />
            <input type="hidden" name="type" value={active} />
            <input type="hidden" name="category" value={activeCategory} />
            {sort === "hot" && <input type="hidden" name="sort" value="hot" />}
            <button type="submit">搜索</button>
          </form>
        </div>
        <div className="filter-row" aria-label={`${resourceGroupLabels[active]}分类筛选`}>
          {resourceGroups[active].map((group) => (
            <Link aria-current={activeCategory === group.title ? "page" : undefined} className={activeCategory === group.title ? "is-active" : ""} href={listHref(group.title)} key={group.title}>{group.title}</Link>
          ))}
        </div>
        <section className="resource-list" id="resource-list">
          <div className="resource-list__head"><div><span className="eyebrow"><Icon name="refresh" size={15} />持续维护</span><h2>{listHeading}</h2></div><SortToggle active={sort} hotHref={listHref(activeCategory, "hot")} latestHref={listHref(activeCategory, "latest")} /></div>
          {pageResources.length > 0 ? pageResources.map((item) => (
            <article className="resource-row" key={item.id}>
              <span className="resource-row__type">{showSavesInMod ? "存档" : item.category}</span>
              <span className="resource-row__icon">{item.iconUrl ? <img src={mediaUrl(item.iconUrl)} alt="" /> : <Icon name={item.group === "mod" ? "sparkles" : "wrench"} size={24} />}</span>
              <strong className="resource-row__title"><Link href={`/resources/${item.id}`}>{item.name}</Link></strong>
              <small><Icon name="hard-drive" size={14} />{item.size}</small>
              <small><Icon name="calendar" size={14} />{item.updated}</small>
              <Link href={`/resources/${item.id}`}>查看详情 <Icon name="arrow-right" size={15} /></Link>
            </article>
          )) : <div className="empty-state"><Icon name="wrench" size={28} /><h3>暂时没有已发布资源</h3><p>管理员可以在后台上传 MOD、修改器、软件工具或补丁。</p></div>}
        </section>
        <GamePagination ariaLabel={`${resourceGroupLabels[active]}列表分页`} currentPage={currentPage} pageCount={pageCount} hrefForPage={(page) => `${listHref(activeCategory, sort, page)}#resource-list`} />
      </div>
    </>
  );
}
