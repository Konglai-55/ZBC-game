import { requireAdminApi } from "@/lib/admin-auth";
import { feedbackImage } from "@/lib/content-store";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  const bytes = await feedbackImage((await context.params).id);
  if (!bytes) return new Response(null, { status: 404 });
  const type = bytes[0] === 0xff ? "image/jpeg" : bytes[0] === 0x89 ? "image/png" : "image/webp";
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": type, "Cache-Control": "private, no-store" } });
}
