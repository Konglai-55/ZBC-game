import { requireAdminApi } from "@/lib/admin-auth";
import { errorMessage, parseResource } from "@/lib/admin-validation";
import { createResource, listResources } from "@/lib/content-store";

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  return Response.json({ data: await listResources() });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  try {
    return Response.json({ data: await createResource(parseResource(await request.json())) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 400 });
  }
}

