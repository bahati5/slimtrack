"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  ACTIVITY_LEVELS,
  computeTdee,
  type Sex,
} from "@/lib/calculations/tdee";
import {
  Star,
  User as UserIcon,
  Ruler,
  Target,
  Gauge,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Initial {
  full_name: string | null;
  age: number | null;
  sex: Sex | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  goal_weight_kg: number | null;
  activity_level: number | null;
  deficit_kcal: number | null;
}

const STEPS = [
  { key: "welcome", label: "Bienvenue", icon: Star },
  { key: "identity", label: "Toi", icon: UserIcon },
  { key: "body", label: "Corps", icon: Ruler },
  { key: "goal", label: "Objectif", icon: Target },
  { key: "activity", label: "Activité", icon: Gauge },
  { key: "done", label: "C'est parti", icon: Check },
] as const;

export function OnboardingFlow({ initial }: { initial: Initial }) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

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

  const tdeeResult = useMemo(() => {
    if (!age || !height || !weight) return null;
    return computeTdee({
      sex,
      age: Number(age),
      heightCm: Number(height),
      weightKg: Number(weight),
      activityLevel: activity,
      deficitKcal: deficit,
    });
  }, [age, sex, height, weight, activity, deficit]);
  const tdee = tdeeResult?.tdee ?? null;
  const target = tdeeResult ? Math.max(1200, tdeeResult.target) : null;

  function next() {
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }
  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function finish() {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
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
        tdee: tdee ?? null,
        target_kcal: target ?? null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profil enregistré !");
    router.push("/today");
    router.refresh();
  }

  const canNext = (() => {
    switch (STEPS[step].key) {
      case "identity":
        return !!fullName && !!age && !!sex;
      case "body":
        return !!height && !!weight;
      case "goal":
        return true;
      case "activity":
        return true;
      default:
        return true;
    }
  })();

  return (
    <div className="flex min-h-[calc(100dvh-env(safe-area-inset-top))] flex-col px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5">
      {/* Progress */}
      <ProgressBar step={step} total={STEPS.length} />

      {/* Content */}
      <div className="flex-1 pt-6">
        <div key={step} className="animate-fade-in-up space-y-4">
          {STEPS[step].key === "welcome" && (
            <Card className="space-y-4 text-center">
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-primary">
                <Star className="size-10 on-warm" />
              </div>
              <CardTitle>Bienvenue sur SlimTrack</CardTitle>
              <CardDescription>
                On va calibrer ton objectif quotidien en 1 minute. Tes données
                restent privées, tu pourras tout modifier plus tard.
              </CardDescription>
            </Card>
          )}

          {STEPS[step].key === "identity" && (
            <Card className="space-y-4">
              <CardTitle>Comment tu t&apos;appelles ?</CardTitle>
              <div className="space-y-1.5">
                <Label>Prénom / Surnom</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex. Laura"
                  autoFocus
                />
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
                    placeholder="Ex. 28"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Sexe (biologique)</Label>
                  <Select
                    value={sex}
                    onChange={(e) => setSex(e.target.value as Sex)}
                  >
                    <option value="F">Femme</option>
                    <option value="M">Homme</option>
                  </Select>
                </div>
              </div>
            </Card>
          )}

          {STEPS[step].key === "body" && (
            <Card className="space-y-4">
              <CardTitle>Tes mensurations</CardTitle>
              <CardDescription>
                On utilise la formule Mifflin-St Jeor pour estimer ta dépense.
              </CardDescription>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Taille (cm)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={height}
                    onChange={(e) =>
                      setHeight(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder="Ex. 165"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Poids actuel (kg)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={weight}
                    onChange={(e) =>
                      setWeight(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder="Ex. 72.5"
                  />
                </div>
              </div>
            </Card>
          )}

          {STEPS[step].key === "goal" && (
            <Card className="space-y-4">
              <CardTitle>Ton objectif</CardTitle>
              <div className="space-y-1.5">
                <Label>Poids cible (kg, optionnel)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={goal}
                  onChange={(e) =>
                    setGoal(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  placeholder="Ex. 65"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Déficit journalier</Label>
                  <span className="text-sm font-semibold text-[var(--color-primary-soft)]">
                    {deficit} kcal
                  </span>
                </div>
                <Slider
                  min={100}
                  max={1000}
                  step={50}
                  value={deficit}
                  onChange={setDeficit}
                />
                <p className="text-xs text-[var(--color-muted)]">
                  ≈ {Math.round((deficit * 7) / 7700 * 10) / 10} kg / semaine
                </p>
              </div>
            </Card>
          )}

          {STEPS[step].key === "activity" && (
            <Card className="space-y-3">
              <CardTitle>Ton niveau d&apos;activité</CardTitle>
              <CardDescription>
                Une approximation suffit — tu peux l&apos;ajuster plus tard.
              </CardDescription>
              <div className="space-y-2">
                {ACTIVITY_LEVELS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setActivity(a.value)}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                      activity === a.value
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                        : "border-[var(--color-border)] hover:border-[var(--color-primary-soft)]"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{a.label}</div>
                      <div className="text-xs text-[var(--color-muted)]">
                        {a.hint}
                      </div>
                    </div>
                    <span className="rounded-full bg-[var(--color-card-soft)] px-2 py-0.5 text-xs font-mono">
                      ×{a.value}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {STEPS[step].key === "done" && (
            <Card className="space-y-4 text-center">
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-primary">
                <Check className="size-10 on-warm" />
              </div>
              <CardTitle>
                {fullName ? `Bravo ${fullName} !` : "Bravo !"}
              </CardTitle>
              {tdee && target ? (
                <div className="space-y-3 text-left">
                  <div className="rounded-2xl bg-[var(--color-card-soft)] p-4">
                    <div className="text-xs text-[var(--color-muted)]">
                      Dépense estimée (TDEE)
                    </div>
                    <div className="text-2xl font-bold">
                      {tdee} <span className="text-sm">kcal/j</span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-gradient-primary p-4 on-warm">
                    <div className="text-xs opacity-80">
                      Objectif journalier
                    </div>
                    <div className="text-3xl font-bold">
                      {target} <span className="text-sm">kcal</span>
                    </div>
                    <div className="text-xs opacity-80">
                      Soit un déficit de {deficit} kcal/j.
                    </div>
                  </div>
                </div>
              ) : (
                <CardDescription>
                  Ton objectif sera calculé dès que tu auras rempli ton poids
                  et ta taille.
                </CardDescription>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Nav buttons */}
      <div className="sticky bottom-0 mt-4 grid grid-cols-2 gap-3 bg-[var(--color-bg)] pt-3">
        <Button
          variant="secondary"
          onClick={prev}
          disabled={step === 0}
        >
          <ChevronLeft className="size-4" />
          Retour
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next} disabled={!canNext}>
            Suivant
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={finish} loading={saving}>
            Commencer
          </Button>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round(((step + 1) / total) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
        <span>
          Étape {step + 1} / {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-card-soft)]">
        <div
          className="h-full rounded-full bg-gradient-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
