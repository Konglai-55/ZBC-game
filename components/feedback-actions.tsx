"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

type FeedbackType = "update" | "broken";

export function FeedbackActions({ gameSlug }: { gameSlug: string }) {
  const [status, setStatus] = useState<FeedbackType | "idle" | "error">("idle");
  const [loading, setLoading] = useState<FeedbackType | null>(null);

  async function submit(type: FeedbackType) {
    setLoading(type);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameSlug, type }),
      });
      if (!response.ok) throw new Error("Request failed");
      setStatus(type);
    } catch {
      setStatus("error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="feedback-box">
      <div><span>资源状态反馈</span><p>发现版本过旧或链接异常？一键告诉我们。</p></div>
      <div className="feedback-actions">
        <button disabled={Boolean(loading)} type="button" onClick={() => submit("update")}><Icon name="refresh" size={17} />{loading === "update" ? "提交中…" : "游戏催更"}</button>
        <button className="is-warning" disabled={Boolean(loading)} type="button" onClick={() => submit("broken")}><Icon name="warning" size={17} />{loading === "broken" ? "提交中…" : "资源报错"}</button>
      </div>
      {status !== "idle" && <p className={`feedback-status ${status === "error" ? "is-error" : ""}`} role="status">{status === "error" ? "提交失败，请稍后重试。" : "已收到，感谢你的反馈。"}</p>}
    </div>
  );
}
