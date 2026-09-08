import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "内容后台" };

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage();
  return <AdminShell username={session.username}>{children}</AdminShell>;
}
