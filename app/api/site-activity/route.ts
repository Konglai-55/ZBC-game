import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { activityDate, downloadProviders, normalizeSearchTerm, type ActivityEvent } from "@/lib/activity-events";
import { countDownload } from "@/lib/content-store";
import { appendSiteActivity } from "@/lib/site-activity-store";
import { checkRateLimit, clientAddress, isSameOriginRequest, rateLimitResponse, readJsonBody, RequestBodyError } from "@/lib/request-security";

const cookie = "zbc_activity";
const maxAge = 180 * 24 * 60 * 60;

function signature(value: string, secret: string) {
  return createHmac("sha256", secret).update("site-activity:").update(value).digest("base64url");
}

function parseVisitor(token: string | undefined, secret: string, today: string) {
  const [id, firstDay, signed, extra] = token?.split(".") ?? [];
  if (!id || !firstDay || !signed || extra || !/^[a-f0-9]{32}$/.test(id) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(firstDay) || firstDay > today) return null;
  const expected = Buffer.from(signature(`${id}.${firstDay}`, secret));
  const supplied = Buffer.from(signed);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied) ? { id, firstDay } : null;
}

function parseEvent(raw: unknown): ActivityEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const fields = raw as Record<string, unknown>;
  if (fields.type === "visit") return { type: "visit" };
  if (fields.type === "search" && typeof fields.term === "string" && typeof fields.noResults === "boolean") {
    const term = normalizeSearchTerm(fields.term);
    if (term) return { type: "search", term, noResults: fields.noResults };
  }
  if (fields.type === "download" && (fields.kind === "game" || fields.kind === "resource") &&
    typeof fields.id === "string" && /^[\p{L}\p{N}_-]{1,90}$/u.test(fields.id) &&
    typeof fields.provider === "string" && Object.hasOwn(downloadProviders, fields.provider)) {
    return { type: "download", kind: fields.kind, id: fields.id, provider: fields.provider as keyof typeof downloadProviders };
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new Response(null, { status: 403 });
  if (request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1" || await isAdminAuthenticated()) {
    return new Response(null, { status: 204 });
  }
  const rate = checkRateLimit("site-activity", clientAddress(request), 180, 60 * 1000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return new Response(null, { status: 503 });

  let event: ActivityEvent | null;
  try {
    event = parseEvent(await readJsonBody(request, 1536));
  } catch (error) {
    if (error instanceof RequestBodyError) return new Response(null, { status: error.status });
    throw error;
  }
  if (!event) return new Response(null, { status: 400 });

  const today = activityDate.format(new Date());
  const existing = parseVisitor(request.cookies.get(cookie)?.value, secret, today);
  const visitor = existing ?? { id: randomUUID().replaceAll("-", ""), firstDay: today };
  if (event.type === "download" && event.kind === "game") await countDownload(event.id, event.provider, signature(visitor.id,secret));
  await appendSiteActivity(today, event.type === "visit" ? {
    type: "visit", visitor: signature(visitor.id, secret), firstDay: visitor.firstDay,
  } : event);

  const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  if (!existing) {
    const value = `${visitor.id}.${visitor.firstDay}`;
    const host = (request.headers.get("host") ?? request.nextUrl.hostname).toLowerCase();
    const sharedDomain = host === "zbcyx.com" || host === "www.zbcyx.com" ? "zbcyx.com" : undefined;
    response.cookies.set(cookie, `${value}.${signature(value, secret)}`, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", domain: sharedDomain, maxAge,
    });
  }
  return response;
}
