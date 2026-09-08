import { adminAuthConfigured, createAdminSession, verifyAdminCredentials } from "@/lib/admin-auth";
import { checkRateLimit, clientAddress, isSameOriginRequest, rateLimitResponse, readJsonBody, RequestBodyError } from "@/lib/request-security";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "请求来源无效" }, { status: 403 });
  const rateLimit = checkRateLimit("admin-login", clientAddress(request), 8, 15 * 60 * 1000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter);

  if (!(await adminAuthConfigured())) {
    return Response.json({ error: "生产环境尚未配置管理员账号，请设置 ADMIN_USERNAME、ADMIN_PASSWORD 和 ADMIN_SESSION_SECRET。" }, { status: 503 });
  }
  let body: { username?: unknown; password?: unknown };
  try {
    body = await readJsonBody(request, 8 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "请求内容无效" }, { status: 400 });
  }
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!verifyAdminCredentials(username, password)) {
    return Response.json({ error: "账号或密码错误" }, { status: 401 });
  }
  await createAdminSession(username);
  return Response.json({ data: { username, role: "admin" } });
}
