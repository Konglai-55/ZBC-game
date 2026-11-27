"use client";

import { useState } from "react";

export function FactorForm({ enabled }: { enabled: boolean }) {
  const [secret,setSecret] = useState("");
  const [active,setActive] = useState(enabled);
  const [notice,setNotice] = useState("");
  const [busy,setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/auth/factor",{ method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(form))) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSecret(result.secret || ""); setActive(Boolean(result.enabled)); setNotice("");
      if (result.enabled) form.reset();
    } catch(error) {setNotice((error as Error).message);} finally {setBusy(false);}
  }
  return <section className="content-section"><h2>双重验证</h2>{active ? <p>已启用验证器动态码。</p> : <form className="discussion-form" onSubmit={submit}>
    <label>当前管理员密码<input type="password" name="password" autoComplete="current-password" required /></label>
    {secret && <><p>在验证器中新建基于时间的账户，名称填写 ZBC，输入密钥并妥善备份。</p><code>{secret}</code>
    <label>验证器中的六位数字<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required /></label></>}
    <button className="admin-primary-button" disabled={busy}>{secret ? "确认并启用" : "绑定验证器"}</button><span role="status">{notice}</span></form>}</section>;
}
