import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DocumentManager } from "@/components/admin/document-manager";
import { Icon } from "@/components/icon";
import { listLegalDocuments } from "@/lib/content-store";

export default async function AdminDocumentsPage() {
  return (
    <div className="admin-page">
      <AdminPageHeader eyebrow="CONTENT / SITE DOCUMENTS" title="站点文书" description="维护关于我们、侵权处理和版权声明，保存后同步到前台。" icon="shield" actions={<span className="admin-header-hint"><Icon name="check" size={15} />三个固定文书不可删除</span>} />
      <DocumentManager initialDocuments={await listLegalDocuments()} />
    </div>
  );
}
