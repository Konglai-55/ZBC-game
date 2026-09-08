import { requireAdminApi } from "@/lib/admin-auth";
import { errorMessage, parseGame } from "@/lib/admin-validation";
import { createGame, listGames } from "@/lib/content-store";

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  return Response.json({ data: await listGames() });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  try {
    const game = parseGame(await request.json());
    return Response.json({ data: await createGame(game) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 400 });
  }
}

