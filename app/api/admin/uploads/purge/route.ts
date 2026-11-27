import { requireAdminApi } from "@/lib/admin-auth";
import { purgeRecycledFile } from "@/lib/content-store";
export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  try {
    const { url } = await request.json();
    await purgeRecycledFile(url);
    return Response.json({ ok:true });
  } catch(error) { return Response.json({ error:(error as Error).message },{status:400}); }
}
