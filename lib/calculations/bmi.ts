export interface BmiResult {
  value: number;
  label: string;
  color: string; // token CSS variable name
}

export function computeBmi(weightKg: number, heightCm: number): BmiResult {
  const h = heightCm / 100;
  const v = h > 0 ? weightKg / (h * h) : 0;
  const value = Math.round(v * 10) / 10;
  if (value < 18.5)
    return { value, label: "Insuffisance pondérale", color: "var(--color-info)" };
  if (value < 25)
    return { value, label: "Corpulence normale", color: "var(--color-success)" };
  if (value < 30)
    return { value, label: "Surpoids", color: "var(--color-neutral)" };
  if (value < 35)
    return { value, label: "Obésité modérée", color: "var(--color-warning)" };
  return { value, label: "Obésité sévère", color: "var(--color-accent)" };
}
