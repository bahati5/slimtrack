"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ListPageSkeleton } from "@/components/shared/app-page-skeleton";
import { useToast } from "@/components/ui/toast";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  UserCircle2,
  Globe2,
} from "lucide-react";

interface Food {
  id: string;
  name: string;
  name_fr: string;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  category: string | null;
  created_by: string | null;
}

const CATEGORIES = [
  "féculent",
  "protéine",
  "légume",
  "fruit",
  "produit laitier",
  "matière grasse",
  "boisson",
  "snack",
  "autre",
] as const;

type Tab = "all" | "mine";

export function FoodsView({
  userId,
  isAdmin = false,
}: {
  userId: string;
  /** Édition / suppression de toute la base (rôle admin côté serveur). */
  isAdmin?: boolean;
}) {
  const toast = useToast();
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");
  const [tab, setTab] = useState<Tab>("all");
  const [editing, setEditing] = useState<Food | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("food_database")
      .select(
        "id,name,name_fr,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,fiber_per_100g,category,created_by",
      )
      .order("name_fr", { ascending: true })
      .limit(isAdmin ? 5000 : 500);
    if (tab === "mine") query = query.eq("created_by", userId);
    const { data, error } = await query;
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setFoods((data ?? []) as Food[]);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return foods.filter((f) => {
      if (category && f.category !== category) return false;
      if (!needle) return true;
      return (
        f.name_fr.toLowerCase().includes(needle) ||
        f.name.toLowerCase().includes(needle)
      );
    });
  }, [foods, q, category]);

  function openNew() {
    setEditing({
      id: "",
      name: "",
      name_fr: "",
      kcal_per_100g: 0,
      protein_per_100g: 0,
      carbs_per_100g: 0,
      fat_per_100g: 0,
      fiber_per_100g: 0,
      category: "autre",
      created_by: isAdmin ? null : userId,
    });
    setSheetOpen(true);
  }

  function openEdit(f: Food) {
    setEditing({ ...f });
    setSheetOpen(true);
  }

  async function handleDelete(f: Food) {
    if (!confirm(`Supprimer « ${f.name_fr} » ?`)) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("food_database")
      .delete()
      .eq("id", f.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Aliment supprimé");
    setFoods((prev) => prev.filter((x) => x.id !== f.id));
  }

  async function handleSave(values: Food) {
    const supabase = createClient();
    const payload = {
      name: values.name || values.name_fr,
      name_fr: values.name_fr,
      kcal_per_100g: Number(values.kcal_per_100g) || 0,
      protein_per_100g: Number(values.protein_per_100g) || 0,
      carbs_per_100g: Number(values.carbs_per_100g) || 0,
      fat_per_100g: Number(values.fat_per_100g) || 0,
      fiber_per_100g: Number(values.fiber_per_100g) || 0,
      category: values.category || null,
    };
    if (!payload.name_fr.trim()) {
      toast.warning("Donne un nom à l'aliment");
      return;
    }
    if (values.id) {
      const { error } = await supabase
        .from("food_database")
        .update(payload)
        .eq("id", values.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Aliment mis à jour ✏️");
    } else {
      const { error } = await supabase.from("food_database").insert(
        isAdmin
          ? { ...payload, created_by: null, is_custom: false }
          : { ...payload, created_by: userId },
      );
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Aliment ajouté 🥗");
    }
    setSheetOpen(false);
    setEditing(null);
    refresh();
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          {(
            [
              { v: "all" as const, label: "Tous" },
              { v: "mine" as const, label: "Mes ajouts" },
            ]
          ).map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium ${
                tab === t.v
                  ? "bg-gradient-primary text-white"
                  : "bg-[var(--color-card-soft)] text-[var(--color-muted)]"
              }`}
            >
              {t.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-[var(--color-muted)]">
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
          <Input
            className="pl-11"
            placeholder="Chercher un aliment…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Card>

      {/* CTA + */}
      <Button block size="lg" onClick={openNew}>
        <Plus className="size-5" />
        Ajouter un aliment
      </Button>

      {/* Liste */}
      {loading ? (
        <ListPageSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardTitle>Aucun résultat</CardTitle>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Ajuste ta recherche ou crée un nouvel aliment.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((f) => (
            <li key={f.id}>
              <FoodRow
                food={f}
                mine={f.created_by === userId}
                isAdmin={isAdmin}
                onEdit={() => openEdit(f)}
                onDelete={() => handleDelete(f)}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Sheet d'édition */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
        title={editing?.id ? "Modifier l'aliment" : "Nouvel aliment"}
      >
        {editing && (
          <FoodEditor
            food={editing}
            onChange={setEditing}
            onSave={() => handleSave(editing)}
            onCancel={() => {
              setSheetOpen(false);
              setEditing(null);
            }}
            canEdit={
              isAdmin || !editing.id || editing.created_by === userId
            }
          />
        )}
      </BottomSheet>
    </div>
  );
}

function FoodRow({
  food,
  mine,
  isAdmin,
  onEdit,
  onDelete,
}: {
  food: Food;
  mine: boolean;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-card)] p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{food.name_fr}</span>
          {mine ? (
            <Badge tone="primary">
              <UserCircle2 className="size-3" /> Moi
            </Badge>
          ) : (
            <Badge tone="neutral">
              <Globe2 className="size-3" /> Base
            </Badge>
          )}
        </div>
        <div className="text-xs text-[var(--color-muted)]">
          {food.category ?? "—"} · P {Math.round(food.protein_per_100g)}g · G{" "}
          {Math.round(food.carbs_per_100g)}g · L{" "}
          {Math.round(food.fat_per_100g)}g
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-[var(--color-accent)]">
          {Math.round(food.kcal_per_100g)} kcal
        </div>
        <div className="text-[10px] text-[var(--color-muted)]">/100g</div>
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          aria-label="Modifier"
          onClick={onEdit}
          className="rounded-full p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-card-soft)] hover:text-[var(--color-primary-soft)]"
        >
          <Pencil className="size-4" />
        </button>
        {(mine || isAdmin) && (
          <button
            type="button"
            aria-label="Supprimer"
            onClick={onDelete}
            className="rounded-full p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-card-soft)] hover:text-[var(--color-accent)]"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function FoodEditor({
  food,
  onChange,
  onSave,
  onCancel,
  canEdit,
}: {
  food: Food;
  onChange: (f: Food) => void;
  onSave: () => void;
  onCancel: () => void;
  canEdit: boolean;
}) {
  function update<K extends keyof Food>(key: K, value: Food[K]) {
    onChange({ ...food, [key]: value });
  }

  return (
    <div className="space-y-3">
      {!canEdit && (
        <div className="rounded-2xl bg-[var(--color-info)]/10 p-3 text-xs text-[var(--color-info)]">
          Cet aliment appartient à la base publique — tu peux le consulter mais
          pas le modifier. Duplique-le si besoin.
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Nom (FR)</Label>
        <Input
          value={food.name_fr}
          onChange={(e) => update("name_fr", e.target.value)}
          disabled={!canEdit}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Catégorie</Label>
        <Select
          value={food.category ?? ""}
          onChange={(e) => update("category", e.target.value || null)}
          disabled={!canEdit}
        >
          <option value="">—</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumField
          label="kcal / 100g"
          value={food.kcal_per_100g}
          onChange={(v) => update("kcal_per_100g", v)}
          disabled={!canEdit}
        />
        <NumField
          label="Protéines (g)"
          value={food.protein_per_100g}
          onChange={(v) => update("protein_per_100g", v)}
          disabled={!canEdit}
        />
        <NumField
          label="Glucides (g)"
          value={food.carbs_per_100g}
          onChange={(v) => update("carbs_per_100g", v)}
          disabled={!canEdit}
        />
        <NumField
          label="Lipides (g)"
          value={food.fat_per_100g}
          onChange={(v) => update("fat_per_100g", v)}
          disabled={!canEdit}
        />
        <NumField
          label="Fibres (g)"
          value={food.fiber_per_100g}
          onChange={(v) => update("fiber_per_100g", v)}
          disabled={!canEdit}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          {canEdit ? "Annuler" : "Fermer"}
        </Button>
        {canEdit && (
          <Button onClick={onSave}>
            {food.id ? "Enregistrer" : "Créer"}
          </Button>
        )}
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step="0.1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        disabled={disabled}
      />
    </div>
  );
}
