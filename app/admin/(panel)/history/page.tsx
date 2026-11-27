import { PurgeFile } from "@/components/admin/purge-file";
import { revalidatePath } from "next/cache";
import { requireAdminPage } from "@/lib/admin-auth";
import { listTrash, recentAudit, restoreItem } from "@/lib/content-store";

const labels: Record<string,string> = { "games.json":"游戏","guides.json":"教程","resources.json":"资源","feedback.json":"反馈","settings.json":"设置","legal-documents.json":"站点文书", uploads:"文件",comments:"评论",auth:"登录" };
const date = (value: string) => new Date(value).toLocaleString("zh-CN", { timeZone:"Asia/Shanghai" });

export default async function MaintenancePage() {
  await requireAdminPage();
  const [trash,logs] = await Promise.all([listTrash(),recentAudit()]);
  async function restore(data: FormData) {
    "use server";
    await requireAdminPage();
    await restoreItem(String(data.get("source")),String(data.get("id")));
    revalidatePath("/admin/history");
  }
  return <main className="admin-page"><h1>回收站与操作日志</h1><h2>回收站（{trash.length}）</h2>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>内容</th><th>移入时间</th><th>操作人</th><th>操作</th></tr></thead>
    <tbody>{trash.map(item => <tr key={item.source+item.id}><td>{labels[item.source]} · {item.title}</td><td>{date(item.at)}</td><td>{item.actor}</td>
    <td><form action={restore}><input type="hidden" name="source" value={item.source}/><input type="hidden" name="id" value={item.id}/><button>恢复</button></form>{item.source === "uploads" && <PurgeFile url={item.id} />}</td></tr>)}</tbody></table></div>
    <h2>最近操作</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>时间 / 账号</th><th>操作</th><th>对象</th><th>变更字段</th></tr></thead>
    <tbody>{logs.map((item,i) => <tr key={i}><td>{date(item.at)} · {item.actor}</td><td>{item.action}</td><td>{labels[item.source]} · {item.target}</td><td>{item.fields.join("、")}</td></tr>)}</tbody></table></div></main>;
}
