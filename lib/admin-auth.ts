import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSameOriginRequest } from "@/lib/request-security";

const COOKIE_NAME = "zbc_game_admin";
const SESSION_SECONDS = 12 * 60 * 60;

type SessionPayload = {
  username: string;
  role: "admin";
  expiresAt: number;
};

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || "";
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(encodedPayload: string) {
  return createHmac("sha256", sessionSecret()).update(encodedPayload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function createToken(username: string) {
  const payload: SessionPayload = { username, role: "admin", expiresAt: Date.now() + SESSION_SECONDS * 1000 };
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

function verifyToken(token?: string): SessionPayload | null {
  if (!token || !sessionSecret()) return null;
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra || !safeEqual(signature, sign(encoded))) return null;
  try {
    const payload = JSON.parse(decode(encoded)) as SessionPayload;
    if (payload.role !== "admin" || !payload.username || payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function hasConfiguredCredentials() {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
}

export function adminAuthConfigured() {
  return hasConfiguredCredentials();
}

export function verifyAdminCredentials(username: string, password: string) {
  const expectedUsername = process.env.ADMIN_USERNAME || "";
  const expectedPassword = process.env.ADMIN_PASSWORD || "";
  return safeEqual(username, expectedUsername) && safeEqual(password, expectedPassword);
}

export async function createAdminSession(username: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createToken(username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_SECONDS,
    path: "/",
    priority: "high",
  });
}

export async function deleteAdminSession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getAdminSession() {
  if (!(await adminAuthConfigured())) return null;
  return verifyToken((await cookies()).get(COOKIE_NAME)?.value);
}

export async function isAdminAuthenticated() {
  return Boolean(await getAdminSession());
}

export async function requireAdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function requireAdminApi(request?: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "未登录或会话已过期" }, { status: 401 });
  }
  if (request && request.method !== "GET" && request.method !== "HEAD" && !isSameOriginRequest(request)) {
    return Response.json({ error: "请求来源无效" }, { status: 403 });
  }
  return null;
}
