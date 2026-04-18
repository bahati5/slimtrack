"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { todayIso } from "@/lib/utils/format";
import { Ruler } from "lucide-react";

type NumField = number | "";

export function MeasurementsForm({ timezone }: { timezone: string | null }) {
  const toast = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loadingRow, setLoadingRow] = useState(true);
  const [measuredDate, setMeasuredDate] = useState(() => todayIso(timezone));

  const [waist, setWaist] = useState<NumField>("");
  const [hips, setHips] = useState<NumField>("");
  const [chest, setChest] = useState<NumField>("");
  const [leftArm, setLeftArm] = useState<NumField>("");
  const [rightArm, setRightArm] = useState<NumField>("");
  const [leftThigh, setLeftThigh] = useState<NumField>("");
  const [rightThigh, setRightThigh] = useState<NumField>("");

  function num(v: NumField) {
    return v === "" ? null : Number(v);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingRow(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoadingRow(false);
        return;
      }
      const { data } = await supabase
        .from("measurements")
        .select(
          "waist_cm, hips_cm, chest_cm, left_arm_cm, right_arm_cm, left_thigh_cm, right_thigh_cm",
        )
        .eq("user_id", user.id)
        .eq("measured_at", measuredDate)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setWaist(data.waist_cm ?? "");
        setHips(data.hips_cm ?? "");
        setChest(data.chest_cm ?? "");
        setLeftArm(data.left_arm_cm ?? "");
        setRightArm(data.right_arm_cm ?? "");
        setLeftThigh(data.left_thigh_cm ?? "");
        setRightThigh(data.right_thigh_cm ?? "");
      } else {
        setWaist("");
        setHips("");
        setChest("");
        setLeftArm("");
        setRightArm("");
        setLeftThigh("");
        setRightThigh("");
      }
      setLoadingRow(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [measuredDate]);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("measurements").upsert(
      {
        user_id: user.id,
        measured_at: measuredDate,
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
    router.refresh();
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
            Choisis la date (passée ou aujourd&apos;hui), puis remplis les tours
            en cm.
          </CardDescription>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="measure-date">Date de la mesure</Label>
        <Input
          id="measure-date"
          type="date"
          value={measuredDate}
          max={todayIso(timezone)}
          onChange={(e) => setMeasuredDate(e.target.value)}
        />
      </div>

      {loadingRow ? (
        <p className="text-sm text-[var(--color-muted)]">Chargement…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <MField label="Tour de taille" value={waist} onChange={setWaist} />
          <MField label="Tour de hanches" value={hips} onChange={setHips} />
          <MField label="Tour de poitrine" value={chest} onChange={setChest} />
          <div />
          <MField label="Bras gauche" value={leftArm} onChange={setLeftArm} />
          <MField label="Bras droit" value={rightArm} onChange={setRightArm} />
          <MField
            label="Cuisse gauche"
            value={leftThigh}
            onChange={setLeftThigh}
          />
          <MField
            label="Cuisse droite"
            value={rightThigh}
            onChange={setRightThigh}
          />
        </div>
      )}

      <Button block size="lg" loading={saving} disabled={loadingRow} onClick={save}>
        Enregistrer pour cette date
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
