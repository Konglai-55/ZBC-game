import { createHmac } from "node:crypto";
import { addComment, findGame } from "@/lib/content-store";
import { checkRateLimit, clientAddress, isSameOriginRequest, readJsonBody, rateLimitResponse, RequestBodyError } from "@/lib/request-security";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!isSameOriginRequest(request)) return new Response(null, { status: 403 });
  const address = clientAddress(request);
  const limit = checkRateLimit("comment", address, 6, 3600000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  const { slug } = await context.params;
  const game = await findGame(slug);
  if (!game) return new Response(null, { status: 404 });
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return Response.json({ error: "评论尚未配置" }, { status: 503 });
  try {
    const body = await readJsonBody<{ nickname?: string; message?: string }>(request, 8192);
    const nickname = body?.nickname?.trim() || "匿名";
    const message = body?.message?.trim();
    if (!message || message.length > 800 || nickname.length > 30) throw new Error("评论限 1 至 800 字，昵称最多 30 字");
    await addComment(game.communityId ?? slug, nickname, message, createHmac("sha256", secret).update(address).digest("hex"));
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) { return Response.json({ error: (error as Error).message }, { status: error instanceof RequestBodyError ? error.status : 400 }); }
}
