import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { listGuides } from "@/lib/content-store";
import { getPlatform, platformMeta } from "@/lib/data";

type HelpCategoryProps = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  return platformMeta.map((platform) => ({ category: platform.key }));
}

export async function generateMetadata({ params }: HelpCategoryProps): Promise<Metadata> {
  const { category } = await params;
  const platform = getPlatform(category);
  return platform ? { title: `${platform.label}教程`, description: `${platform.label}的安装、下载与运行教程。` } : { title: "帮助分类" };
}

export default async function HelpCategoryPage({ params }: HelpCategoryProps) {
  const { category } = await params;
  const platform = getPlatform(category);
  if (!platform) notFound();
  const guides = (await listGuides()).filter((guide) => guide.published && guide.category === platform.key);

  return (
    <>
      <PageHero eyebrow={`${platform.shortLabel} SUPPORT`} title={`${platform.label}教程`} description={platform.description} icon={platform.key === "pc" ? "monitor" : platform.key === "mobile" ? "smartphone" : "gamepad"} />
      <main className="shell section help-category-page">
        <nav className="breadcrumb" aria-label="面包屑导航"><Link href="/">首页</Link><Icon name="chevron-down" size={13} /><Link href="/help">帮助 / 教程</Link><Icon name="chevron-down" size={13} /><span>{platform.label}</span></nav>
        <div className="help-category-page__intro"><div><span className="eyebrow"><Icon name="book" size={15} />独立分类教程</span><h2>按平台解决具体问题</h2><p>每篇教程都包含适用版本、操作步骤和安全提醒。</p></div><Link className="button button--ghost" href="/help"><Icon name="arrow-right" size={16} />返回帮助中心</Link></div>
        {guides.length ? <div className="guide-list">{guides.map((guide) => <Link className="guide-list__item" href={`/help/${platform.key}/${guide.slug}`} key={guide.id}><span className="guide-list__number">{String(guides.indexOf(guide) + 1).padStart(2, "0")}</span><div><h3>{guide.title}</h3><p>{guide.summary}</p><small><Icon name="calendar" size={14} />更新于 {guide.updated}</small></div><Icon name="arrow-right" size={18} /></Link>)}</div> : <div className="empty-state"><Icon name="book" size={28} /><h3>该分类教程正在整理中</h3><p>管理员可以在后台发布 {platform.label} 帮助文章。</p></div>}
      </main>
    </>
  );
}
