import { requireAdminApi } from "@/lib/admin-auth";
import { errorMessage } from "@/lib/admin-validation";
import { recycleUploads, listUploads, saveUpload } from "@/lib/content-store";

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
    return Response.json({ data: await saveUpload(file, String(formData.get("owner") || "shared"), String(formData.get("purpose") || "file")) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 400 });
  }
}


export async function DELETE(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  try {
    const { urls } = await request.json();
    if (!Array.isArray(urls) || !urls.length || urls.length > 200 || urls.some(url => typeof url !== "string")) throw new Error("请选择 1 至 200 个文件");
    return Response.json({ count: await recycleUploads(urls) });
  } catch (error) { return Response.json({ error: errorMessage(error) }, { status: 400 }); }
}
