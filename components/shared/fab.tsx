"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Utensils, Activity, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * FAB : navigation via `<Link>` (pas de `router.push` programmatique) pour éviter
 * l’erreur Next.js 16 « Router action dispatched before initialization » avec Turbopack.
 * `prefetch={false}` limite les navigations déclenchées avant init du router.
 */
export function Fab({ dateQuery = "" }: { dateQuery?: string }) {
  const [open, setOpen] = useState(false);
  const mealHref = `/log-meal${dateQuery}`;
  const activityHref = `/log-activity${dateQuery}`;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="pointer-events-none fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-50 flex justify-end px-4">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        <Link
          href={mealHref}
          prefetch={false}
          onClick={() => setOpen(false)}
          className={cn(
            "flex min-h-12 min-w-[min(100%,10rem)] touch-manipulation items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold on-warm shadow-lg shadow-black/30 transition-all duration-200 active:scale-[0.98]",
            open
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-4 opacity-0",
          )}
        >
          <Utensils className="size-4 shrink-0" aria-hidden />
          Repas
        </Link>
        <Link
          href={activityHref}
          prefetch={false}
          onClick={() => setOpen(false)}
          className={cn(
            "flex min-h-12 min-w-[min(100%,10rem)] touch-manipulation items-center justify-center gap-2 rounded-full bg-[var(--color-success)] px-5 py-3 text-sm font-semibold on-warm shadow-lg shadow-black/30 transition-all duration-200 delay-75 active:scale-[0.98]",
            open
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-4 opacity-0",
          )}
        >
          <Activity className="size-4 shrink-0" aria-hidden />
          Activité
        </Link>

        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Fermer le menu" : "Ajouter un repas ou une activité"}
          onClick={() => setOpen((v) => !v)}
          className="relative flex size-14 touch-manipulation items-center justify-center rounded-full bg-gradient-primary on-warm shadow-xl shadow-black/50 ring-2 ring-white/40 transition-transform active:scale-90"
        >
          <span className="relative size-7">
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
                open ? "opacity-0" : "opacity-100",
              )}
              aria-hidden
            >
              <Plus className="size-7" strokeWidth={2.75} />
            </span>
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
                open ? "opacity-100" : "opacity-0",
              )}
              aria-hidden
            >
              <X className="size-6" strokeWidth={2.5} />
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
