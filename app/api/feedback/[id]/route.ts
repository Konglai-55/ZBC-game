import { listFeedback } from "@/lib/content-store";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[a-f0-9-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const item = (await listFeedback()).find(row => row.id === id);
  if (!item) return new Response(null, { status: 404 });
  return Response.json({ status: item.status, note: item.note }, { headers: { "Cache-Control": "private, no-store" } });
}
