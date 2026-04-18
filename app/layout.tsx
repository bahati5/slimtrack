import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Providers } from "@/components/shared/providers";
import { PwaPrompt } from "@/components/shared/pwa-prompt";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  // Réduit les allers-retours d’injection de styles dans le <head> (erreurs removeChild possibles avec React 19).
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "SlimTrack — Suivi de perte de poids",
    template: "%s · SlimTrack",
  },
  description:
    "SlimTrack — PWA mobile-first pour suivre tes repas, activités et ton déficit calorique avec un accompagnement personnalisé.",
  applicationName: "SlimTrack",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SlimTrack",
  },
  formatDetection: { telephone: false },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#efcedb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} h-full antialiased`}>
      <body
        suppressHydrationWarning
        className="min-h-dvh flex flex-col bg-[#efcedb] text-[#2a1510]">
        <Providers>
          {children}
          <PwaPrompt />
        </Providers>
      </body>
    </html>
  );
}
