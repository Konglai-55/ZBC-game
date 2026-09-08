"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Icon, type IconName } from "@/components/icon";

const items: Array<{ href: string; label: string; description: string; icon: IconName }> = [
  { href: "/admin", label: "控制台", description: "数据概览", icon: "grid" },
  { href: "/admin/games", label: "游戏管理", description: "内容与下载线路", icon: "gamepad" },
  { href: "/admin/resources", label: "资源管理", description: "MOD、工具与补丁", icon: "wrench" },
  { href: "/admin/guides", label: "教程管理", description: "帮助内容", icon: "book" },
  { href: "/admin/documents", label: "站点文书", description: "关于、侵权与版权", icon: "shield" },
  { href: "/admin/feedback", label: "反馈处理", description: "催更与失效", icon: "message" },
  { href: "/admin/uploads", label: "文件库", description: "图片与附件", icon: "hard-drive" },
  { href: "/admin/settings", label: "站点设置", description: "品牌与母站", icon: "cpu" },
];

export function AdminShell({ username, children }: { username: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="admin-app">
      <aside className={`admin-sidebar ${open ? "is-open" : ""}`}>
        <div className="admin-brand"><BrandLogo priority variant="admin" /></div>
        <nav aria-label="后台导航">
          {items.map((item) => {
            const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
            return <Link className={active ? "is-active" : ""} href={item.href} key={item.href} onClick={() => setOpen(false)}><Icon name={item.icon} size={19} /><span><strong>{item.label}</strong><small>{item.description}</small></span></Link>;
          })}
        </nav>
        <div className="admin-sidebar__footer"><Link href="/" target="_blank"><Icon name="external" size={17} />打开前台</Link><button type="button" onClick={logout} disabled={loggingOut}><Icon name="x" size={17} />{loggingOut ? "正在退出…" : "退出登录"}</button></div>
      </aside>
      {open && <button className="admin-sidebar-scrim" type="button" aria-label="关闭后台菜单" onClick={() => setOpen(false)} />}
      <div className="admin-workspace">
        <header className="admin-topbar"><button className="admin-menu-toggle" type="button" aria-label="打开后台菜单" onClick={() => setOpen(true)}><Icon name="menu" /></button><div><span className="admin-online"><i />系统正常</span><span className="admin-user"><Icon name="shield" size={16} />{username}</span></div></header>
        <main id="admin-main">{children}</main>
      </div>
    </div>
  );
}
