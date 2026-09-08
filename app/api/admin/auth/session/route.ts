import { getAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "未登录" }, { status: 401 });
  return Response.json({ data: { username: session.username, role: session.role } });
}
