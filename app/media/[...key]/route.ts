import { signedImageUrl } from "@/lib/object-storage";

export async function GET(request: Request, context: { params: Promise<{ key: string[] }> }) {
  const denied = () => new Response(null, { status: 403, headers: { "Cache-Control":"private, no-store" } });
  if (request.headers.get("sec-fetch-site") === "cross-site") return denied();
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const host = new URL(referer).host;
      if (host !== request.headers.get("host") && !["zbcyx.com","www.zbcyx.com","zbcyx.net","www.zbcyx.net"].includes(host)) return denied();
    } catch { return denied(); }
  }
  const { key } = await context.params;
  if (!["uploads","covers","brand"].includes(key[0]) || key.length < 2 || key.length > 5 ||
    key.some(part => !part || part.startsWith(".") || /[\\/\x00-\x1f]/.test(part)) ||
    !/\.(jpe?g|png|gif|webp|svg)$/i.test(key.at(-1)!)) return new Response(null, { status: 404 });
  const url = await signedImageUrl(key.join("/"));
  return new Response(null, { status: 307, headers: { Location:url,"Cache-Control":"private, max-age=240",Vary:"Sec-Fetch-Site, Referer","Referrer-Policy":"no-referrer" } });
}
