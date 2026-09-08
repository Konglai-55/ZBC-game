import { deleteAdminSession } from "@/lib/admin-auth";
import { isSameOriginRequest } from "@/lib/request-security";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "请求来源无效" }, { status: 403 });
  await deleteAdminSession();
  return Response.json({ data: { loggedOut: true } });
}
