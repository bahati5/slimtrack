import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SlimTrack — Suivi de perte de poids",
    short_name: "SlimTrack",
    description:
      "Suis ta perte de poids avec repas détaillés, activités sportives et un accompagnement personnalisé.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#efcedb",
    theme_color: "#4f2b1f",
    lang: "fr",
    dir: "ltr",
    icons: [
      { src: "/icons/icon-192", sizes: "192x192", type: "image/svg+xml" },
      { src: "/icons/icon-512", sizes: "512x512", type: "image/svg+xml" },
      {
        src: "/icons/icon-512",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
