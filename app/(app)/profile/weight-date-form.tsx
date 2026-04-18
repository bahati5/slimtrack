"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { todayIso } from "@/lib/utils/format";
import { Scale } from "lucide-react";

export function WeightDateForm({ timezone }: { timezone: string | null }) {
  const toast = useToast();
  const router = useRouter();
  const [logDate, setLogDate] = useState(() => todayIso(timezone));
  const [weightKg, setWeightKg] = useState<number | "">("");
  const [loadingRow, setLoadingRow] = useState(true);
  const [saving, setSaving] = useState(false);

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
        .from("weight_logs")
        .select("weight_kg")
        .eq("user_id", user.id)
        .eq("logged_at", logDate)
        .maybeSingle();
      if (cancelled) return;
      if (data?.weight_kg != null) setWeightKg(Number(data.weight_kg));
      else setWeightKg("");
      setLoadingRow(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [logDate]);

  async function save() {
    if (weightKg === "") {
      toast.warning("Indique un poids");
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
    const today = todayIso(timezone);
    const { error } = await supabase.from("weight_logs").upsert(
      {
        user_id: user.id,
        logged_at: logDate,
        weight_kg: Number(weightKg),
      },
      { onConflict: "user_id,logged_at" },
    );
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    if (logDate === today) {
      await supabase
        .from("profiles")
        .update({ current_weight_kg: Number(weightKg) })
        .eq("id", user.id);
    }
    setSaving(false);
    toast.success("Poids enregistré ⚖️");
    router.refresh();
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-primary">
          <Scale className="size-5 on-warm" />
        </div>
        <div>
          <CardTitle>Poids (historique)</CardTitle>
          <CardDescription>
            Enregistre une pesée pour une date précise. Si c&apos;est
            aujourd&apos;hui, ton poids « actuel » du profil est aussi mis à
            jour.
          </CardDescription>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="weight-date">Date</Label>
          <Input
            id="weight-date"
            type="date"
            value={logDate}
            max={todayIso(timezone)}
            onChange={(e) => setLogDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="weight-kg">Poids (kg)</Label>
          <Input
            id="weight-kg"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder={loadingRow ? "…" : "ex. 72,4"}
            value={weightKg}
            onChange={(e) =>
              setWeightKg(e.target.value === "" ? "" : Number(e.target.value))
            }
            disabled={loadingRow}
          />
        </div>
      </div>

      <Button block size="lg" loading={saving} disabled={loadingRow} onClick={save}>
        Enregistrer la pesée
      </Button>
    </Card>
  );
}
