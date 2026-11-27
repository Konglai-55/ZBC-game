"use client";

import { useState } from "react";
import { mediaUrl } from "@/lib/media-url";
import type { UploadRecord } from "@/lib/types";

export function UploadManager({ initialUploads }: { initialUploads: UploadRecord[] }) {
  const [items,setItems] = useState(initialUploads);
  const [term,setTerm] = useState("");
  const [unused,setUnused] = useState(false);
  const [page,setPage] = useState(1);
  const [selected,setSelected] = useState<string[]>([]);
  const [owner,setOwner] = useState("");
  const [purpose,setPurpose] = useState("file");
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState("");
  const matches = items.filter(item => (!unused || (item.kind === "image" && !item.referenced)) && item.name.toLowerCase().includes(term.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(matches.length / 48));
  const current = Math.min(page,pages);
  const visible = matches.slice((current-1)*48,current*48);
  async function recycle(urls: string[]) {
    if (!urls.length || !confirm(`将 ${urls.length} 个未引用文件移入回收站？`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/uploads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls }) });
      if (!response.ok) throw new Error((await response.json()).error);
      setItems(all => all.filter(item => !urls.includes(item.url)));
      setSelected([]); setNotice("已移入回收站");
    } catch(error) { setNotice((error as Error).message); } finally { setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const data = new FormData();
      data.set("file",file); data.set("owner",owner.trim() || "shared"); data.set("purpose",purpose);
      const response = await fetch("/api/admin/uploads", { method: "POST", body:data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setItems(all => [result.data,...all.filter(item => item.url !== result.data.url)]);
      setNotice("上传完成"); setPage(1);
    } catch(error) { setNotice((error as Error).message); } finally { setBusy(false); }
  }
  return <><div className="admin-toolbar"><label>归档标识 <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="游戏 slug，留空归入 shared" /></label>
    <select aria-label="文件用途" value={purpose} onChange={e => setPurpose(e.target.value)}>{Object.entries({ file:"通用附件",cover:"主图",baidu:"百度",quark:"夸克",mobile:"移动",xunlei:"迅雷" }).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
    <label className="admin-file-button">上传文件<input disabled={busy} type="file" onChange={e => upload(e.target.files?.[0])} /></label></div>
    <div className="admin-toolbar"><input aria-label="搜索文件" type="search" placeholder="搜索文件名、游戏标识或用途" value={term} onChange={e => { setTerm(e.target.value);setPage(1);setSelected([]); }} />
    <label><input type="checkbox" checked={unused} onChange={e => {setUnused(e.target.checked);setPage(1);setSelected([]);}} /> 仅未被引用图片</label><span>{matches.length} 个文件</span>
    <button onClick={() => setSelected(visible.filter(item => !item.referenced).map(item => item.url))}>选择本页未引用文件</button>
    <button disabled={!selected.length || busy} onClick={() => recycle(selected)}>移入回收站（{selected.length}）</button></div>
    <p role="status">{notice}</p><div className="admin-file-grid">{visible.map(item => <article className="admin-file-card" key={item.url}>
      {item.kind === "image" && <img src={item.url.startsWith("/uploads/") ? item.url : mediaUrl(item.url)} alt="" loading="lazy" width={240} height={110} style={{ objectFit:"contain" }} />}
      <div><label><input type="checkbox" disabled={!!item.referenced || busy} checked={selected.includes(item.url)} onChange={e => setSelected(e.target.checked ? [...selected,item.url] : selected.filter(url => url !== item.url))} />{item.name}</label>
      <small>{item.referenced ? "已引用" : "未引用"} · {Math.ceil(item.size/1024)} KB</small></div><footer><a href={item.kind === "image" && !item.url.startsWith("/uploads/") ? mediaUrl(item.url) : item.url} target="_blank" rel="noreferrer">预览 / 下载</a>
      <button disabled={busy || !!item.referenced} onClick={() => recycle([item.url])}>删除</button></footer></article>)}</div>
    <nav className="admin-toolbar" aria-label="文件分页"><button disabled={current <= 1} onClick={() => {setPage(current-1);setSelected([]);}}>上一页</button>
    <span>{current} / {pages}</span><button disabled={current >= pages} onClick={() => {setPage(current+1);setSelected([]);}}>下一页</button></nav></>;
}
