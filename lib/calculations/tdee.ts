/**
 * Mifflin-St Jeor — formules de référence SlimTrack (PRD §7.3).
 *   BMR ♀ = 10·poids + 6.25·taille − 5·âge − 161
 *   BMR ♂ = 10·poids + 6.25·taille − 5·âge + 5
 *   TDEE  = BMR × niveau d'activité
 *   target_kcal = TDEE − deficit
 */

export type Sex = "F" | "M";

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: "Sédentaire", hint: "peu ou pas d'exercice" },
  { value: 1.375, label: "Légèrement actif", hint: "1–3 j / semaine" },
  { value: 1.55, label: "Modérément actif", hint: "3–5 j / semaine" },
  { value: 1.725, label: "Très actif", hint: "6–7 j / semaine" },
] as const;

export interface TdeeInput {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: number; // multiplicateur
  deficitKcal: number; // 100 à 1000
}

export interface TdeeResult {
  bmr: number;
  tdee: number;
  target: number;
  weeklyLossKg: number; // estimation
}

export function computeBmr({
  age,
  sex,
  heightCm,
  weightKg,
}: Pick<TdeeInput, "age" | "sex" | "heightCm" | "weightKg">): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "F" ? base - 161 : base + 5;
}

export function computeTdee(input: TdeeInput): TdeeResult {
  const bmr = computeBmr(input);
  const tdee = bmr * input.activityLevel;
  const target = tdee - input.deficitKcal;
  // 1 kg de graisse ≈ 7700 kcal
  const weeklyLossKg = (input.deficitKcal * 7) / 7700;
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    target: Math.round(target),
    weeklyLossKg: Math.round(weeklyLossKg * 100) / 100,
  };
}
