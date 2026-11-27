import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { UploadManager } from "@/components/admin/upload-manager";
import { listUploads } from "@/lib/content-store";

export default async function AdminUploadsPage() {
  return <div className="admin-page"><AdminPageHeader eyebrow="ASSETS / UPLOADS" title="文件库" description="按游戏和用途整理上传内容，查看引用并恢复误删文件。" icon="hard-drive" /><UploadManager initialUploads={await listUploads()} /></div>;
}
