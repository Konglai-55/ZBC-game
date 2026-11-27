import { createHmac } from "node:crypto";
import { parseScreenshot, createFeedback, findGame } from "@/lib/content-store";
import { checkRateLimit, clientAddress, isSameOriginRequest, rateLimitResponse, readJsonBody, RequestBodyError } from "@/lib/request-security";

type FeedbackBody = { gameSlug?: unknown; type?: unknown; message?: unknown; screenshot?: unknown };

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "请求来源无效" }, { status: 403 });
  const rateLimit = checkRateLimit("feedback", clientAddress(request), 10, 60 * 60 * 1000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter);

  let body: FeedbackBody;
  try {
    body = await readJsonBody(request, 720 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "请求内容无效" }, { status: 400 });
  }

  const game = typeof body?.gameSlug === "string" ? await findGame(body.gameSlug) : undefined;
  if (!game) {
    return Response.json({ error: "游戏不存在" }, { status: 404 });
  }
  if (body.type !== "update" && body.type !== "broken") {
    return Response.json({ error: "反馈类型无效" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length > 1200) return Response.json({ error: "反馈文字最多 1200 字" }, { status: 400 });
  let picture: Buffer | undefined;
  try { picture = parseScreenshot(body.screenshot); }
  catch (error) { return Response.json({ error: (error as Error).message }, { status: 400 }); }
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return Response.json({ error: "反馈服务尚未配置" }, { status: 503 });
  const fingerprint = createHmac("sha256", secret)
    .update(JSON.stringify([clientAddress(request), body.gameSlug, body.type, message])).update(picture ?? "").digest("hex");
  const record = {
    message, fingerprint,
    id: crypto.randomUUID(),
    gameSlug: game.communityId ?? game.slug,
    type: body.type as "update" | "broken",
    createdAt: new Date().toISOString(),
    status: "pending" as const,
  };
  return Response.json({ data: { id: await createFeedback(record, picture) } }, { status: 201 });
}
