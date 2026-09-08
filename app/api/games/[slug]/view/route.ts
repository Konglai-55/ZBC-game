import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { recordGameView } from "@/lib/content-store";
import { objectStorageSourceConfig } from "@/lib/object-storage-config";
import { checkRateLimit, clientAddress, isSameOriginRequest, rateLimitResponse } from "@/lib/request-security";

const viewerCookieName = "zbc_viewer";

function viewerSignature(value: string) {
  return createHmac("sha256", objectStorageSourceConfig.secretAccessKey).update(value).digest("base64url");
}

function validViewerId(value?: string) {
  if (!value) return undefined;
  const [id, signature, extra] = value.split(".");
  if (!id || !signature || extra || !/^[a-f0-9]{32}$/.test(id)) return undefined;
  const expected = Buffer.from(viewerSignature(id));
  const actual = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? id : undefined;
}

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "请求来源无效" }, { status: 403 });
  const rateLimit = checkRateLimit("game-view", clientAddress(request), 120, 60 * 60 * 1000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter);

  const { slug } = await context.params;
  const existingViewerId = validViewerId(request.cookies.get(viewerCookieName)?.value);
  const viewerId = existingViewerId ?? randomUUID().replaceAll("-", "");
  const visitorKey = createHash("sha256").update(viewerId).digest("hex");
  const result = await recordGameView(slug, visitorKey);
  if (!result) return NextResponse.json({ error: "游戏不存在" }, { status: 404 });

  const response = NextResponse.json({ data: result });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  if (!existingViewerId) {
    response.cookies.set(viewerCookieName, `${viewerId}.${viewerSignature(viewerId)}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
    });
  }
  return response;
}
