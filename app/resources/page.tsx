import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { mediaUrl } from "@/lib/media-url";
import { PageHero } from "@/components/page-hero";
import { SortToggle } from "@/components/sort-toggle";
import { listResources } from "@/lib/content-store";

export const metadata: Metadata = { title: "MOD 与工具资源", description: "游戏 MOD、修改器、补丁与常用工具。" };

const resourceGroups = {
  mod: [
    { title: "MOD整合" },
    { title: "dlc" },
    { title: "修改器/存档" },
  ],
  tools: [
    { title: "最新更新" },
    { title: "修改软件" },
    { title: "工具软件" },
    { title: "系统软件" },
  ],
};

const resourceCategoryAliases: Record<string, string[]> = {
  "MOD整合": ["MOD整合", "MOD 整合"],
  dlc: ["dlc", "DLC", "DLC 资源"],
  "修改器/存档": ["修改器/存档", "修改器 / 存档"],
};

function matchesResourceCategory(category: string, requested: string) {
  return (resourceCategoryAliases[requested] || [requested]).includes(category);
}

function canonicalResourceCategory(category: string) {
  return Object.entries(resourceCategoryAliases).find(([, aliases]) => aliases.includes(category))?.[0] || category;
}

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ type?: string; sort?: string; category?: string; q?: string }> }) {
  const { type, sort: requestedSort, category: requestedCategory, q = "" } = await searchParams;
  const active = type === "mod" ? "mod" : "tools";
  const sort = requestedSort === "hot" ? "hot" : "latest";
  const canonicalRequestedCategory = requestedCategory ? canonicalResourceCategory(requestedCategory) : undefined;
  const defaultCategory = active === "mod" ? "MOD整合" : "最新更新";
  const activeCategory = canonicalRequestedCategory && resourceGroups[active].some((group) => group.title === canonicalRequestedCategory) ? canonicalRequestedCategory : defaultCategory;
  const hotCategoryOrder = ["修改软件", "工具软件", "系统软件", "MOD整合", "dlc", "修改器/存档"];
  const query = q.trim().toLowerCase();
  const allManagedResources = (await listResources()).filter((item) => item.group === active && item.published);
  const managedResources = allManagedResources.filter((item) => {
    const matchesQuery = !query || [item.name, item.category, item.description, item.version].join(" ").toLowerCase().includes(query);
    return matchesQuery && (activeCategory === "最新更新" || matchesResourceCategory(item.category, activeCategory));
  }).sort((a, b) => {
    if (sort === "hot") return (hotCategoryOrder.indexOf(canonicalResourceCategory(a.category)) - hotCategoryOrder.indexOf(canonicalResourceCategory(b.category))) || b.updated.localeCompare(a.updated);
    return b.updated.localeCompare(a.updated);
  });
  const querySuffix = query ? `&q=${encodeURIComponent(q.trim())}` : "";
  const categoryHref = (category: string) => `/resources?type=${active}&category=${encodeURIComponent(category)}${sort === "hot" ? "&sort=hot" : ""}${querySuffix}`;
  const listHeading = activeCategory === "最新更新" ? sort === "hot" ? "热门工具与补丁" : "最新工具与补丁" : activeCategory;
  return (
    <>
      <PageHero eyebrow="RESOURCE LIBRARY" title="MOD 与工具资源" description="让游戏更好玩，也让安装与运行少走弯路。" icon="wrench" />
      <div className="shell section resources-page">
        <div className="resources-toolbar">
          <div className="resource-tabs">
          <Link className={active === "mod" ? "is-active" : ""} href="/resources?type=mod">MOD / 修改器</Link>
          <Link className={active === "tools" ? "is-active" : ""} href="/resources?type=tools">工具 / 补丁</Link>
          </div>
          <form className="resource-search" action="/resources">
            <Icon name="search" size={17} />
            <input aria-label="搜索工具和资源" defaultValue={q} name="q" placeholder="搜索资源名称、分类或关键词…" />
            <input type="hidden" name="type" value={active} />
            <input type="hidden" name="category" value={activeCategory} />
            {sort === "hot" && <input type="hidden" name="sort" value="hot" />}
            <button type="submit">搜索</button>
          </form>
        </div>
        <div className="filter-row" aria-label={`${active === "mod" ? "MOD / 修改器" : "工具 / 补丁"}分类筛选`}>
          {resourceGroups[active].map((group) => (
            <Link aria-current={activeCategory === group.title ? "page" : undefined} className={activeCategory === group.title ? "is-active" : ""} href={categoryHref(group.title)} key={group.title}>{group.title}</Link>
          ))}
        </div>
        <section className="resource-list" id="resource-list">
          <div className="resource-list__head"><div><span className="eyebrow"><Icon name="refresh" size={15} />持续维护</span><h2>{listHeading}</h2></div><SortToggle active={sort} hotHref={`${categoryHref(activeCategory)}&sort=hot`} latestHref={`${categoryHref(activeCategory)}&sort=latest`} /></div>
          {managedResources.length > 0 ? managedResources.map((item) => (
            <article className="resource-row" key={item.id}>
              <span className="resource-row__type">{item.category}</span>
              <span className="resource-row__icon">{item.iconUrl ? <img src={mediaUrl(item.iconUrl)} alt="" /> : <Icon name={item.group === "mod" ? "sparkles" : "wrench"} size={24} />}</span>
              <strong>{item.name}</strong>
              <small><Icon name="hard-drive" size={14} />{item.size}</small>
              <small><Icon name="calendar" size={14} />{item.updated}</small>
              <Link href={`/resources/${item.id}`}>查看详情 <Icon name="arrow-right" size={15} /></Link>
            </article>
          )) : <div className="empty-state"><Icon name="wrench" size={28} /><h3>暂时没有已发布资源</h3><p>管理员可以在后台上传 MOD、工具或补丁。</p></div>}
        </section>
      </div>
    </>
  );
}
