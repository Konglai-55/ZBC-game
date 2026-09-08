import { requireAdminApi } from "@/lib/admin-auth";
import { errorMessage, parseGuide } from "@/lib/admin-validation";
import { deleteGuide, updateGuide } from "@/lib/content-store";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  try {
    return Response.json({ data: await updateGuide(id, parseGuide(await request.json())) });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  return (await deleteGuide(id))
    ? Response.json({ data: { deleted: true } })
    : Response.json({ error: "教程不存在" }, { status: 404 });
}

