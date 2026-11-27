"use client";

import { useEffect, useState } from "react";

export function FeedbackActions({ gameSlug }: { gameSlug: string }) {
  const [type, setType] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const receipt = localStorage.getItem("feedback:" + gameSlug);
    if (!receipt) return;
    const abort = new AbortController();
    fetch("/api/feedback/" + encodeURIComponent(receipt), { signal: abort.signal }).then(async response => {
      if (!response.ok) return;
      const { status, note } = await response.json();
      const label = status === "resolved" ? "已修复" : status === "processing" ? "处理中" : "待处理";
      setNotice(`上次反馈：${label}${note ? " · " + note : ""}`);
    }).catch(() => {});
    return () => abort.abort();
  }, [gameSlug]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const file = data.get("picture");
      let screenshot = "";
      if (file instanceof File && file.size) {
        if (file.size > 512 * 1024) throw new Error("截图最大 512 KB");
        screenshot = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("无法读取截图"));
          reader.readAsDataURL(file);
        });
      }
      const response = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameSlug, type, message: data.get("message"), screenshot }) });
      if (!response.ok) throw new Error((await response.json()).error);
      const { data: receipt } = await response.json();
      localStorage.setItem("feedback:" + gameSlug, receipt.id);
      setType(""); setNotice("已收到反馈。");
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="feedback-box"><div><strong>资源状态反馈</strong></div>
    <div className="feedback-actions">{[["update","游戏催更"],["broken","资源报错"]].map(([value,label]) =>
      <button key={value} disabled={busy} aria-pressed={type === value} onClick={() => { setType(value); setNotice(""); }}>{label}</button>)}</div>
    {type && <form className="discussion-form" onSubmit={submit}><label>问题说明<textarea name="message" maxLength={1200} rows={3} /></label>
      <label>附上截图（选填，最大 512 KB）<input name="picture" type="file" accept="image/jpeg,image/png,image/webp" /></label>
      <button className="button button--primary" disabled={busy}>{busy ? "提交中…" : "提交反馈"}</button></form>}
    <p role="status">{notice}</p></section>;
}
