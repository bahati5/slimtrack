import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#4f2b1f"/>
  <text x="256" y="340" font-family="system-ui,sans-serif" font-size="280" font-weight="bold" fill="#efcedb" text-anchor="middle">S</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
