import { NextResponse, type NextRequest } from "next/server";

export const runtime = "edge";

/**
 * Proxy oEmbed — évite CORS côté client.
 *   GET /api/youtube-oembed?url=<youtube_url>
 *
 * Réponse : { title, thumbnail_url, author_name, ... }
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }
  try {
    const target = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
    const res = await fetch(target, {
      headers: { "User-Agent": "SlimTrack/1.0" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "oembed failed" },
        { status: res.status },
      );
    }
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }
}
