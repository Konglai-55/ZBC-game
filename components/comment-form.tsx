"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CommentForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    try {
      const response = await fetch(`/api/games/${encodeURIComponent(slug)}/comments`, { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      if (!response.ok) throw new Error((await response.json()).error || "提交失败");
      form.reset(); setNotice("评论已发布"); router.refresh();
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusy(false); }
  }
  return <form className="discussion-form" onSubmit={submit}><label>昵称（可留空）<input name="nickname" maxLength={30} placeholder="匿名" /></label>
    <label>留言<textarea rows={3} name="message" maxLength={800} required /></label><button disabled={busy} className="button button--primary">发表评论</button><span role="status">{notice}</span></form>;
}
