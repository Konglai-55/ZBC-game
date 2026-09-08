"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { platformMeta } from "@/lib/data";
import type { DownloadSource, Game, Platform } from "@/lib/types";
import { mediaUrl } from "@/lib/media-url";

const downloadIds: DownloadSource["id"][] = ["quark", "baidu", "xunlei", "mobile"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function blankGame(): Game {
  return {
    slug: "", title: "", englishTitle: "", tagline: "", platform: "pc", category: "动作冒险", genre: "", size: "", updated: today(), badge: "新游", score: 8, views: 0, featured: false, cover: "", description: [],
    requirements: { minimum: [], recommended: [] },
    downloads: [
      { id: "quark", name: "夸克网盘", url: "https://pan.quark.cn/", recommended: true },
      { id: "baidu", name: "百度网盘", url: "https://pan.baidu.com/" },
      { id: "xunlei", name: "迅雷云盘", url: "https://pan.xunlei.com/" },
      { id: "mobile", name: "移动云盘", url: "https://yun.139.com/" },
    ],
  };
}

async function responsePayload(response: Response) {
  return await response.json() as { data?: Game; error?: string };
}

function GameEditor({ game, isNew, onClose, onSaved }: { game: Game; isNew: boolean; onClose: () => void; onSaved: (game: Game, originalSlug?: string) => void }) {
  const [cover, setCover] = useState(game.cover || "");
  const [qrCodes, setQrCodes] = useState<Record<DownloadSource["id"], string>>(() => Object.fromEntries(downloadIds.map((id) => [id, game.downloads.find((source) => source.id === id)?.qrCode || ""])) as Record<DownloadSource["id"], string>);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [platform, setPlatform] = useState<Platform>(game.platform);

  async function uploadCover(file?: File) {
    if (!file) return;
    setUploading(true);
    setMessage("");
    const formData = new FormData();
    formData.set("file", file);
    const response = await fetch("/api/admin/uploads", { method: "POST", body: formData });
    const payload = await response.json() as { data?: { url: string }; error?: string };
    if (response.ok && payload.data) setCover(payload.data.url);
    else setMessage(payload.error || "封面上传失败");
    setUploading(false);
  }

  async function uploadQrCode(id: DownloadSource["id"], file?: File) {
    if (!file) return;
    setUploading(true);
    setMessage("");
    const formData = new FormData();
    formData.set("file", file);
    const response = await fetch("/api/admin/uploads", { method: "POST", body: formData });
    const payload = await response.json() as { data?: { url: string }; error?: string };
    if (response.ok && payload.data) setQrCodes((current) => ({ ...current, [id]: payload.data!.url }));
    else setMessage(payload.error || "二维码上传失败");
    setUploading(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const downloads = downloadIds.map((id) => {
      if (data.get(`${id}Enabled`) !== "on") return null;
      return { id, name: String(data.get(`${id}Name`) || ""), url: game.downloads.find((source) => source.id === id)?.url || "", qrCode: qrCodes[id] || undefined, code: String(data.get(`${id}Code`) || "") || undefined, recommended: data.get(`${id}Recommended`) === "on" };
    }).filter((source): source is NonNullable<typeof source> => Boolean(source));
    const payload = {
      slug: data.get("slug"), title: data.get("title"), englishTitle: data.get("englishTitle"), tagline: data.get("tagline"), platform: data.get("platform"), category: data.get("category"), genre: data.get("genre"), size: data.get("size"), updated: data.get("updated"), badge: data.get("badge"), score: Number(data.get("score")), featured: data.get("featured") === "on", cover, description: data.get("description"),
      requirements: { minimum: data.get("minimum"), recommended: data.get("recommended") }, downloads,
    };
    const response = await fetch(isNew ? "/api/admin/games" : `/api/admin/games/${encodeURIComponent(game.slug)}`, { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await responsePayload(response);
    if (!response.ok || !result.data) {
      setMessage(result.error || "保存失败");
      setSaving(false);
      return;
    }
    onSaved(result.data, isNew ? undefined : game.slug);
  }

  return <div className="admin-editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="admin-editor" role="dialog" aria-modal="true" aria-labelledby="game-editor-title"><header><div><span>{isNew ? "CREATE GAME" : "EDIT GAME"}</span><h2 id="game-editor-title">{isNew ? "新增游戏" : `编辑：${game.title}`}</h2><p>游戏资料保存后会立即同步到前台页面。</p></div><button type="button" aria-label="关闭编辑器" onClick={onClose}><Icon name="x" /></button></header><form onSubmit={submit}>
    <fieldset><legend>基本信息</legend><div className="admin-form-grid admin-form-grid--3"><label>中文名称<input name="title" defaultValue={game.title} required /></label><label>英文名称<input name="englishTitle" defaultValue={game.englishTitle} required /></label><label>地址标识<input name="slug" defaultValue={game.slug} placeholder="game-name" required /></label><label>游戏平台<select name="platform" value={platform} onChange={(event) => setPlatform(event.target.value as Platform)}>{platformMeta.map((item) => <option value={item.key} key={item.key}>{item.label}</option>)}</select></label><label>分类<input name="category" defaultValue={game.category} required /></label><label>具体类型<input name="genre" defaultValue={game.genre} required /></label><label>文件大小<input name="size" defaultValue={game.size} placeholder="例如 25 GB" required /></label><label>更新时间<input name="updated" type="date" defaultValue={game.updated} required /></label><label>状态标签<select name="badge" defaultValue={game.badge}><option>新游</option><option>更新</option><option>热门</option><option>精选</option></select></label><label>评分<input name="score" type="number" min="0" max="10" step="0.1" defaultValue={game.score} required /></label><label>真实阅读量（自动统计）<input type="number" value={game.views} readOnly title="由前台真实访问自动统计" /></label><label className="admin-checkbox"><input name="featured" type="checkbox" defaultChecked={game.featured} /><span>设为首页精选</span></label></div><label>一句话介绍<textarea name="tagline" rows={2} defaultValue={game.tagline} required /></label><label>游戏介绍（每行一个段落）<textarea name="description" rows={5} defaultValue={game.description.join("\n")} required /></label></fieldset>
    <fieldset><legend>封面图片</legend><div className="admin-cover-upload">{cover ? <Image src={mediaUrl(cover)} alt="当前游戏封面" width={320} height={150} /> : <div><Icon name="gamepad" size={28} />尚未上传封面</div>}<div><label className="admin-file-button"><Icon name="download" size={17} />{uploading ? "正在上传…" : "选择并上传封面"}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={uploading} onChange={(event) => uploadCover(event.target.files?.[0])} /></label><input aria-label="封面对象存储地址" value={cover} readOnly placeholder="上传后自动填写" /><small>支持 JPG、PNG、WebP、GIF；图片将直接上传至对象存储。</small></div></div></fieldset>
    {platform === "pc" && <fieldset><legend>系统配置</legend><div className="admin-form-grid"><label>最低配置（每行一项）<textarea name="minimum" rows={6} defaultValue={game.requirements?.minimum.join("\n")} /></label><label>推荐配置（每行一项）<textarea name="recommended" rows={6} defaultValue={game.requirements?.recommended.join("\n")} /></label></div></fieldset>}
    <fieldset><legend>网盘二维码</legend><p className="admin-field-help">上传对应网盘 App 的二维码图片，前台点击下载时会展示该二维码，不再生成或直接打开下载链接。未上传二维码或未启用的网盘线路不会显示。</p><div className="admin-download-editors">{downloadIds.map((id) => { const source = game.downloads.find((item) => item.id === id); const label = id === "quark" ? "夸克网盘" : id === "baidu" ? "百度网盘" : id === "xunlei" ? "迅雷云盘" : "移动云盘"; const qrCode = qrCodes[id]; return <div key={id}><label className="admin-checkbox"><input name={`${id}Enabled`} type="checkbox" defaultChecked={Boolean(source)} /><span>{label} · 启用此线路</span></label><label>显示名称<input name={`${id}Name`} defaultValue={source?.name || label} required /></label><div className="admin-qr-upload">{qrCode ? <Image src={mediaUrl(qrCode)} alt={`${label}二维码`} width={92} height={92} /> : <div className="admin-qr-upload__empty"><Icon name="cloud" size={24} />尚未上传二维码</div>}<label className="admin-file-button"><Icon name="upload" size={17} />{uploading ? "正在上传…" : "上传二维码"}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={uploading} onChange={(event) => uploadQrCode(id, event.target.files?.[0])} /></label></div><label>提取码 / 文本<input name={`${id}Code`} defaultValue={source?.code} /></label><label className="admin-checkbox"><input name={`${id}Recommended`} type="checkbox" defaultChecked={source?.recommended} /><span>标记为推荐线路</span></label></div>; })}</div></fieldset>
    {message && <p className="admin-form-message is-error" role="alert">{message}</p>}<footer><button className="admin-secondary-button" type="button" onClick={onClose}>取消</button><button className="admin-primary-button" type="submit" disabled={saving || uploading}>{saving ? "正在保存…" : "保存游戏"}<Icon name="check" size={17} /></button></footer>
  </form></section></div>;
}

export function GameManager({ initialGames, initialCreate = false }: { initialGames: Game[]; initialCreate?: boolean }) {
  const router = useRouter();
  const [games, setGames] = useState(initialGames);
  const [editing, setEditing] = useState<Game | null>(null);
  const [creating, setCreating] = useState(initialCreate);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = useMemo(() => games.filter((game) => `${game.title} ${game.englishTitle} ${game.slug}`.toLowerCase().includes(query.toLowerCase())), [games, query]);

  function saved(game: Game, originalSlug?: string) {
    setGames((items) => originalSlug ? items.map((item) => item.slug === originalSlug ? game : item) : [game, ...items]);
    setEditing(null); setCreating(false); setNotice(`《${game.title}》已保存`); router.refresh();
  }

  async function remove(game: Game) {
    if (!window.confirm(`确定删除《${game.title}》吗？该操作不会自动删除已上传封面。`)) return;
    const response = await fetch(`/api/admin/games/${encodeURIComponent(game.slug)}`, { method: "DELETE" });
    if (response.ok) { setGames((items) => items.filter((item) => item.slug !== game.slug)); setNotice(`《${game.title}》已删除`); router.refresh(); }
    else { const payload = await responsePayload(response); setNotice(payload.error || "删除失败"); }
  }

  return <><div className="admin-toolbar"><label className="admin-search"><Icon name="search" size={18} /><input aria-label="搜索游戏" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称或标识…" /></label><button className="admin-primary-button" type="button" onClick={() => setCreating(true)}>新增游戏<Icon name="arrow-right" size={17} /></button></div>{notice && <p className="admin-form-message is-success" role="status">{notice}</p>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>游戏</th><th>平台 / 分类</th><th>版本信息</th><th>状态 / 阅读</th><th>操作</th></tr></thead><tbody>{filtered.map((game) => <tr key={game.slug}><td><div className="admin-game-cell">{game.cover && <Image src={mediaUrl(game.cover)} alt="" width={92} height={43} />}<span><strong>{game.title}</strong><small>{game.englishTitle}</small></span></div></td><td><strong>{platformMeta.find((item) => item.key === game.platform)?.label}</strong><small>{game.category} · {game.genre}</small></td><td><strong>{game.size}</strong><small>{game.updated}</small></td><td><span className="admin-status is-published">{game.badge}</span><small>{game.views.toLocaleString("zh-CN")} 次真实阅读</small>{game.featured && <small>首页精选</small>}</td><td><div className="admin-row-actions"><a href={`/games/${game.slug}`} target="_blank" aria-label={`预览${game.title}`}><Icon name="eye" size={16} /></a><button type="button" onClick={() => setEditing(game)}>编辑</button><button className="is-danger" type="button" onClick={() => remove(game)}>删除</button></div></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="admin-empty">没有匹配的游戏。</div>}</div>{creating && <GameEditor game={blankGame()} isNew onClose={() => setCreating(false)} onSaved={saved} />}{editing && <GameEditor game={editing} isNew={false} onClose={() => setEditing(null)} onSaved={saved} />}</>;
}
