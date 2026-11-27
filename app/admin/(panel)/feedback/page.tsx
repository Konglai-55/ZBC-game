import { revalidatePath } from "next/cache";
import { requireAdminPage } from "@/lib/admin-auth";
import { answerComment, commentQuestions } from "@/lib/content-store";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FeedbackManager } from "@/components/admin/feedback-manager";
import { Icon } from "@/components/icon";
import { listFeedback, listGames } from "@/lib/content-store";

export default async function AdminFeedbackPage() {
  await requireAdminPage();
  const [feedback, games, questions] = await Promise.all([listFeedback(), listGames(), commentQuestions()]);
  async function answer(data: FormData) {
    "use server";
    await requireAdminPage();
    await answerComment(String(data.get("id")),String(data.get("answer") || ""));
    revalidatePath("/admin/feedback");
  }
  return <div className="admin-page"><AdminPageHeader eyebrow="OPERATIONS / FEEDBACK" title="反馈处理" description="处理资源报错和游戏催更，并保留维护记录。" icon="message" actions={<span className="admin-header-hint"><Icon name="shield" size={15} />仅管理员可见</span>} /><FeedbackManager initialFeedback={feedback} games={games.map(game => ({ slug:game.communityId ?? game.slug,title:game.title }))} />
    <h2>评论与 FAQ 答案</h2><p>填写并保存答案后，问题会置顶到对应游戏详情。同一问题的后续留言会自动归并。</p>
    {questions.map(item => <details key={item.id}><summary>{item.answer ? "已置顶" : "待答复"} · {item.game} · {item.message}</summary>
      <form className="discussion-form" action={answer}><input type="hidden" name="id" value={item.id}/><label>答复（清空可撤下置顶）<textarea maxLength={1200} name="answer" defaultValue={item.answer}/></label><button>保存答复</button></form></details>)}</div>;
}
