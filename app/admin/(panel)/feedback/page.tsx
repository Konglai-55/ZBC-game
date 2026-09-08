import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FeedbackManager } from "@/components/admin/feedback-manager";
import { Icon } from "@/components/icon";
import { listFeedback, listGames } from "@/lib/content-store";

export default async function AdminFeedbackPage() {
  const [feedback, games] = await Promise.all([listFeedback(), listGames()]);
  return <div className="admin-page"><AdminPageHeader eyebrow="OPERATIONS / FEEDBACK" title="反馈处理" description="处理资源报错和游戏催更，并保留维护记录。" icon="message" actions={<span className="admin-header-hint"><Icon name="shield" size={15} />仅管理员可见</span>} /><FeedbackManager initialFeedback={feedback} games={games} /></div>;
}
