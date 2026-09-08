import { requireAdminApi } from "@/lib/admin-auth";
import { listFeedback } from "@/lib/content-store";

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  return Response.json({ data: await listFeedback() });
}

