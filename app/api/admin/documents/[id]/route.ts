import { requireAdminApi } from "@/lib/admin-auth";
import { errorMessage, parseLegalDocument } from "@/lib/admin-validation";
import { updateLegalDocument } from "@/lib/content-store";
import type { LegalDocumentId } from "@/lib/types";

const ids: LegalDocumentId[] = ["about", "infringement", "copyright"];

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const { id: requestedId } = await context.params;
  const id = requestedId as LegalDocumentId;
  if (!ids.includes(id)) return Response.json({ error: "站点文书不存在" }, { status: 404 });
  try {
    return Response.json({ data: await updateLegalDocument(id, parseLegalDocument(await request.json(), id)) });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 400 });
  }
}

