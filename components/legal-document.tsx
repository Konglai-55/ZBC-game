import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import type { LegalDocumentId, LegalDocumentItem, SiteSettings } from "@/lib/types";

const documentMeta: Record<LegalDocumentId, { icon: IconName; href: string; fallbackDescription: string }> = {
  about: { icon: "message", href: "/about", fallbackDescription: "网站定位与联系反馈" },
  infringement: { icon: "shield", href: "/infringement", fallbackDescription: "权利人通知与申请流程" },
  copyright: { icon: "book", href: "/copyright", fallbackDescription: "内容归属与使用边界" },
};

function inlineContent(value: string, settings: SiteSettings): ReactNode[] {
  const pattern = /(\{\{contactEmail\}\}|\{\{rightsEmail\}\}|\*\*[^*]+\*\*|\[[^\]]+\]\((?:\/|https?:\/\/)[^)]+\))/g;
  const parts = value.split(pattern).filter(Boolean);
  return parts.map((part, index) => {
    if (part === "{{contactEmail}}" || part === "{{rightsEmail}}") {
      const email = part === "{{contactEmail}}" ? settings.contactEmail : settings.rightsEmail;
      return <a className="legal-email" href={`mailto:${email}`} key={`${part}-${index}`}>{email}</a>;
    }
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const [, label, href] = link;
      return href.startsWith("/")
        ? <Link href={href} key={`${href}-${index}`}>{label}</Link>
        : <a href={href} key={`${href}-${index}`} target="_blank" rel="noreferrer">{label}</a>;
    }
    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

function listItem(value: string, settings: SiteSettings) {
  const titled = value.match(/^\*\*([^*]+)\*\*(.*)$/);
  return titled
    ? <><strong>{titled[1]}</strong><span>{inlineContent(titled[2], settings)}</span></>
    : <span>{inlineContent(value, settings)}</span>;
}

function LegalContent({ content, settings }: { content: string; settings: SiteSettings }) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    if (line.startsWith("## ")) {
      blocks.push(<h2 key={`heading-${index}`}>{line.slice(3)}</h2>);
      index += 1;
      continue;
    }
    if (line.startsWith("> ")) {
      blocks.push(<p className="legal-callout" key={`callout-${index}`}>{inlineContent(line.slice(2), settings)}</p>);
      index += 1;
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push(<ul key={`list-${index}`}>{items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{listItem(item, settings)}</li>)}</ul>);
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s/, ""));
        index += 1;
      }
      blocks.push(<ol key={`steps-${index}`}>{items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{listItem(item, settings)}</li>)}</ol>);
      continue;
    }
    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(## |> |- |\d+\.\s)/.test(lines[index].trim())) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(<p key={`paragraph-${index}`}>{inlineContent(paragraph.join(" "), settings)}</p>);
  }
  return <>{blocks}</>;
}

export function LegalDocument({ document, documents, settings }: { document: LegalDocumentItem; documents: LegalDocumentItem[]; settings: SiteSettings }) {
  const meta = documentMeta[document.id];
  return (
    <>
      <PageHero eyebrow={document.eyebrow} title={document.title} description={document.description} icon={meta.icon} />
      <div className="shell section legal-page">
        <div className="legal-layout">
          <nav className="legal-nav" aria-label="站点文书">
            <span className="legal-nav__eyebrow">SITE DOCUMENTS</span>
            <h2>站点文书</h2>
            <div className="legal-nav__links">
              {documents.filter((item) => item.published).map((item) => {
                const itemMeta = documentMeta[item.id];
                return (
                  <Link className={item.id === document.id ? "is-active" : ""} href={itemMeta.href} key={item.id} aria-current={item.id === document.id ? "page" : undefined}>
                    <Icon name={itemMeta.icon} size={18} />
                    <span><strong>{item.title}</strong><small>{itemMeta.fallbackDescription}</small></span>
                    <Icon name="arrow-right" size={15} />
                  </Link>
                );
              })}
            </div>
          </nav>
          <article className="legal-document">
            <div className="legal-document__body"><LegalContent content={document.content} settings={settings} /></div>
            <footer className="legal-document__footer">最后更新：{document.updated} · 如需反馈页面问题，请通过文书中列出的邮箱联系我们。</footer>
          </article>
        </div>
      </div>
    </>
  );
}
