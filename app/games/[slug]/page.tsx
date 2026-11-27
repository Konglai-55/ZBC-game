import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailNav } from "@/components/detail-nav";
import { CommentForm } from "@/components/comment-form";
import { gameComments } from "@/lib/content-store";
import { GameCard } from "@/components/game-card";
import { recommendations, rankingScore, summary } from "@/lib/catalog";
import { DetailRanking } from "@/components/detail-ranking";
import { DownloadPanel } from "@/components/download-panel";
import { FeedbackActions } from "@/components/feedback-actions";
import { GameArtwork } from "@/components/game-artwork";
import { GameViewCounter } from "@/components/game-view-counter";
import { Icon } from "@/components/icon";
import { gameResourceGroups, getPlatform, resourceGroupLabels, resourceReferenceId } from "@/lib/data";
import { findGame, getSiteSettings, listGames, listResources } from "@/lib/content-store";

type PageProps = { params: Promise<{ slug: string }>; searchParams: Promise<{ download?: string | string[]; comments?: string }> };

export async function generateStaticParams() {
  return (await listGames()).map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await findGame(slug);
  return { title: game?.title ?? "游戏详情", description: game?.tagline };
}

export default async function GameDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const game = await findGame(slug);
  if (!game) notFound();
  const platform = getPlatform(game.platform);
  const [games, settings, resources, { download,comments: requestedCommentPage }] = await Promise.all([
    listGames(), getSiteSettings(), game.resourceIds?.length ? listResources() : [], searchParams,
  ]);
  const recommendationGames = games.filter((item) => item.slug !== game.slug);
  const comments = await gameComments(game.communityId ?? slug);
  const commentPages = Math.max(1,Math.ceil(comments.length/30));
  const commentPage = Math.min(commentPages, Math.max(1,parseInt(requestedCommentPage ?? "",10) || 1));
  const topics = [
    { question: "怎么设置中文？", pattern: /中文|汉化|语言设置/, answer: "先核对本页版本是否支持中文，再查看游戏设置中的 Language 或语言选项。独立汉化补丁需匹配游戏版本。" },
    { question: "安装路径必须用英文吗？", pattern: /路径|目录.{0,8}英文/, answer: "部分旧游戏或安装器无法识别中文目录。遇到启动或解压错误时，可尝试仅含英文字母和数字的短路径，并保留原存档。" },
    { question: "分卷压缩包怎么解压？", pattern: /解压|分卷/, answer: "将所有分卷放在同一目录，从第一卷开始解压。出现校验错误时请检查文件是否下载完整。" },
  ].map(topic => ({ ...topic, count: comments.filter(comment => topic.pattern.test(comment.message)).length }))
   .filter(topic => topic.count > 0 && (game.platform === "pc" || !topic.question.includes("路径"))).sort((a,b) => b.count - a.count);
  const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[\s\p{P}]+/gu,"");
  const common = new Map<string,{ question:string; answer:string; count:number }>();
  for (const comment of comments) {
    const key = normalize(comment.message);
    const entry = common.get(key) ?? { question:comment.message,answer:"",count:0 };
    entry.count++;
    if (!entry.answer && comment.answer) entry.answer = comment.answer;
    common.set(key,entry);
  }
  const custom = [...common.values()].filter(item => item.answer).sort((a,b) => b.count-a.count);
  const pinned = [...custom, ...topics.filter(topic => !custom.some(item => topic.pattern.test(item.question)))];
  const similar = recommendations(game, games);
  const publishedById = new Map(resources.filter(({ published }) => published).map((item) => [resourceReferenceId(item), item]));
  const related = (game.resourceIds ?? []).flatMap((id) => publishedById.get(id) ?? []);
  const downloadTabs = gameResourceGroups.map((key) => ({
    key, label: resourceGroupLabels[key], items: related.filter(({ group }) => group === key),
  }));
  const selectedDownload = downloadTabs.find(({ key }) => key === download);
  const gameHref = `/games/${game.slug}`;

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
          <div className="detail-hero__meta"><span><Icon name="star" size={16} />{game.score} 评分</span><GameViewCounter slug={game.slug} initialViews={game.views} /><span title="同一浏览器访问同款游戏的网盘二维码，每个北京时间自然日计一次">下载入口访问 {game.downloadCount ?? 0} 次</span><span><Icon name="hard-drive" size={16} />{game.size}</span><span><Icon name="calendar" size={16} />{game.updated}</span></div>
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
            {downloadTabs.length > 0 && <nav className="game-download-tabs" aria-label="游戏资源分类">
              <Link href={`${gameHref}#downloads`} prefetch={false} aria-current={selectedDownload ? undefined : "page"}>本体</Link>
              {downloadTabs.map(({ key, label }) => <Link key={key} href={`${gameHref}?download=${key}#downloads`} prefetch={false} aria-current={selectedDownload?.key === key ? "page" : undefined}>{label}</Link>)}
            </nav>}
            {selectedDownload ? <ul className="game-related-resources" aria-label={selectedDownload.label}>
              {!selectedDownload.items.length && <li>本游戏暂未收录{selectedDownload.label}。</li>}
              {selectedDownload.items.map((item) => <li key={item.id}>
                <div><strong>{item.name}</strong><small>{[item.version, item.size, item.updated].filter(Boolean).join(" · ")}</small></div>
                <Link href={`/resources/${item.id}`} aria-label={`查看资源：${item.name}`}>查看资源 <Icon name="arrow-right" size={15} /></Link>
              </li>)}
            </ul> : <DownloadPanel game={game} />}
            <FeedbackActions gameSlug={game.slug} />
            <div className="support-note"><Icon name="help" /><div><strong>下载、解压或运行遇到问题？</strong><p>帮助中心整理了电脑、Switch、手机、PS5、PS4 与其他游戏的常见问题。</p></div><Link href="/help">查看教程 <Icon name="arrow-right" size={16} /></Link></div>
            <div className="site-identification" aria-label="网站信息">
              <p><strong>本站名称：</strong>ZBC·Game 游戏资源整合中心</p>
              <p><strong>永久网址：</strong><a href="https://zbcyx.net">zbcyx.net</a></p>
            </div>
          </section>
          <section className="content-section"><h2>相关推荐</h2>
            {similar.length ? <div className="game-grid">{similar.map(item => <GameCard key={item.slug} game={item} />)}</div> : <p>暂无同系列或同类型游戏。</p>}
          </section>
          <section id="comments" className="content-section"><h2>玩家评论</h2>
            {pinned.length > 0 && <aside className="game-faq"><h3>置顶 · 常见问题</h3>{pinned.map(topic => <div key={topic.question}><strong>{topic.question}</strong><p>{topic.answer}</p></div>)}</aside>}
            <CommentForm slug={slug} />
            {comments.slice((commentPage-1)*30,commentPage*30).map(item => <div className="comment-entry" key={item.id}><strong>{item.nickname}</strong><small>{new Date(item.createdAt).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" })}</small><p>{item.message}</p>{item.answer && <p>站长答复：{item.answer}</p>}</div>)}
            {commentPages > 1 && <nav aria-label="评论分页">{commentPage > 1 && <Link href={gameHref+"?comments="+(commentPage-1)+"#comments"}>上一页</Link>} {commentPage} / {commentPages} {commentPage < commentPages && <Link href={gameHref+"?comments="+(commentPage+1)+"#comments"}>下一页</Link>}</nav>}
          </section>
        </article>
        <aside className="detail-sidebar">
          <DetailNav hasRequirements={Boolean(game.requirements)} />
          <DetailRanking games={[...new Set(["week","month","history"].flatMap(mode => [...recommendationGames].sort((a,b) => rankingScore(mode,a,b)).slice(0,16)))].map(summary)} />
        </aside>
      </div>

      <section className="shell detail-disclaimer" aria-labelledby="detail-disclaimer-title">
        <h2 id="detail-disclaimer-title"><span>#</span>免责声明<span>#</span></h2>
        <p>本站提供的资源转载自国内外各大媒体和网络，仅供试玩体验；不得将上述内容用于商业或者非法用途，否则一切后果请用户自负。您须在下载后的 24 小时内，从您的电脑中彻底删除上述内容。如果您喜欢该游戏内容，请支持正版，购买注册，获得更好的正版服务。我们非常重视版权问题，如有侵权请通过邮件与我们联系处理。敬请谅解！E-mail：<a href={`mailto:${settings.rightsEmail}`}>{settings.rightsEmail}</a></p>
      </section>
    </>
  );
}
