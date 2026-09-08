import { requireAdminApi } from "@/lib/admin-auth";
import { errorMessage, parseGame } from "@/lib/admin-validation";
import { deleteGame, updateGame } from "@/lib/content-store";

export async function PUT(request: Request, context: { params: Promise<{ slug: string }> }) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const { slug } = await context.params;
  try {
    return Response.json({ data: await updateGame(slug, parseGame(await request.json())) });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ slug: string }> }) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const { slug } = await context.params;
  return (await deleteGame(slug))
    ? Response.json({ data: { deleted: true } })
    : Response.json({ error: "游戏不存在" }, { status: 404 });
}

