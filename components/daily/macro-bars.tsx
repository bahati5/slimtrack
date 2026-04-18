"use client";

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color: string;
}

/**
 * Barre de progression fine & épurée pour un macro-nutriment.
 * Remplissage en couleur spécifique (Accent protéines = #e5a4b8).
 */
function MacroBar({ label, current, target, unit = "g", color }: MacroBarProps) {
  const safeTarget = target > 0 ? target : 0;
  const pct = safeTarget > 0 ? Math.min(100, (current / safeTarget) * 100) : 0;
  const rounded = Math.round(current);
  const roundedTarget = Math.round(safeTarget);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-[var(--color-text)]">{label}</span>
        <span className="tabular-nums text-[var(--color-muted)]">
          {rounded}
          {unit} / {roundedTarget}
          {unit}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-card-soft)]"
        role="progressbar"
        aria-label={label}
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={roundedTarget}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

interface MacroBarsProps {
  proteinG: number;
  carbsG: number;
  fatG: number;
  weightKg: number | null;
  targetKcal: number | null;
}

/**
 * Focus macros : Protéines (priorité #1 en sèche), Glucides, Lipides.
 * Objectifs dérivés du poids corporel :
 *   - Protéines : poids × 1.6 g/kg  (sèche)
 *   - Lipides   : poids × 0.8 g/kg  (minimum hormonal)
 *   - Glucides  : reste de l'objectif kcal  (kcal - protéines×4 - lipides×9) / 4
 */
export function MacroBars({
  proteinG,
  carbsG,
  fatG,
  weightKg,
  targetKcal,
}: MacroBarsProps) {
  const w = weightKg ?? 0;
  const proteinTarget = w > 0 ? w * 1.6 : 0;
  const fatTarget = w > 0 ? w * 0.8 : 0;
  const kcalFromPF = proteinTarget * 4 + fatTarget * 9;
  const carbsTarget =
    targetKcal && targetKcal > 0
      ? Math.max(0, (targetKcal - kcalFromPF) / 4)
      : 0;

  return (
    <div className="space-y-3 rounded-2xl bg-[var(--color-card)] p-4">
      <MacroBar
        label="Protéines"
        current={proteinG}
        target={proteinTarget}
        color="#e5a4b8"
      />
      <MacroBar
        label="Glucides"
        current={carbsG}
        target={carbsTarget}
        color="#c4a27a"
      />
      <MacroBar
        label="Lipides"
        current={fatG}
        target={fatTarget}
        color="#8ab17d"
      />
    </div>
  );
}
