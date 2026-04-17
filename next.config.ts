import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  cacheOnNavigation: true,
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /** Réduit les conflits DOM entre l’UI de dev Next et React en développement. */
  devIndicators: false,
  // Évite le warning "inferred workspace root" quand le lockfile parent de l'utilisateur
  // existe (cas d'un `pnpm-lock.yaml` dans le home).
  outputFileTracingRoot: __dirname,
  // Serwist ajoute un bloc `webpack` même en dev (désactivé) : on indique
  // à Next 16 qu'on accepte de tourner sous Turbopack sans config supplémentaire.
  turbopack: {},
  // TODO : repasser à false et régénérer `types/database.ts` via
  //   pnpm dlx supabase gen types typescript --project-id <ref> > types/database.ts
  // Le client Supabase est volontairement non-typé (generic `<Database>` absent)
  // tant que la base n'est pas provisionnée — on évite les erreurs TS `never`
  // qui apparaissent autour de `.maybeSingle()` / `.select('*')`.
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
