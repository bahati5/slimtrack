"use client";
import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";
import { ChevronDown } from "lucide-react";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "flex h-12 w-full appearance-none rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-soft)] px-4 pr-10 text-base text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/30",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
  </div>
));
Select.displayName = "Select";
