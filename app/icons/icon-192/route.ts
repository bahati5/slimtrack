import { NextResponse } from "next/server";

export const dynamic = "force-static";

// Génère une icône PNG 192×192 via canvas-like SVG converti en PNG
// Pour une vraie icône, remplacer par un vrai fichier PNG dans /public/icons/
export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#4f2b1f"/>
  <text x="96" y="125" font-family="system-ui,sans-serif" font-size="100" font-weight="bold" fill="#efcedb" text-anchor="middle">S</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
