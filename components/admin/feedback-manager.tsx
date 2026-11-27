"use client";

import { useState } from "react";
import type { FeedbackRecord, Game } from "@/lib/types";

const states = { pending: "待处理", processing: "处理中", resolved: "已修复" } as const;
const dates = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" });
export function FeedbackManager({ initialFeedback, games }: { initialFeedback: FeedbackRecord[]; games: Pick<Game, "slug" | "title">[] }) {
  const [items, setItems] = useState(initialFeedback);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [next, setNext] = useState<FeedbackRecord["status"]>("processing");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const visible = items.filter(item => (!status || item.status === status) && (!type || item.type === type)
    && (!date || dates.format(new Date(item.createdAt)) === date));
  const ids = visible.filter(item => selected.includes(item.id)).map(item => item.id);
  const options = Object.entries(states).map(([key,label]) => <option key={key} value={key}>{label}</option>);
  async function save() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/feedback", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: next, note }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const updated = new Map<string, FeedbackRecord>(result.data.map((item: FeedbackRecord) => [item.id,item]));
      setItems(all => all.map(item => updated.get(item.id) ?? item));
      setSelected([]); setNote(""); setNotice(`已更新 ${ids.length} 条反馈`);
    } catch (error) { setNotice((error as Error).message); } finally { setBusy(false); }
  }
  async function remove(item: FeedbackRecord) {
    if (!confirm("将这条反馈移入回收站？")) return;
    try {
      const response = await fetch(`/api/admin/feedback/${item.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("删除失败");
      setItems(all => all.filter(old => old.id !== item.id));
    } catch(error) { setNotice((error as Error).message); }
  }
  return <><div className="admin-toolbar"><select aria-label="处理状态" value={status} onChange={e => setStatus(e.target.value)}><option value="">全部状态</option>{options}</select>
    <select aria-label="反馈类型" value={type} onChange={e => setType(e.target.value)}><option value="">全部类型</option><option value="update">催更</option><option value="broken">报错</option></select>
    <label>提交日期 <input type="date" value={date} onChange={e => setDate(e.target.value)} /></label></div>
    <div className="admin-toolbar"><select aria-label="标记为" value={next} onChange={e => setNext(e.target.value as FeedbackRecord["status"])}>{options}</select>
    <input aria-label="处理说明" maxLength={1000} placeholder="处理说明（留空保留原说明）" value={note} onChange={e => setNote(e.target.value)} />
    <button className="admin-primary-button" disabled={busy || !ids.length || ids.length > 200} onClick={save}>更新选中项（{ids.length}）</button></div>
    <p role="status">{notice}</p><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th><input aria-label="选择当前筛选结果，最多200条" type="checkbox" checked={!!ids.length && ids.length === Math.min(visible.length,200)} onChange={e => setSelected(e.target.checked ? visible.slice(0,200).map(item => item.id) : [])} /></th><th>游戏 / 类型</th><th>用户反馈</th><th>提交日期</th><th>处理状态 / 说明</th><th>操作</th></tr></thead>
    <tbody>{visible.map(item => <tr key={item.id}><td><input aria-label="选择反馈" type="checkbox" checked={selected.includes(item.id)} onChange={e => setSelected(e.target.checked ? [...selected,item.id] : selected.filter(id => id !== item.id))} /></td>
    <td>{games.find(game => game.slug === item.gameSlug)?.title ?? item.gameSlug}<small>{item.type === "broken" ? "报错" : "催更"}</small></td>
    <td>{item.message || "未填写文字"}{item.screenshot && <a href={item.screenshot} target="_blank" rel="noreferrer"><img loading="lazy" src={item.screenshot} alt="用户反馈截图" width={96} /></a>}</td>
    <td>{dates.format(new Date(item.createdAt))}</td><td>{states[item.status]}<small>{item.note}</small></td><td><button onClick={() => remove(item)}>移入回收站</button></td></tr>)}</tbody></table>
    {!visible.length && <p className="admin-empty">没有符合筛选条件的反馈。</p>}</div></>;
}
