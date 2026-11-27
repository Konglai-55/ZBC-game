import { requireAdminApi } from "@/lib/admin-auth";
import { parseFeedbackPatch, errorMessage } from "@/lib/admin-validation";
import { updateFeedbackBatch, listFeedback } from "@/lib/content-store";

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  return Response.json({ data: await listFeedback() });
}


export async function PATCH(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 200 || body.ids.some((id: unknown) => typeof id !== "string")) {
      throw new Error("每次请选择 1 至 200 条反馈");
    }
    return Response.json({ data: await updateFeedbackBatch(body.ids, parseFeedbackPatch(body)) });
  } catch (error) { return Response.json({ error: errorMessage(error) }, { status: 400 }); }
}
