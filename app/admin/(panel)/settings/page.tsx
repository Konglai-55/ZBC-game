import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SettingsManager } from "@/components/admin/settings-manager";
import { getSiteSettings } from "@/lib/content-store";

export default async function AdminSettingsPage() {
  return <div className="admin-page"><AdminPageHeader eyebrow="SYSTEM / SETTINGS" title="站点设置" description="修改品牌名称、分类页文案、首页公告和联系邮箱。" icon="cpu" /><SettingsManager initialSettings={await getSiteSettings()} /></div>;
}
