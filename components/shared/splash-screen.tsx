"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

/**
 * Overlay affiché uniquement après l'hydratation client.
 * Le premier rendu client reste `null` pour correspondre au SSR.
 */
export function SplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const t1 = setTimeout(() => setFading(true), 800);
    const t2 = setTimeout(() => setVisible(false), 1100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [mounted]);

  if (!mounted || !visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#efcedb]"
      style={{
        transition: "opacity 300ms ease",
        opacity: fading ? 0 : 1,
      }}
    >
      <div className="flex size-24 items-center justify-center rounded-3xl bg-[#4f2b1f] shadow-xl">
        <Heart className="size-12 fill-[#efcedb] text-[#efcedb]" />
      </div>
      <p className="mt-6 text-xl font-bold tracking-tight text-[#2a1510]">
        SlimTrack
      </p>
      <p className="mt-1 text-sm text-[#8a6a62]">
        Ton suivi personnalisé
      </p>
    </div>
  );
}
