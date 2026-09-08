import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GuideManager } from "@/components/admin/guide-manager";
import { Icon } from "@/components/icon";
import { listGuides } from "@/lib/content-store";

export default async function AdminGuidesPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: newParam } = await searchParams;
  return <div className="admin-page"><AdminPageHeader eyebrow="CONTENT / GUIDES" title="教程管理" description="维护电脑、Switch、手机、PS5、PS4 与其他平台的帮助文章。" icon="book" actions={<span className="admin-header-hint"><Icon name="message" size={15} />公开内容直接显示在帮助中心</span>} /><GuideManager initialGuides={await listGuides()} initialCreate={newParam === "1"} /></div>;
}
