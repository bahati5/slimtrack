"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ACTIVITY_LEVELS,
  computeTdee,
  deficitFromManualTarget,
  type Sex,
} from "@/lib/calculations/tdee";
import { computeBmi } from "@/lib/calculations/bmi";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

interface InitialProfile {
  full_name: string | null;
  age: number | null;
  sex: Sex | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  goal_weight_kg: number | null;
  activity_level: number | null;
  deficit_kcal: number | null;
  /** Objectif kcal/j issu du dernier calcul (trigger SQL). */
  target_kcal: number | null;
  avatar_url: string | null;
}

export function ProfileForm({ initial }: { initial: InitialProfile }) {
  const router = useRouter();
  const toast = useToast();

  const [fullName, setFullName] = useState(initial.full_name ?? "");
  const [age, setAge] = useState<number | "">(initial.age ?? "");
  const [sex, setSex] = useState<Sex>(initial.sex ?? "F");
  const [height, setHeight] = useState<number | "">(initial.height_cm ?? "");
  const [weight, setWeight] = useState<number | "">(
    initial.current_weight_kg ?? "",
  );
  const [goal, setGoal] = useState<number | "">(initial.goal_weight_kg ?? "");
  const [activity, setActivity] = useState<number>(
    initial.activity_level ?? 1.375,
  );
  const [deficit, setDeficit] = useState<number>(initial.deficit_kcal ?? 500);
  /** Saisie directe de l’objectif kcal/j (mode « objectif »). */
  const [manualTarget, setManualTarget] = useState<number>(
    initial.target_kcal ?? 1800,
  );
  const [goalMode, setGoalMode] = useState<"deficit" | "target">("deficit");
  const [saving, setSaving] = useState(false);

  const tdee = useMemo(() => {
    if (!age || !height || !weight) return null;
    return computeTdee({
      age: Number(age),
      sex,
      heightCm: Number(height),
      weightKg: Number(weight),
      activityLevel: activity,
      deficitKcal: deficit,
    });
  }, [age, sex, height, weight, activity, deficit]);

  const effectiveDeficit = useMemo(() => {
    if (!tdee) return deficit;
    if (goalMode === "deficit") return deficit;
    return deficitFromManualTarget(tdee.tdee, manualTarget);
  }, [goalMode, deficit, manualTarget, tdee]);

  const tdeePreview = useMemo(() => {
    if (!age || !height || !weight) return null;
    return computeTdee({
      age: Number(age),
      sex,
      heightCm: Number(height),
      weightKg: Number(weight),
      activityLevel: activity,
      deficitKcal: effectiveDeficit,
    });
  }, [age, sex, height, weight, activity, effectiveDeficit]);

  const bmi = useMemo(() => {
    if (!height || !weight) return null;
    return computeBmi(Number(weight), Number(height));
  }, [height, weight]);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || null,
        age: age === "" ? null : Number(age),
        sex,
        height_cm: height === "" ? null : Number(height),
        current_weight_kg: weight === "" ? null : Number(weight),
        goal_weight_kg: goal === "" ? null : Number(goal),
        activity_level: activity,
        deficit_kcal: effectiveDeficit,
      })
      .eq("id", user.user.id);

    // Log une pesée si elle est nouvelle / différente
    if (weight !== "" && weight !== initial.current_weight_kg) {
      await supabase
        .from("weight_logs")
        .upsert(
          {
            user_id: user.user.id,
            weight_kg: Number(weight),
            logged_at: new Date().toISOString().slice(0, 10),
          },
          { onConflict: "user_id,logged_at" },
        );
    }

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profil mis à jour ✅");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Carte résumé TDEE */}
      <Card className="bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 border-[var(--color-primary)]/30">
        <CardTitle>Objectif calorique</CardTitle>
        <CardDescription>Calculé en temps réel (Mifflin-St Jeor)</CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setGoalMode("deficit")}
            className={`rounded-full px-4 py-1.5 text-xs font-medium ${
              goalMode === "deficit"
                ? "bg-gradient-primary text-white"
                : "bg-[var(--color-card)] text-[var(--color-muted)]"
            }`}>
            Par déficit
          </button>
          <button
            type="button"
            onClick={() => {
              setGoalMode("target");
              if (tdee) setManualTarget(tdee.target);
            }}
            className={`rounded-full px-4 py-1.5 text-xs font-medium ${
              goalMode === "target"
                ? "bg-gradient-primary text-white"
                : "bg-[var(--color-card)] text-[var(--color-muted)]"
            }`}>
            Objectif kcal/j
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat label="TDEE" value={tdeePreview ? `${tdeePreview.tdee} kcal` : "—"} />
          <Stat
            label="Objectif"
            value={tdeePreview ? `${tdeePreview.target} kcal` : "—"}
            highlight
          />
          <Stat
            label="Perte estimée"
            value={tdeePreview ? `${tdeePreview.weeklyLossKg} kg/sem` : "—"}
          />
          <Stat
            label="IMC"
            value={
              bmi ? (
                <>
                  <span>{bmi.value}</span>{" "}
                  <Badge tone="neutral">{bmi.label}</Badge>
                </>
              ) : (
                "—"
              )
            }
          />
        </div>
        {goalMode === "target" && tdee ? (
          <div className="mt-4 space-y-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/80 p-3">
            <Label htmlFor="manual-target">
              Combien de kcal veux-tu manger par jour ?
            </Label>
            <Input
              id="manual-target"
              type="number"
              inputMode="numeric"
              min={Math.max(800, tdee.tdee - 1500)}
              max={tdee.tdee}
              value={manualTarget}
              onChange={(e) => setManualTarget(Number(e.target.value) || 0)}
            />
            <p className="text-xs text-[var(--color-muted)]">
              Entre {Math.max(800, tdee.tdee - 1500)} et {tdee.tdee} kcal (ton
              TDEE). Déficit calculé :{" "}
              <span className="font-semibold text-[var(--color-text)]">
                {effectiveDeficit} kcal/j
              </span>
            </p>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4">
        <CardTitle>Identité</CardTitle>
        <div className="space-y-1.5">
          <Label>Prénom</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Âge</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={age}
              onChange={(e) =>
                setAge(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sexe</Label>
            <Select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="F">Femme</option>
              <option value="M">Homme</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Taille (cm)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={height}
              onChange={(e) =>
                setHeight(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Poids (kg)</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) =>
                setWeight(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Objectif de poids (kg)</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={goal}
              onChange={(e) =>
                setGoal(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <CardTitle>Niveau d&apos;activité</CardTitle>
        <div className="space-y-2">
          {ACTIVITY_LEVELS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => setActivity(a.value)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                activity === a.value
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                  : "border-[var(--color-border)] bg-[var(--color-card-soft)]"
              }`}
            >
              <div>
                <div className="text-sm font-medium">{a.label}</div>
                <div className="text-xs text-[var(--color-muted)]">{a.hint}</div>
              </div>
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                ×{a.value}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <CardTitle>Déficit calorique</CardTitle>
        <CardDescription>
          Plus le déficit est grand, plus la perte est rapide — mais plus
          exigeante. 300–500 kcal/j est un bon repère.
        </CardDescription>
        {goalMode === "deficit" ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-muted)]">Déficit</span>
              <span className="text-lg font-semibold">{deficit} kcal/j</span>
            </div>
            <Slider
              value={deficit}
              onChange={setDeficit}
              min={100}
              max={1000}
              step={50}
            />
            <div className="flex justify-between text-xs text-[var(--color-muted)]">
              <span>100</span>
              <span>1000</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">
            Utilise le mode « Objectif kcal/j » ci-dessus pour fixer tes calories
            au quotidien : le déficit est calculé automatiquement (TDEE −
            objectif).
          </p>
        )}
        {tdeePreview && goalMode === "deficit" ? (
          <p className="text-sm text-[var(--color-muted)]">
            Perte estimée :{" "}
            <span className="font-semibold text-[var(--color-text)]">
              {tdeePreview.weeklyLossKg} kg/semaine
            </span>
          </p>
        ) : null}
      </Card>

      <Button block size="lg" loading={saving} onClick={save}>
        Enregistrer
      </Button>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-3 ${
        highlight
          ? "bg-gradient-primary text-white"
          : "bg-[var(--color-card-soft)]"
      }`}
    >
      <div
        className={`text-xs ${highlight ? "text-white/80" : "text-[var(--color-muted)]"}`}
      >
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
