import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-[var(--color-bg)] p-6 safe-top safe-bottom">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 -left-32 size-80 rounded-full bg-[var(--color-primary)]/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 size-80 rounded-full bg-[var(--color-accent)]/30 blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </main>
  );
}
