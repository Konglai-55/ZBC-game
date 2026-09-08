import Link from "next/link";
import { GameCard } from "@/components/game-card";
import { DiscoverySwitcher } from "@/components/discovery-switcher";
import { FeaturedGameCarousel } from "@/components/featured-game-carousel";
import { Icon } from "@/components/icon";
import { SectionHeading } from "@/components/section-heading";
import { HomeWeeklyPicks } from "@/components/home-weekly-picks";
import { ToolResourceStrip } from "@/components/tool-resource-strip";
import { platformMeta } from "@/lib/data";
import { getSiteSettings, listGames, listResources } from "@/lib/content-store";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const [{ sort: requestedSort }, games, settings, resources] = await Promise.all([searchParams, listGames(), getSiteSettings(), listResources()]);
  const sort = requestedSort === "latest" ? "latest" : "hot";
  const featuredGames = [...games]
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || b.views - a.views || b.score - a.score)
    .slice(0, 3);
  const toolResources = resources.filter((resource) => resource.group === "tools" && resource.published).sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 6);

  return (
    <>
      <section className="home-hero">
        <div className="hero-glow hero-glow--one" />
        <div className="hero-glow hero-glow--two" />
        <div className="shell hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><Icon name="refresh" size={15} />{settings.announcement}</span>
            <h1>全球游戏免费试玩<strong>学习中心</strong></h1>
            <p>收录PC/Switch/手机/主机游戏/修改器/Mod/各类工具等海量资源免费下载！</p>
            <form className="hero-search" action="/search">
              <Icon name="search" size={24} />
              <input aria-label="搜索游戏" name="q" placeholder="输入关键词，找到你想玩的游戏" />
              <button type="submit">搜索游戏 <Icon name="arrow-right" size={18} /></button>
            </form>
            <div className="hero-actions">
              <Link className="button button--secondary" href="/category/pc"><Icon name="monitor" size={18} />浏览电脑游戏</Link>
              <Link className="button button--text" href="#weekly-picks">查看本周推荐 <Icon name="arrow-right" size={18} /></Link>
            </div>
            <div className="hero-trust">
              <span><Icon name="download" size={16} />游戏免费下载</span>
              <span><Icon name="refresh" size={16} />资源持续更新</span>
              <span><Icon name="zap" size={16} />多种网盘线路</span>
            </div>
          </div>
          <FeaturedGameCarousel games={featuredGames} />
        </div>
        <div className="shell discovery-section">
          <DiscoverySwitcher games={games} />
        </div>
      </section>

      <HomeWeeklyPicks games={games} initialSort={sort} />

      <section className="section shell">
        <SectionHeading eyebrow="按平台浏览" title="主机与移动游戏" description="按设备查看最近更新和热门资源。" icon="gamepad" />
        <div className="platform-showcases">
          {platformMeta.slice(1, 5).map((platform, index) => {
            // Keep the showcase ready for a 2 × 2 layout as more games are added.
            const picks = games.filter((game) => game.platform === platform.key).slice(0, 4);
            return (
              <article className={`platform-showcase platform-showcase--${index + 1}`} key={platform.key}>
                <div className="platform-showcase__head"><span>{platform.shortLabel}</span><Link href={`/category/${platform.key}`}>浏览全部 <Icon name="arrow-right" size={15} /></Link></div>
                <h3>{platform.label}</h3>
                <p>{platform.description}</p>
                <div className="platform-showcase__games">
                  {picks.map((game) => <GameCard game={game} key={game.slug} />)}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section shell resource-banner">
        <div className="resource-banner__icon"><Icon name="wrench" size={30} /></div>
        <div><span>常用资源</span><h2>MOD、补丁与安装教程</h2><p>常用运行库、存档工具、解压和安装问题集中整理。</p></div>
        <div className="resource-banner__actions"><Link className="button button--primary" href="/resources">浏览工具资源</Link><Link className="button button--ghost" href="/help">进入帮助中心</Link></div>
      </section>
      <div className="shell"><ToolResourceStrip resources={toolResources} /></div>
    </>
  );
}
