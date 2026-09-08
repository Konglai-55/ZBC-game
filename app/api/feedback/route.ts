import { createFeedback, findGame } from "@/lib/content-store";
import { checkRateLimit, clientAddress, isSameOriginRequest, rateLimitResponse, readJsonBody, RequestBodyError } from "@/lib/request-security";

type FeedbackBody = { gameSlug?: unknown; type?: unknown };

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "请求来源无效" }, { status: 403 });
  const rateLimit = checkRateLimit("feedback", clientAddress(request), 10, 60 * 60 * 1000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter);

  let body: FeedbackBody;
  try {
    body = await readJsonBody(request, 8 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "请求内容无效" }, { status: 400 });
  }

  if (typeof body.gameSlug !== "string" || !(await findGame(body.gameSlug))) {
    return Response.json({ error: "游戏不存在" }, { status: 404 });
  }
  if (body.type !== "update" && body.type !== "broken") {
    return Response.json({ error: "反馈类型无效" }, { status: 400 });
  }

  const record = {
    id: crypto.randomUUID(),
    gameSlug: body.gameSlug,
    type: body.type as "update" | "broken",
    createdAt: new Date().toISOString(),
    status: "pending" as const,
  };
  return Response.json({ data: await createFeedback(record) }, { status: 201 });
}
