import { requireAdminApi } from "@/lib/admin-auth";
import { errorMessage, parseFeedbackPatch } from "@/lib/admin-validation";
import { deleteFeedback, updateFeedback } from "@/lib/content-store";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  try {
    return Response.json({ data: await updateFeedback(id, parseFeedbackPatch(await request.json())) });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  return (await deleteFeedback(id))
    ? Response.json({ data: { deleted: true } })
    : Response.json({ error: "反馈不存在" }, { status: 404 });
}

