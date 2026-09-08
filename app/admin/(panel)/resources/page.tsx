import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ResourceManager } from "@/components/admin/resource-manager";
import { listResources } from "@/lib/content-store";
import { Icon } from "@/components/icon";

export default async function AdminResourcesPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: newParam } = await searchParams;
  return <div className="admin-page"><AdminPageHeader eyebrow="CONTENT / RESOURCES" title="资源管理" description="维护 MOD、修改器、工具、补丁与常规附件。" icon="wrench" actions={<span className="admin-header-hint"><Icon name="hard-drive" size={15} />本机附件上限 128 MB</span>} /><ResourceManager initialResources={await listResources()} initialCreate={newParam === "1"} /></div>;
}
