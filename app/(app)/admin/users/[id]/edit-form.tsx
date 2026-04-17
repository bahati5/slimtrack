"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Trash2 } from "lucide-react";

interface Profile {
  id: string;
  role: "user" | "coach" | "admin";
  full_name: string | null;
  age: number | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  goal_weight_kg: number | null;
  target_kcal: number | null;
  deficit_kcal: number | null;
  coach_id: string | null;
  can_edit_foods: boolean | null;
  invite_code: string | null;
}

export function AdminUserEditForm({
  user,
  coaches,
}: {
  user: Profile;
  coaches: { id: string; full_name: string | null; role: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<Profile>(user);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof Profile>(k: K, v: Profile[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        role: form.role,
        full_name: form.full_name,
        age: form.age,
        height_cm: form.height_cm,
        current_weight_kg: form.current_weight_kg,
        goal_weight_kg: form.goal_weight_kg,
        target_kcal: form.target_kcal,
        deficit_kcal: form.deficit_kcal,
        coach_id: form.coach_id,
        can_edit_foods: !!form.can_edit_foods,
      })
      .eq("id", form.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profil mis à jour");
    router.refresh();
  }

  async function remove() {
    if (
      !confirm(
        "Supprimer définitivement ce profil ? L'utilisatrice devra se ré-inscrire.",
      )
    )
      return;
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", form.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profil supprimé");
    router.push("/admin");
  }

  return (
    <Card className="space-y-3">
      <CardTitle>Profil</CardTitle>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom">
          <Input
            value={form.full_name ?? ""}
            onChange={(e) => update("full_name", e.target.value || null)}
          />
        </Field>
        <Field label="Rôle">
          <Select
            value={form.role}
            onChange={(e) =>
              update("role", e.target.value as Profile["role"])
            }
          >
            <option value="user">Utilisateur</option>
            <option value="coach">Coach</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>

        <Field label="Âge">
          <Input
            type="number"
            value={form.age ?? ""}
            onChange={(e) =>
              update("age", e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </Field>
        <Field label="Taille (cm)">
          <Input
            type="number"
            value={form.height_cm ?? ""}
            onChange={(e) =>
              update(
                "height_cm",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </Field>

        <Field label="Poids actuel (kg)">
          <Input
            type="number"
            step="0.1"
            value={form.current_weight_kg ?? ""}
            onChange={(e) =>
              update(
                "current_weight_kg",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </Field>
        <Field label="Poids objectif (kg)">
          <Input
            type="number"
            step="0.1"
            value={form.goal_weight_kg ?? ""}
            onChange={(e) =>
              update(
                "goal_weight_kg",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </Field>

        <Field label="Objectif kcal/j">
          <Input
            type="number"
            value={form.target_kcal ?? ""}
            onChange={(e) =>
              update(
                "target_kcal",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </Field>
        <Field label="Déficit kcal">
          <Input
            type="number"
            value={form.deficit_kcal ?? ""}
            onChange={(e) =>
              update(
                "deficit_kcal",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </Field>
      </div>

      <div className="space-y-1.5">
        <Label>Coach assigné</Label>
        <Select
          value={form.coach_id ?? ""}
          onChange={(e) => update("coach_id", e.target.value || null)}
        >
          <option value="">— Aucun —</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name ?? c.id.slice(0, 8)} ({c.role})
            </option>
          ))}
        </Select>
      </div>

      {form.invite_code && (
        <div className="space-y-1.5">
          <Label>Code d&apos;invitation</Label>
          <div className="rounded-2xl bg-[var(--color-card-soft)] px-4 py-3 text-center font-mono tracking-[0.3em] text-[var(--color-primary-soft)]">
            {form.invite_code}
          </div>
        </div>
      )}

      <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-[var(--color-card-soft)] px-4 py-3">
        <div>
          <div className="text-sm font-medium">
            Peut éditer la base d&apos;aliments
          </div>
          <div className="text-xs text-[var(--color-muted)]">
            Permet au coach de modifier / supprimer tout aliment, pas
            seulement les siens.
          </div>
        </div>
        <input
          type="checkbox"
          checked={!!form.can_edit_foods}
          onChange={(e) => update("can_edit_foods", e.target.checked)}
          className="size-5 accent-[var(--color-primary)]"
        />
      </label>

      <div className="grid grid-cols-2 gap-2 pt-2">
        <Button variant="danger" onClick={remove}>
          <Trash2 className="size-4" />
          Supprimer
        </Button>
        <Button onClick={save} loading={saving}>
          Enregistrer
        </Button>
      </div>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
