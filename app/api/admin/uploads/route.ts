import { requireAdminApi } from "@/lib/admin-auth";
import { errorMessage } from "@/lib/admin-validation";
import { listUploads, saveUpload } from "@/lib/content-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  return Response.json({ data: await listUploads() });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 129 * 1024 * 1024) {
    return Response.json({ error: "上传请求过大" }, { status: 413 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return Response.json({ error: "请选择要上传的文件" }, { status: 400 });
    return Response.json({ data: await saveUpload(file) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 400 });
  }
}

