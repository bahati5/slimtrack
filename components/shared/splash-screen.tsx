"use client";

import {
  useEffect,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";

const MIN_VISIBLE_MS = 850;
const FADE_OUT_MS = 480;

export function SplashScreen({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"show" | "hide" | "gone">("show");

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minDelay = reduced ? 120 : MIN_VISIBLE_MS;

    const scheduleHide = () => {
      window.setTimeout(() => setPhase("hide"), minDelay);
    };

    if (document.readyState === "complete") scheduleHide();
    else window.addEventListener("load", scheduleHide, { once: true });
  }, []);

  useEffect(() => {
    if (phase !== "hide") return;
    const t = window.setTimeout(() => setPhase("gone"), FADE_OUT_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  return (
    <>
      {children}
      {phase !== "gone" ? (
        <div
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[var(--color-bg)] transition-opacity ease-out safe-top safe-bottom ${
            phase === "hide"
              ? "pointer-events-none opacity-0"
              : "opacity-100"
          }`}
          style={
            {
              transitionDuration: `${FADE_OUT_MS}ms`,
            } as CSSProperties
          }
          aria-busy={phase === "show"}
          aria-hidden={phase === "hide"}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 -left-32 size-80 rounded-full bg-[var(--color-primary)]/30 blur-3xl" />
            <div className="absolute -bottom-32 -right-32 size-80 rounded-full bg-[var(--color-accent)]/30 blur-3xl" />
          </div>

          <div className="relative flex flex-col items-center gap-6 px-6 text-center">
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)]/90 px-10 py-8 shadow-lg shadow-black/10 backdrop-blur-sm">
              <p className="text-3xl font-bold tracking-tight text-[var(--color-primary)] sm:text-4xl">
                SlimTrack
              </p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {"Suivi alimentaire & activité"}
              </p>
            </div>
            <div
              className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--color-border)]"
              aria-hidden
            >
              <div
                className={`h-full w-2/5 rounded-full bg-gradient-primary ${
                  phase === "show" ? "animate-pulse" : ""
                }`}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
