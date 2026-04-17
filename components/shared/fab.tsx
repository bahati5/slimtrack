"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, Utensils, Activity, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** FAB avec menu radial : + Repas / + Activité */
export function Fab() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-24 right-5 z-40 flex flex-col items-end gap-3 safe-bottom">
      <Link
        href="/log-meal"
        onClick={() => setOpen(false)}
        className={cn(
          "flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold on-warm shadow-lg shadow-black/40 transition-all duration-200",
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <Utensils className="size-4" />
        Repas
      </Link>
      <Link
        href="/log-activity"
        onClick={() => setOpen(false)}
        className={cn(
          "flex items-center gap-2 rounded-full bg-[var(--color-success)] px-4 py-3 text-sm font-semibold on-warm shadow-lg shadow-black/40 transition-all duration-200 delay-75",
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <Activity className="size-4" />
        Activité
      </Link>
      <button
        aria-label={open ? "Fermer" : "Ajouter"}
        onClick={() => setOpen((v) => !v)}
        className="flex size-14 items-center justify-center rounded-full bg-gradient-primary on-warm shadow-xl shadow-black/50 transition-transform active:scale-90"
      >
        {open ? <X className="size-6" /> : <Plus className="size-6" />}
      </button>
    </div>
  );
}
