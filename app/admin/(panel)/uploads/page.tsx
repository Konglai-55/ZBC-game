import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { UploadManager } from "@/components/admin/upload-manager";
import { listUploads } from "@/lib/content-store";

export default async function AdminUploadsPage() {
  return <div className="admin-page"><AdminPageHeader eyebrow="ASSETS / UPLOADS" title="文件库" description="图片统一上传到对象存储并生成 DNS 外链；普通附件仍保存在本机。" icon="hard-drive" /><UploadManager initialUploads={await listUploads()} /></div>;
}
