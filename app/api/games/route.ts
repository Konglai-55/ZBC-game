import { listGames } from "@/lib/content-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const platform = searchParams.get("platform");
  const games = await listGames();
  const normalized = query.trim().toLowerCase();
  const matches = !normalized ? games : games.filter((game) => [game.title, game.englishTitle, game.category, game.genre, game.tagline].join(" ").toLowerCase().includes(normalized));
  const results = matches.filter((game) => !platform || game.platform === platform);
  const publicResults = results.map(({ downloads: _downloads, ...game }) => game);
  return Response.json(
    { data: publicResults, total: publicResults.length, available: games.length },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
