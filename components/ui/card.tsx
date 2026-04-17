import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

export function Card({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm shadow-black/20",
        className,
      )}
      {...p}
    />
  );
}

export function CardHeader({
  className,
  ...p
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-3 flex flex-col gap-1", className)} {...p} />;
}

export function CardTitle({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "text-lg font-semibold text-[var(--color-text)]",
        className,
      )}
      {...p}
    />
  );
}

export function CardDescription({
  className,
  ...p
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("text-sm text-[var(--color-muted)]", className)}
      {...p}
    />
  );
}
