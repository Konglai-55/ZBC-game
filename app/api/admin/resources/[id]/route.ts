import { requireAdminApi } from "@/lib/admin-auth";
import { errorMessage, parseResource } from "@/lib/admin-validation";
import { deleteResource, updateResource } from "@/lib/content-store";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  try {
    return Response.json({ data: await updateResource(id, parseResource(await request.json())) });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  return (await deleteResource(id))
    ? Response.json({ data: { deleted: true } })
    : Response.json({ error: "资源不存在" }, { status: 404 });
}

