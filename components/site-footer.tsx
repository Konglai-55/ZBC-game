import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { platformMeta } from "@/lib/data";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon";
import type { LegalDocumentId, LegalDocumentItem, SiteSettings } from "@/lib/types";

const documentMeta: Record<LegalDocumentId, { href: string; icon: IconName; description: string }> = {
  about: { href: "/about", icon: "message", description: "网站定位与联系反馈" },
  infringement: { href: "/infringement", icon: "shield", description: "权利人通知与申请流程" },
  copyright: { href: "/copyright", icon: "book", description: "内容归属与使用边界" },
};

export function SiteFooter({ settings, documents }: { settings: SiteSettings; documents: LegalDocumentItem[] }) {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <Link aria-label="ZBC Game 首页" className="brand" href="/">
            <BrandLogo variant="footer" />
          </Link>
          <p>整理各平台游戏的版本、更新与下载信息，让查找资源更直接。</p>
          <span className="footer-status"><i /> 资源信息每日维护</span>
        </div>
        <div>
          <h3>游戏分类</h3>
          <div className="footer-links">{platformMeta.map((item) => <Link href={`/category/${item.key}`} key={item.key}>{item.label}</Link>)}</div>
        </div>
        <div>
          <h3>资源服务</h3>
          <div className="footer-links">
            <Link href="/resources?type=mod">MOD / 修改器</Link>
            <Link href="/resources?type=tools">工具 / 补丁</Link>
            <Link href="/help">帮助 / 教程</Link>
            <Link href="/search">站内搜索</Link>
          </div>
        </div>
        <div className="footer-note">
          <h3>站点文书</h3>
          <div className="footer-document-links">
            {documents.filter((document) => document.published).map((document) => { const meta = documentMeta[document.id]; return <Link href={meta.href} key={document.id}><Icon name={meta.icon} size={18} /><span><strong>{document.title}</strong><small>{meta.description}</small></span><Icon name="arrow-right" size={15} /></Link>; })}
          </div>
        </div>
      </div>
      <div className="shell footer-bottom"><span>© 2026 {settings.siteName}</span></div>
    </footer>
  );
}
