import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { findGuide } from "@/lib/content-store";
import { getPlatform } from "@/lib/data";

type GuideDetailProps = { params: Promise<{ category: string; slug: string }> };

export async function generateMetadata({ params }: GuideDetailProps): Promise<Metadata> {
  const { category, slug } = await params;
  const guide = await findGuide(slug);
  const platform = getPlatform(category);
  return guide && platform && guide.category === platform.key ? { title: `${guide.title} · ${platform.label}`, description: guide.summary } : { title: "教程详情" };
}

export default async function GuideDetailPage({ params }: GuideDetailProps) {
  const { category, slug } = await params;
  const platform = getPlatform(category);
  const guide = await findGuide(slug);
  if (!platform || !guide || !guide.published || guide.category !== platform.key) notFound();

  return (
    <>
      <PageHero eyebrow={`${platform.shortLabel} GUIDE`} title={guide.title} description={guide.summary} icon="book" />
      <main className="shell section help-guide-detail-page">
        <nav className="breadcrumb" aria-label="面包屑导航"><Link href="/">首页</Link><Icon name="chevron-down" size={13} /><Link href="/help">帮助 / 教程</Link><Icon name="chevron-down" size={13} /><Link href={`/help/${platform.key}`}>{platform.label}</Link><Icon name="chevron-down" size={13} /><span>{guide.title}</span></nav>
        <article className="guide-detail">
          <header><span className="eyebrow"><Icon name="calendar" size={15} />更新于 {guide.updated}</span><h2>操作说明</h2><p>{guide.summary}</p></header>
          <div className="guide-detail__content">{guide.content.split(/\r?\n+/).filter(Boolean).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
          <footer><Link className="button button--ghost" href={`/help/${platform.key}`}><Icon name="arrow-right" size={16} />返回{platform.label}教程</Link><Link className="button button--primary" href="/help"><Icon name="help" size={16} />继续浏览帮助</Link></footer>
        </article>
      </main>
    </>
  );
}
