import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Icon } from "@/components/icon";
import { listFeedback, listGames, listGuides, listLegalDocuments, listResources, listUploads } from "@/lib/content-store";

export default async function AdminDashboardPage() {
  const [games, resources, guides, documents, feedback, uploads] = await Promise.all([
    listGames(),
    listResources(),
    listGuides(),
    listLegalDocuments(),
    listFeedback(),
    listUploads(),
  ]);
  const pending = feedback.filter((item) => item.status === "pending");
  const stats = [
    { label: "游戏内容", value: games.length, note: `${games.filter((item) => item.featured).length} 个首页精选`, href: "/admin/games", icon: "gamepad" as const },
    { label: "工具与 MOD", value: resources.length, note: `${resources.filter((item) => item.published).length} 个已发布`, href: "/admin/resources", icon: "wrench" as const },
    { label: "帮助教程", value: guides.length, note: `${guides.filter((item) => item.published).length} 个已公开`, href: "/admin/guides", icon: "book" as const },
    { label: "站点文书", value: documents.length, note: `${documents.filter((item) => item.published).length} 个已公开`, href: "/admin/documents", icon: "shield" as const },
    { label: "待处理反馈", value: pending.length, note: `${feedback.length} 条反馈记录`, href: "/admin/feedback", icon: "message" as const },
  ];

  return (
    <div className="admin-page">
      <AdminPageHeader eyebrow="OVERVIEW" title="内容控制台" description="管理前台展示的游戏、资源、教程、站点文书和全局配置。" icon="grid" actions={<Link className="admin-primary-button" href="/admin/games?new=1">新增游戏<Icon name="arrow-right" size={17} /></Link>} />
      <div className="admin-stat-grid">{stats.map((stat) => <Link className="admin-stat-card" href={stat.href} key={stat.label}><span className="admin-stat-card__icon"><Icon name={stat.icon} size={22} /></span><span><small>{stat.label}</small><strong>{stat.value}</strong><em>{stat.note}</em></span><Icon className="admin-stat-card__arrow" name="arrow-right" size={17} /></Link>)}</div>
      <div className="admin-dashboard-grid">
        <section className="admin-panel-card">
          <div className="admin-panel-card__head"><div><span>QUICK ACTIONS</span><h2>常用操作</h2></div><Icon name="sparkles" size={19} /></div>
          <div className="admin-quick-actions">
            <Link href="/admin/games?new=1"><Icon name="gamepad" size={20} /><span><strong>发布新游戏</strong><small>填写介绍、配置和网盘线路</small></span><Icon name="arrow-right" size={16} /></Link>
            <Link href="/admin/resources?new=1"><Icon name="wrench" size={20} /><span><strong>上传工具或 MOD</strong><small>附件最大 128 MB，大文件使用网盘</small></span><Icon name="arrow-right" size={16} /></Link>
            <Link href="/admin/documents"><Icon name="shield" size={20} /><span><strong>维护站点文书</strong><small>关于我们、侵权处理和版权声明</small></span><Icon name="arrow-right" size={16} /></Link>
            <Link href="/admin/uploads"><Icon name="download" size={20} /><span><strong>管理文件库</strong><small>{uploads.length} 个图片和附件</small></span><Icon name="arrow-right" size={16} /></Link>
            <Link href="/admin/settings"><Icon name="cpu" size={20} /><span><strong>调整站点信息</strong><small>品牌、公告、联系邮箱和母站链接</small></span><Icon name="arrow-right" size={16} /></Link>
          </div>
        </section>
        <section className="admin-panel-card">
          <div className="admin-panel-card__head"><div><span>RECENT FEEDBACK</span><h2>最近反馈</h2></div><Link href="/admin/feedback">查看全部 <Icon name="arrow-right" size={15} /></Link></div>
          <div className="admin-mini-list">{feedback.slice(-5).reverse().map((item) => <Link href="/admin/feedback" key={item.id}><span className={`admin-feedback-dot ${item.type === "broken" ? "is-warning" : ""}`} /><span><strong>{item.type === "broken" ? "资源报错" : "游戏催更"}</strong><small>{item.gameSlug} · {new Date(item.createdAt).toLocaleString("zh-CN")}</small></span><em className={item.status === "resolved" ? "is-resolved" : ""}>{item.status === "resolved" ? "已处理" : "待处理"}</em></Link>)}{feedback.length === 0 && <p className="admin-empty">暂无反馈记录。</p>}</div>
        </section>
      </div>
    </div>
  );
}
