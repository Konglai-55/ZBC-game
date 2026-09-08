import { requireAdminApi } from "@/lib/admin-auth";
import { errorMessage, parseSettings } from "@/lib/admin-validation";
import { getSiteSettings, saveSiteSettings } from "@/lib/content-store";

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  return Response.json({ data: await getSiteSettings() });
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  try {
    return Response.json({ data: await saveSiteSettings(parseSettings(await request.json())) });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 400 });
  }
}

