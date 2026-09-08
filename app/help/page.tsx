import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { SortToggle } from "@/components/sort-toggle";
import { listGuides } from "@/lib/content-store";
import { platformMeta } from "@/lib/data";

export const metadata: Metadata = { title: "帮助与教程", description: "各平台游戏安装、下载和运行常见问题。" };

const helpCategories = [
  { title: "电脑游戏问题", description: "安装、解压、运行库、闪退与存档位置。", icon: "monitor" as IconName, articles: 18 },
  { title: "Switch 游戏问题", description: "格式说明、版本匹配与常见报错。", icon: "gamepad" as IconName, articles: 12 },
  { title: "手机游戏问题", description: "Android 安装、权限与数据包说明。", icon: "smartphone" as IconName, articles: 9 },
  { title: "PS5 游戏问题", description: "版本说明、备份与存储空间提示。", icon: "gamepad" as IconName, articles: 8 },
  { title: "PS4 游戏问题", description: "兼容信息、更新顺序与数据管理。", icon: "gamepad" as IconName, articles: 10 },
  { title: "其他游戏问题", description: "怀旧平台、控制器与通用资源说明。", icon: "help" as IconName, articles: 7 },
];

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort: requestedSort } = await searchParams;
  const sort = requestedSort === "hot" ? "hot" : "latest";
  const guides = (await listGuides()).filter((guide) => guide.published).sort((a, b) => sort === "hot" ? a.id.localeCompare(b.id) : b.updated.localeCompare(a.updated));
  return (
    <>
      <PageHero eyebrow="SUPPORT CENTER" title="帮助 / 教程" description="从下载到启动，一步一步解决游戏常见问题。" icon="help">
        <form className="page-search" action="/search"><Icon name="search" /><input aria-label="搜索帮助内容" name="q" placeholder="搜索问题或关键词…" /><button>搜索</button></form>
      </PageHero>
      <div className="shell section help-page">
        <div className="help-category-grid">
          {helpCategories.map((item) => { const platform = platformMeta.find((meta) => item.title.startsWith(meta.label)) || (item.title.startsWith("其他") ? platformMeta.find((meta) => meta.key === "other") : undefined); const count = platform ? guides.filter((guide) => guide.category === platform.key).length : 0; return <Link href={`/help/${platform?.key || "pc"}`} key={item.title}><span><Icon name={item.icon} size={25} /></span><small>{count || item.articles} 篇教程</small><h2>{item.title}</h2><p>{item.description}</p><strong>查看教程 <Icon name="arrow-right" size={16} /></strong></Link>; })}
        </div>
        <section className="faq-section" id="faq">
          <div className="faq-section__intro"><span className="eyebrow"><Icon name="message" size={15} />常见问题</span><h2>先从这里找答案</h2><p>整理最常遇到的下载、安装和运行问题。点击问题即可展开答案。</p><SortToggle active={sort} hotHref="/help?sort=hot#faq" latestHref="/help?sort=latest#faq" /><div><Icon name="shield" /><span><strong>安全提醒</strong>不要关闭系统安全防护，也不要运行来源不明的程序。</span></div></div>
          <div className="faq-list">
            {guides.length ? guides.map((guide, index) => <details key={guide.id} id={guides.findIndex((entry) => entry.category === guide.category) === index ? `guide-${guide.category}` : undefined} open={index === 0}><summary><span>{String(index + 1).padStart(2, "0")}</span>{guide.title}<Icon name="chevron-down" /></summary><p>{guide.content}</p></details>) : <div className="empty-state"><Icon name="book" size={28} /><h3>教程正在整理中</h3><p>管理员可以在后台发布帮助文章。</p></div>}
          </div>
        </section>
      </div>
    </>
  );
}
