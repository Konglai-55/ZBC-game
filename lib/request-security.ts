import "server-only";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();

export class RequestBodyError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "RequestBodyError";
  }
}

export function clientAddress(request: Request) {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}

export function isSameOriginRequest(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || requestUrl.protocol.replace(":", "");

  return origin === requestUrl.origin || origin === `${protocol}://${host}`;
}

export function checkRateLimit(scope: string, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucketKey = `${scope}:${key}`;
  const current = rateLimitBuckets.get(bucketKey);
  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  current.count += 1;
  if (rateLimitBuckets.size > 10_000) {
    for (const [entryKey, bucket] of rateLimitBuckets) {
      if (bucket.resetAt <= now) rateLimitBuckets.delete(entryKey);
    }
  }

  return {
    allowed: current.count <= limit,
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function rateLimitResponse(retryAfter: number) {
  return Response.json(
    { error: "请求过于频繁，请稍后再试" },
    { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(retryAfter) } },
  );
}

export async function readJsonBody<T>(request: Request, maxBytes = 32 * 1024): Promise<T> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new RequestBodyError("请求内容过大", 413);
  }
  if (!request.body) throw new RequestBodyError("请求内容无效", 400);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new RequestBodyError("请求内容过大", 413);
    }
    chunks.push(value);
  }

  try {
    return JSON.parse(Buffer.concat(chunks, total).toString("utf8")) as T;
  } catch {
    throw new RequestBodyError("请求内容无效", 400);
  }
}
