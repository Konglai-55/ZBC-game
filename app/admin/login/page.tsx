import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { BrandLogo } from "@/components/brand-logo";
import { Icon } from "@/components/icon";
import { getAdminSession } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "后台登录" };

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect("/admin");
  return <main className="admin-login-page"><section className="admin-login-card"><div className="admin-login-brand"><BrandLogo priority variant="login" /></div><div className="admin-login-copy"><span><Icon name="shield" size={16} />管理员安全入口</span><h1>管理全部站点内容</h1><p>维护游戏、下载线路、附件、工具资源、教程和用户反馈。</p></div><AdminLoginForm /><p className="admin-login-note">开发环境登录：admin / ZBCGame@2026。生产环境必须通过环境变量修改默认凭据。</p></section></main>;
}
