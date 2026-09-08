"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import type { ResourceItem } from "@/lib/types";

function today() { return new Date().toISOString().slice(0, 10); }
function blankResource(): ResourceItem { return { id: "", group: "tools", category: "工具软件", name: "", description: "", version: "1.0", size: "", updated: today(), published: true }; }

function ResourceEditor({ resource, isNew, onClose, onSaved }: { resource: ResourceItem; isNew: boolean; onClose: () => void; onSaved: (resource: ResourceItem, originalId?: string) => void }) {
  const [fileUrl, setFileUrl] = useState(resource.fileUrl || "");
  const [iconUrl, setIconUrl] = useState(resource.iconUrl || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(file: File | undefined, target: "file" | "icon" = "file") {
    if (!file) return;
    setUploading(true); setMessage("");
    const data = new FormData(); data.set("file", file);
    const response = await fetch("/api/admin/uploads", { method: "POST", body: data });
    const result = await response.json() as { data?: { url: string }; error?: string };
    if (response.ok && result.data) { if (target === "icon") setIconUrl(result.data.url); else setFileUrl(result.data.url); } else setMessage(result.error || "上传失败");
    setUploading(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const payload = { id: data.get("id"), group: data.get("group"), category: data.get("category"), name: data.get("name"), description: data.get("description"), iconUrl, version: data.get("version"), size: data.get("size"), updated: data.get("updated"), fileUrl, externalUrl: data.get("externalUrl"), published: data.get("published") === "on" };
    const response = await fetch(isNew ? "/api/admin/resources" : `/api/admin/resources/${encodeURIComponent(resource.id)}`, { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as { data?: ResourceItem; error?: string };
    if (!response.ok || !result.data) { setMessage(result.error || "保存失败"); setSaving(false); return; }
    onSaved(result.data, isNew ? undefined : resource.id);
  }

  return <div className="admin-editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="admin-editor admin-editor--compact" role="dialog" aria-modal="true" aria-labelledby="resource-editor-title"><header><div><span>{isNew ? "CREATE RESOURCE" : "EDIT RESOURCE"}</span><h2 id="resource-editor-title">{isNew ? "新增资源" : `编辑：${resource.name}`}</h2><p>可上传工具图标、普通附件，也可填写网盘或外部下载地址。</p></div><button type="button" aria-label="关闭编辑器" onClick={onClose}><Icon name="x" /></button></header><form onSubmit={submit}><fieldset><legend>资源信息</legend><div className="admin-form-grid"><label>资源名称<input name="name" defaultValue={resource.name} required /></label><label>资源标识<input name="id" defaultValue={resource.id} placeholder="resource-name" required /></label><label>所属板块<select name="group" defaultValue={resource.group}><option value="mod">MOD / 修改器</option><option value="tools">工具 / 补丁</option></select></label><label>分类<input name="category" defaultValue={resource.category} required /></label><label>版本<input name="version" defaultValue={resource.version} required /></label><label>文件大小<input name="size" defaultValue={resource.size} required /></label><label>更新时间<input type="date" name="updated" defaultValue={resource.updated} required /></label><label className="admin-checkbox"><input type="checkbox" name="published" defaultChecked={resource.published} /><span>前台公开显示</span></label></div><label>资源说明<textarea name="description" rows={5} defaultValue={resource.description} required /></label></fieldset><fieldset><legend>工具图标</legend><div className="admin-attachment-row"><label className="admin-file-button"><Icon name="upload" size={17} />{uploading ? "正在上传…" : "上传图标"}<input type="file" disabled={uploading} accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => upload(event.target.files?.[0], "icon")} /></label><input aria-label="工具图标地址" value={iconUrl} onChange={(event) => setIconUrl(event.target.value)} placeholder="可填写 /uploads/... 或 https://..." /></div><small className="admin-field-help">建议上传正方形 PNG、JPG 或 WebP，首页会显示为工具图标。</small></fieldset><fieldset><legend>文件与下载</legend><div className="admin-attachment-row"><label className="admin-file-button"><Icon name="download" size={17} />{uploading ? "正在上传…" : "上传附件"}<input type="file" disabled={uploading} accept=".zip,.7z,.rar,.pdf,.txt,.json,.jpg,.jpeg,.png,.webp,.gif" onChange={(event) => upload(event.target.files?.[0])} /></label><input aria-label="已上传附件地址" value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} placeholder="上传后自动填写" /></div><label>外部下载地址<input name="externalUrl" type="url" defaultValue={resource.externalUrl} placeholder="https://…（大文件建议使用网盘）" /></label><small className="admin-field-help">公开页会优先使用上传附件，其次使用外部地址；单个本机上传文件最大 128 MB。</small></fieldset>{message && <p className="admin-form-message is-error" role="alert">{message}</p>}<footer><button className="admin-secondary-button" type="button" onClick={onClose}>取消</button><button className="admin-primary-button" type="submit" disabled={saving || uploading}>{saving ? "正在保存…" : "保存资源"}<Icon name="check" size={17} /></button></footer></form></section></div>;
}

export function ResourceManager({ initialResources, initialCreate = false }: { initialResources: ResourceItem[]; initialCreate?: boolean }) {
  const router = useRouter();
  const [resources, setResources] = useState(initialResources);
  const [editing, setEditing] = useState<ResourceItem | null>(null);
  const [creating, setCreating] = useState(initialCreate);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<"all" | "mod" | "tools">("all");
  const [notice, setNotice] = useState("");
  const filtered = useMemo(() => resources.filter((item) => (group === "all" || item.group === group) && `${item.name} ${item.category} ${item.id}`.toLowerCase().includes(query.toLowerCase())), [resources, group, query]);

  function saved(resource: ResourceItem, originalId?: string) { setResources((items) => originalId ? items.map((item) => item.id === originalId ? resource : item) : [resource, ...items]); setEditing(null); setCreating(false); setNotice(`${resource.name} 已保存`); router.refresh(); }
  async function remove(resource: ResourceItem) { if (!window.confirm(`确定删除“${resource.name}”吗？上传的附件需要在文件库中单独删除。`)) return; const response = await fetch(`/api/admin/resources/${encodeURIComponent(resource.id)}`, { method: "DELETE" }); if (response.ok) { setResources((items) => items.filter((item) => item.id !== resource.id)); setNotice(`${resource.name} 已删除`); router.refresh(); } else { const result = await response.json() as { error?: string }; setNotice(result.error || "删除失败"); } }

  return <><div className="admin-toolbar"><label className="admin-search"><Icon name="search" size={18} /><input aria-label="搜索资源" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索资源名称…" /></label><div className="admin-segmented"><button className={group === "all" ? "is-active" : ""} onClick={() => setGroup("all")} type="button">全部</button><button className={group === "mod" ? "is-active" : ""} onClick={() => setGroup("mod")} type="button">MOD</button><button className={group === "tools" ? "is-active" : ""} onClick={() => setGroup("tools")} type="button">工具</button></div><button className="admin-primary-button" type="button" onClick={() => setCreating(true)}>新增资源<Icon name="arrow-right" size={17} /></button></div>{notice && <p className="admin-form-message is-success" role="status">{notice}</p>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>资源</th><th>板块 / 分类</th><th>版本</th><th>下载</th><th>操作</th></tr></thead><tbody>{filtered.map((resource) => <tr key={resource.id}><td><strong>{resource.name}</strong><small>{resource.description}</small></td><td><strong>{resource.group === "mod" ? "MOD / 修改器" : "工具 / 补丁"}</strong><small>{resource.category}</small></td><td><strong>{resource.version}</strong><small>{resource.size} · {resource.updated}</small></td><td><span className={`admin-status ${resource.published ? "is-published" : "is-draft"}`}>{resource.published ? "已发布" : "草稿"}</span><small>{resource.fileUrl ? "本机附件" : resource.externalUrl ? "外部链接" : "未配置"}</small></td><td><div className="admin-row-actions"><button type="button" onClick={() => setEditing(resource)}>编辑</button><button className="is-danger" type="button" onClick={() => remove(resource)}>删除</button></div></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="admin-empty">没有匹配的资源。</div>}</div>{creating && <ResourceEditor resource={blankResource()} isNew onClose={() => setCreating(false)} onSaved={saved} />}{editing && <ResourceEditor resource={editing} isNew={false} onClose={() => setEditing(null)} onSaved={saved} />}</>;
}
