/**
 * Malus de sécurité appliqué aux kcal brûlées (pas & sport).
 * Les montres/algos surestiment systématiquement la dépense réelle :
 * on applique un coefficient 0.8 pour garantir la perte de poids.
 */
export const KCAL_BURN_SAFETY_FACTOR = 0.8;

/**
 * Estimation kcal depuis les pas (PRD §7.2) — avec malus de sécurité.
 *   kcal ≈ (pas × 0.04 × (poids_kg / 70)) × 0.8
 */
export function stepsToKcal(steps: number, weightKg = 70): number {
  if (!steps || steps <= 0) return 0;
  return Math.round(steps * 0.04 * (weightKg / 70) * KCAL_BURN_SAFETY_FACTOR);
}

/** Estimation kcal simple pour activité libre (MET approx). */
export function activityKcalEstimate(
  activityType:
    | "youtube"
    | "gym"
    | "walk"
    | "run"
    | "cycling"
    | "swim"
    | "other",
  durationMin: number,
  weightKg = 70,
): number {
  // MET approximatifs
  const METS: Record<string, number> = {
    youtube: 4,
    gym: 6,
    walk: 3.5,
    run: 9.8,
    cycling: 7.5,
    swim: 8,
    other: 4,
  };
  const met = METS[activityType] ?? 4;
  // kcal = (MET × poids(kg) × durée(h)) × malus de sécurité 0.8
  return Math.round(met * weightKg * (durationMin / 60) * KCAL_BURN_SAFETY_FACTOR);
}
