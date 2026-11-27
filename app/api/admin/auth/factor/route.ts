import { getAdminSession, requireAdminApi, verifyAdminCredentials, createAdminSession } from "@/lib/admin-auth";
import { enrollFactor } from "@/lib/content-store";
import { checkRateLimit, clientAddress, rateLimitResponse } from "@/lib/request-security";

export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  const rate = checkRateLimit("factor-enroll",clientAddress(request),10,900000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);
  const session = await getAdminSession();
  try {
    const { password,code } = await request.json();
    if (!session || typeof password !== "string" || !verifyAdminCredentials(session.username,password)) throw new Error("请核对当前密码");
    const result = await enrollFactor(typeof code === "string" ? code : undefined);
    if (result.enabled) await createAdminSession(session.username);
    return Response.json(result, { headers: { "Cache-Control":"no-store" } });
  } catch(error) { return Response.json({ error:(error as Error).message },{ status:400 }); }
}
