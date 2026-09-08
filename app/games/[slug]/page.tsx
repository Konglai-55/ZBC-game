import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailNav } from "@/components/detail-nav";
import { DetailRanking } from "@/components/detail-ranking";
import { DownloadPanel } from "@/components/download-panel";
import { FeedbackActions } from "@/components/feedback-actions";
import { GameArtwork } from "@/components/game-artwork";
import { GameViewCounter } from "@/components/game-view-counter";
import { Icon } from "@/components/icon";
import { getPlatform } from "@/lib/data";
import { findGame, getSiteSettings, listGames } from "@/lib/content-store";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await listGames()).map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await findGame(slug);
  return { title: game?.title ?? "游戏详情", description: game?.tagline };
}

export default async function GameDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const game = await findGame(slug);
  if (!game) notFound();
  const platform = getPlatform(game.platform);
  const [games, settings] = await Promise.all([listGames(), getSiteSettings()]);
  const recommendationGames = games.filter((item) => item.slug !== game.slug);

  return (
    <>
      <div className="shell detail-breadcrumb"><Link href="/"><Icon name="home" size={15} />首页</Link><span>/</span><Link href={`/category/${game.platform}`}>{platform?.label}</Link><span>/</span><strong>{game.title}</strong></div>
      <section className="shell detail-hero">
        <GameArtwork game={game} variant="hero" />
        <div className="detail-hero__shade" />
        <div className="detail-hero__content">
          <div className="detail-hero__tags"><span>{platform?.label}</span><span>{game.category}</span><span>{game.badge}</span></div>
          <small>{game.englishTitle}</small>
          <h1>{game.title}</h1>
          <p>{game.tagline}</p>
          <div className="detail-hero__meta"><span><Icon name="star" size={16} />{game.score} 评分</span><GameViewCounter slug={game.slug} initialViews={game.views} /><span><Icon name="hard-drive" size={16} />{game.size}</span><span><Icon name="calendar" size={16} />{game.updated}</span></div>
        </div>
      </section>

      <div className="shell detail-layout">
        <article className="detail-main">
          <section className="content-section" id="introduction">
            <div className="content-section__title"><span>01</span><div><small>ABOUT THIS GAME</small><h2>游戏介绍</h2></div></div>
            {game.description.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>

          {game.requirements && (
            <section className="content-section" id="requirements">
              <div className="content-section__title"><span>02</span><div><small>SYSTEM REQUIREMENTS</small><h2>系统配置</h2></div></div>
              <div className="requirements-grid">
                <div><h3><Icon name="monitor" size={18} />最低配置</h3>{game.requirements.minimum.map((item) => <p key={item}>{item}</p>)}</div>
                <div className="is-recommended"><h3><Icon name="zap" size={18} />推荐配置</h3>{game.requirements.recommended.map((item) => <p key={item}>{item}</p>)}</div>
              </div>
            </section>
          )}

          <section className="content-section" id="downloads">
            <div className="content-section__title"><span>{game.requirements ? "03" : "02"}</span><div><small>DOWNLOAD</small><h2>资源下载</h2></div></div>
            <DownloadPanel game={game} />
            <FeedbackActions gameSlug={game.slug} />
            <div className="support-note"><Icon name="help" /><div><strong>下载、解压或运行遇到问题？</strong><p>帮助中心整理了电脑、Switch、手机、PS5、PS4 与其他游戏的常见问题。</p></div><Link href="/help">查看教程 <Icon name="arrow-right" size={16} /></Link></div>
            <div className="site-identification" aria-label="网站信息">
              <p><strong>本站名称：</strong>ZBC·Game 游戏资源整合中心</p>
              <p><strong>永久网址：</strong><a href="https://zbcyx.net">zbcyx.net</a></p>
            </div>
          </section>
        </article>
        <aside className="detail-sidebar">
          <DetailNav hasRequirements={Boolean(game.requirements)} />
          <DetailRanking games={recommendationGames} />
        </aside>
      </div>

      <section className="shell detail-disclaimer" aria-labelledby="detail-disclaimer-title">
        <h2 id="detail-disclaimer-title"><span>#</span>免责声明<span>#</span></h2>
        <p>本站提供的资源转载自国内外各大媒体和网络，仅供试玩体验；不得将上述内容用于商业或者非法用途，否则一切后果请用户自负。您须在下载后的 24 小时内，从您的电脑中彻底删除上述内容。如果您喜欢该游戏内容，请支持正版，购买注册，获得更好的正版服务。我们非常重视版权问题，如有侵权请通过邮件与我们联系处理。敬请谅解！E-mail：<a href={`mailto:${settings.rightsEmail}`}>{settings.rightsEmail}</a></p>
      </section>
    </>
  );
}
