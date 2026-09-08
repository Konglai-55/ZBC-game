"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icon";

export function AdminLoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: data.get("username"), password: data.get("password") }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) {
      setError(payload.error || "登录失败");
      setLoading(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return <form className="admin-login-form" onSubmit={submit}><label htmlFor="admin-username">管理员账号</label><div className="admin-input-with-icon"><Icon name="shield" size={18} /><input id="admin-username" name="username" autoComplete="username" defaultValue="admin" required /></div><label htmlFor="admin-password">密码</label><div className="admin-input-with-icon"><Icon name="cpu" size={18} /><input id="admin-password" name="password" type="password" autoComplete="current-password" required /></div>{error && <p className="admin-form-message is-error" role="alert">{error}</p>}<button className="admin-primary-button" type="submit" disabled={loading}>{loading ? "正在验证…" : "进入管理后台"}<Icon name="arrow-right" size={17} /></button></form>;
}
