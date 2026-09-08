"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icon";
import type { LegalDocumentId, LegalDocumentItem } from "@/lib/types";

const documentMeta: Record<LegalDocumentId, { icon: IconName; path: string; note: string }> = {
  about: { icon: "message", path: "/about", note: "网站定位、内容方向与反馈方式" },
  infringement: { icon: "shield", path: "/infringement", note: "投诉材料、提交方式与处理流程" },
  copyright: { icon: "book", path: "/copyright", note: "内容归属、外部链接与责任边界" },
};

function DocumentEditor({ document, onClose, onSaved }: { document: LegalDocumentItem; onClose: () => void; onSaved: (document: LegalDocumentItem) => void }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [content, setContent] = useState(document.content);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, saving]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const payload = {
      id: document.id,
      eyebrow: data.get("eyebrow"),
      title: data.get("title"),
      description: data.get("description"),
      content,
      updated: data.get("updated"),
      published: data.get("published") === "on",
    };
    const response = await fetch(`/api/admin/documents/${document.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as { data?: LegalDocumentItem; error?: string };
    if (!response.ok || !result.data) {
      setMessage(result.error || "保存失败");
      setSaving(false);
      return;
    }
    onSaved(result.data);
  }

  return (
    <div className="admin-editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <section className="admin-editor admin-document-editor" role="dialog" aria-modal="true" aria-labelledby="document-editor-title">
        <header>
          <div><span>EDIT SITE DOCUMENT</span><h2 id="document-editor-title">编辑：{document.title}</h2><p>保存后前台文书页会立即读取最新内容。</p></div>
          <button className="admin-editor-close" type="button" aria-label="关闭编辑器" disabled={saving} onClick={onClose}><Icon name="x" /></button>
        </header>
        <form onSubmit={submit}>
          <fieldset>
            <legend>页面信息</legend>
            <div className="admin-form-grid">
              <label>文书标题<input ref={titleRef} name="title" defaultValue={document.title} required maxLength={80} /></label>
              <label>英文标识<input name="eyebrow" defaultValue={document.eyebrow} required maxLength={60} /></label>
              <label>更新时间<input type="date" name="updated" defaultValue={document.updated} required /></label>
              <label className="admin-checkbox"><input type="checkbox" name="published" defaultChecked={document.published} /><span>在前台公开显示</span></label>
              <label className="admin-form-grid__full">页面简介<input name="description" defaultValue={document.description} required maxLength={240} /></label>
            </div>
          </fieldset>
          <fieldset>
            <legend>文书正文</legend>
            <label className="admin-document-content-label">
              <span>正文内容 <small>{content.length.toLocaleString("zh-CN")} / 40,000 字符</small></span>
              <textarea name="content" rows={22} value={content} onChange={(event) => setContent(event.target.value)} required maxLength={40000} spellCheck={false} />
            </label>
            <div className="admin-document-syntax" aria-label="文书格式说明">
              <strong><Icon name="help" size={15} />格式提示</strong>
              <span><code>## 标题</code> 小节标题</span>
              <span><code>- **名称**说明</code> 项目列表</span>
              <span><code>1. **名称**说明</code> 编号列表</span>
              <span><code>&gt; **提示**正文</code> 重点提示</span>
              <span><code>{"{{contactEmail}}"}</code> 联系邮箱</span>
              <span><code>{"{{rightsEmail}}"}</code> 投诉邮箱</span>
            </div>
          </fieldset>
          {message && <p className="admin-form-message is-error" role="alert">{message}</p>}
          <footer>
            <button className="admin-secondary-button" type="button" disabled={saving} onClick={onClose}>取消</button>
            <button className="admin-primary-button" type="submit" disabled={saving}>{saving ? "正在保存…" : "保存文书"}<Icon name="check" size={17} /></button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export function DocumentManager({ initialDocuments }: { initialDocuments: LegalDocumentItem[] }) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [editing, setEditing] = useState<LegalDocumentItem | null>(null);
  const [notice, setNotice] = useState("");

  function saved(document: LegalDocumentItem) {
    setDocuments((items) => items.map((item) => item.id === document.id ? document : item));
    setEditing(null);
    setNotice(`“${document.title}”已保存并同步到前台`);
    router.refresh();
  }

  return (
    <>
      {notice && <p className="admin-form-message is-success" role="status">{notice}</p>}
      <div className="admin-document-grid">
        {documents.map((document) => {
          const meta = documentMeta[document.id];
          return (
            <article className="admin-document-card" key={document.id}>
              <header>
                <span className="admin-document-card__icon"><Icon name={meta.icon} size={22} /></span>
                <span className={`admin-status ${document.published ? "is-published" : "is-draft"}`}>{document.published ? "已发布" : "未公开"}</span>
              </header>
              <span className="admin-document-card__key">/{document.id}</span>
              <h2>{document.title}</h2>
              <p>{meta.note}</p>
              <dl><div><dt>更新时间</dt><dd>{document.updated}</dd></div><div><dt>正文长度</dt><dd>{document.content.length.toLocaleString("zh-CN")} 字符</dd></div></dl>
              <footer>
                {document.published ? <Link href={meta.path} target="_blank">查看前台<Icon name="external" size={15} /></Link> : <span>公开后可从前台访问</span>}
                <button className="admin-primary-button" type="button" onClick={() => { setNotice(""); setEditing(document); }}>编辑文书<Icon name="arrow-right" size={16} /></button>
              </footer>
            </article>
          );
        })}
      </div>
      <section className="admin-panel-card admin-document-help">
        <div className="admin-panel-card__head"><div><span>SHARED SETTINGS</span><h2>邮箱由站点设置统一管理</h2></div><Icon name="message" size={19} /></div>
        <p>正文中的邮箱变量会自动替换为“站点设置”里的联系邮箱和侵权投诉邮箱，修改一次即可同步三个页面。</p>
        <Link href="/admin/settings">管理联系邮箱 <Icon name="arrow-right" size={15} /></Link>
      </section>
      {editing && <DocumentEditor document={editing} onClose={() => setEditing(null)} onSaved={saved} />}
    </>
  );
}
