import { requireAdminApi } from "@/lib/admin-auth";
import { deleteUpload } from "@/lib/content-store";

export const runtime = "nodejs";

export async function DELETE(request: Request, context: { params: Promise<{ name: string }> }) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const { name } = await context.params;
  return (await deleteUpload(decodeURIComponent(name)))
    ? Response.json({ data: { deleted: true } })
    : Response.json({ error: "文件不存在或文件名无效" }, { status: 404 });
}

