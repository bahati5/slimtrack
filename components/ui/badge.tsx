import { cn } from "@/lib/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral:
          "bg-[var(--color-card-soft)] text-[var(--color-muted)] border border-[var(--color-border)]",
        primary: "bg-[var(--color-primary)]/15 text-[var(--color-primary-soft)]",
        success: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
        warning: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
        info: "bg-[var(--color-info)]/15 text-[var(--color-info)]",
        accent: "bg-[var(--color-accent)]/15 text-[var(--color-accent)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...p
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...p} />;
}
