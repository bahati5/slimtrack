"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ACTIVITY_LEVELS, computeTdee, type Sex } from "@/lib/calculations/tdee";
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
        deficit_kcal: deficit,
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
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat label="TDEE" value={tdee ? `${tdee.tdee} kcal` : "—"} />
          <Stat
            label="Objectif"
            value={tdee ? `${tdee.target} kcal` : "—"}
            highlight
          />
          <Stat
            label="Perte estimée"
            value={tdee ? `${tdee.weeklyLossKg} kg/sem` : "—"}
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
        {tdee && (
          <p className="text-sm text-[var(--color-muted)]">
            Perte estimée :{" "}
            <span className="font-semibold text-[var(--color-text)]">
              {tdee.weeklyLossKg} kg/semaine
            </span>
          </p>
        )}
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
