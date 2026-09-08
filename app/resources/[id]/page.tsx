import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { mediaUrl } from "@/lib/media-url";
import { PageHero } from "@/components/page-hero";
import { findResource, listResources } from "@/lib/content-store";

type ResourceDetailProps = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return (await listResources()).map((resource) => ({ id: resource.id }));
}

export async function generateMetadata({ params }: ResourceDetailProps): Promise<Metadata> {
  const { id } = await params;
  const resource = await findResource(id);
  return resource
    ? { title: `${resource.name} · 资源详情`, description: resource.description }
    : { title: "资源详情" };
}

export default async function ResourceDetailPage({ params }: ResourceDetailProps) {
  const { id } = await params;
  const resource = await findResource(id);
  if (!resource || !resource.published) notFound();

  const downloadUrl = resource.fileUrl || resource.externalUrl;
  const isExternal = Boolean(resource.externalUrl && !resource.fileUrl);

  return (
    <>
      <PageHero eyebrow="RESOURCE DETAIL" title={resource.name} description={resource.description} icon={resource.group === "mod" ? "sparkles" : "wrench"} />
      <main className="shell section resource-detail-page">
        <nav className="breadcrumb" aria-label="面包屑导航">
          <Link href="/">首页</Link><Icon name="chevron-down" size={13} /><Link href={`/resources?type=${resource.group}`}>{resource.group === "mod" ? "MOD / 修改器" : "工具 / 补丁"}</Link><Icon name="chevron-down" size={13} /><span>{resource.name}</span>
        </nav>
        <div className="resource-detail-layout">
          <article className="resource-detail-card">
            <div className="resource-detail-card__header">
              <span className="resource-detail-card__icon">{resource.iconUrl ? <img src={mediaUrl(resource.iconUrl)} alt="" /> : <Icon name={resource.group === "mod" ? "sparkles" : "wrench"} size={30} />}</span>
              <div><span className="eyebrow">{resource.category}</span><h2>资源概览</h2><p>{resource.description}</p></div>
            </div>
            <dl className="resource-detail-meta">
              <div><dt>版本</dt><dd>{resource.version || "未注明"}</dd></div>
              <div><dt>大小</dt><dd>{resource.size || "未注明"}</dd></div>
              <div><dt>更新时间</dt><dd>{resource.updated}</dd></div>
              <div><dt>资源类型</dt><dd>{resource.group === "mod" ? "MOD / 修改器" : "工具 / 补丁"}</dd></div>
            </dl>
            <section className="resource-detail-description">
              <span className="eyebrow"><Icon name="book" size={15} />资源说明</span>
              <p>{resource.description}</p>
              <p className="resource-detail-note"><Icon name="shield" size={15} />下载前请核对版本和文件来源，并保留重要存档备份。</p>
            </section>
          </article>
          <aside className="resource-download-card">
            <span className="eyebrow"><Icon name="download" size={15} />获取资源</span>
            <h2>{downloadUrl ? "准备好开始下载" : "下载地址待补充"}</h2>
            <p>{downloadUrl ? "点击按钮打开资源地址。若是网盘链接，请按页面提示完成下载。" : "该资源暂未配置可用的文件或网盘地址，管理员补充后即可下载。"}</p>
            {downloadUrl ? <a className="button button--primary button--block" href={downloadUrl} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noreferrer" : undefined} download={!isExternal}><Icon name="download" size={17} />下载资源</a> : <Link className="button button--ghost button--block" href="/help"><Icon name="help" size={17} />查看安装帮助</Link>}
            <Link className="resource-download-back" href={`/resources?type=${resource.group}`}><Icon name="arrow-right" size={15} />返回资源列表</Link>
          </aside>
        </div>
      </main>
    </>
  );
}
