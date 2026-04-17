"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Ruler } from "lucide-react";

interface LastMeasurements {
  waist_cm: number | null;
  hips_cm: number | null;
  chest_cm: number | null;
  left_arm_cm: number | null;
  right_arm_cm: number | null;
  left_thigh_cm: number | null;
  right_thigh_cm: number | null;
}

type NumField = number | "";

export function MeasurementsForm({
  last,
}: {
  last: LastMeasurements | null;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [waist, setWaist] = useState<NumField>(last?.waist_cm ?? "");
  const [hips, setHips] = useState<NumField>(last?.hips_cm ?? "");
  const [chest, setChest] = useState<NumField>(last?.chest_cm ?? "");
  const [leftArm, setLeftArm] = useState<NumField>(last?.left_arm_cm ?? "");
  const [rightArm, setRightArm] = useState<NumField>(last?.right_arm_cm ?? "");
  const [leftThigh, setLeftThigh] = useState<NumField>(last?.left_thigh_cm ?? "");
  const [rightThigh, setRightThigh] = useState<NumField>(last?.right_thigh_cm ?? "");

  function num(v: NumField) {
    return v === "" ? null : Number(v);
  }
  function hasChanged() {
    return (
      num(waist) !== last?.waist_cm ||
      num(hips) !== last?.hips_cm ||
      num(chest) !== last?.chest_cm ||
      num(leftArm) !== last?.left_arm_cm ||
      num(rightArm) !== last?.right_arm_cm ||
      num(leftThigh) !== last?.left_thigh_cm ||
      num(rightThigh) !== last?.right_thigh_cm
    );
  }

  async function save() {
    if (!hasChanged()) {
      toast.info("Aucune modification à enregistrer.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("measurements").upsert(
      {
        user_id: user.id,
        measured_at: today,
        waist_cm: num(waist),
        hips_cm: num(hips),
        chest_cm: num(chest),
        left_arm_cm: num(leftArm),
        right_arm_cm: num(rightArm),
        left_thigh_cm: num(leftThigh),
        right_thigh_cm: num(rightThigh),
      },
      { onConflict: "user_id,measured_at" },
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Mensurations enregistrées ✅");
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-primary">
          <Ruler className="size-5 on-warm" />
        </div>
        <div>
          <CardTitle>Mensurations</CardTitle>
          <CardDescription>
            Sauvegardées avec la date du jour (cm).
          </CardDescription>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MField label="Tour de taille" value={waist} onChange={setWaist} />
        <MField label="Tour de hanches" value={hips} onChange={setHips} />
        <MField label="Tour de poitrine" value={chest} onChange={setChest} />
        <div /> {/* spacer */}
        <MField label="Bras gauche" value={leftArm} onChange={setLeftArm} />
        <MField label="Bras droit" value={rightArm} onChange={setRightArm} />
        <MField label="Cuisse gauche" value={leftThigh} onChange={setLeftThigh} />
        <MField label="Cuisse droite" value={rightThigh} onChange={setRightThigh} />
      </div>

      <Button block size="lg" loading={saving} onClick={save}>
        Enregistrer les mensurations
      </Button>
    </Card>
  );
}

function MField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: NumField;
  onChange: (v: NumField) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step="0.1"
        placeholder="—"
        value={value}
        onChange={(e) =>
          onChange(e.target.value === "" ? "" : Number(e.target.value))
        }
      />
    </div>
  );
}
