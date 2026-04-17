"use client";
import { cn } from "@/lib/utils/cn";

interface KcalRingProps {
  eaten: number;
  target: number;
  burned?: number;
  size?: number;
  stroke?: number;
  className?: string;
}

/**
 * Anneau SVG animé — % de l'objectif atteint.
 * Vert si on est en-dessous de la cible, corail si dépassé.
 */
export function KcalRing({
  eaten,
  target,
  burned = 0,
  size = 220,
  stroke = 18,
  className,
}: KcalRingProps) {
  const net = Math.max(0, eaten - burned);
  const pct = target > 0 ? Math.min(100, (net / target) * 100) : 0;
  const radius = (size - stroke) / 2;
  const c = 2 * Math.PI * radius;
  const offset = c - (pct / 100) * c;
  const over = net > target;
  const remaining = Math.max(0, Math.round(target - net));

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="kcal-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4f2b1f" />
            <stop offset="100%" stopColor="#7a4535" />
          </linearGradient>
          <linearGradient id="kcal-over" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-border)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={over ? "url(#kcal-over)" : "url(#kcal-grad)"}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
          {over ? "Dépassé de" : "Restantes"}
        </span>
        <span className="mt-1 text-4xl font-bold text-[var(--color-text)]">
          {over
            ? Math.round(net - target).toLocaleString("fr-FR")
            : remaining.toLocaleString("fr-FR")}
        </span>
        <span className="text-xs text-[var(--color-muted)]">kcal</span>
      </div>
    </div>
  );
}
