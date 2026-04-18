"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import {
  FoodSearchInput,
  type FoodRow,
} from "@/components/shared/food-search-input";
import { MediaUploader } from "@/components/shared/media-uploader";
import { formatKcal, todayHrefAfterLog, todayIso } from "@/lib/utils/format";

const MEAL_TYPES = [
  { value: "breakfast", label: "Petit-déj" },
  { value: "lunch", label: "Déjeuner" },
  { value: "dinner", label: "Dîner" },
  { value: "snack", label: "Snack" },
] as const;

type MealTypeValue = (typeof MEAL_TYPES)[number]["value"];

interface Item extends FoodRow {
  tempId: string;
  quantity_g: number;
}

export function LogMealForm({ userId: _userId }: { userId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [mealType, setMealType] = useState<MealTypeValue>("lunch");
  const [name, setName] = useState("Déjeuner");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [media, setMedia] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const searchParams = useSearchParams();
  const editFromUrl = searchParams.get("edit");
  const dateFromUrl = searchParams.get("date");
  const [logDate, setLogDate] = useState(() => dateFromUrl ?? todayIso());
  /** Repas existant à mettre à jour (query `edit=`). */
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editFromUrl));

  useEffect(() => {
    if (!editFromUrl) {
      setLoadingEdit(false);
      setEditingMealId(null);
      setLogDate(dateFromUrl ?? todayIso());
      return;
    }

    let cancelled = false;
    setLoadingEdit(true);
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoadingEdit(false);
        return;
      }

      const { data: meal, error } = await supabase
        .from("meals")
        .select(
          "id, name, meal_type, notes, media_urls, eaten_at, daily_logs ( log_date )",
        )
        .eq("id", editFromUrl)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !meal) {
        toast.error("Repas introuvable ou accès refusé");
        router.replace("/today");
        setLoadingEdit(false);
        return;
      }

      const rawDl = meal.daily_logs as
        | { log_date?: string }
        | { log_date?: string }[]
        | null;
      const dlRow = Array.isArray(rawDl) ? rawDl[0] : rawDl;
      const rowDate =
        dlRow?.log_date?.slice(0, 10) ??
        dateFromUrl ??
        todayIso();
      setLogDate(rowDate);

      setName(String(meal.name));
      setMealType(meal.meal_type as MealTypeValue);
      setNotes(meal.notes ?? "");
      setMedia(Array.isArray(meal.media_urls) ? meal.media_urls : []);
      setEditingMealId(meal.id);

      const { data: mealItems } = await supabase
        .from("meal_items")
        .select(
          "food_name, quantity_g, kcal_per_100g, protein_g, carbs_g, fat_g, fiber_g",
        )
        .eq("meal_id", meal.id)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      setItems(
        ((mealItems ?? []) as Record<string, unknown>[]).map((row) => ({
          tempId: Math.random().toString(36).slice(2),
          name_fr: String(row.food_name),
          quantity_g: Number(row.quantity_g),
          kcal_per_100g: Number(row.kcal_per_100g),
          protein_per_100g: Number(row.protein_g),
          carbs_per_100g: Number(row.carbs_g),
          fat_per_100g: Number(row.fat_g),
          fiber_per_100g: Number(row.fiber_g ?? 0),
        })),
      );
      setLoadingEdit(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [editFromUrl, dateFromUrl, router, toast]);

  function addFood(f: FoodRow) {
    setItems((prev) => [
      ...prev,
      {
        ...f,
        tempId: Math.random().toString(36).slice(2),
        quantity_g: 100,
      },
    ]);
  }
  function updateItem(id: string, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((it) => (it.tempId === id ? { ...it, ...patch } : it)),
    );
  }
  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.tempId !== id));
  }
  function addEmptyItem() {
    addFood({
      name_fr: "",
      kcal_per_100g: 0,
      protein_per_100g: 0,
      carbs_per_100g: 0,
      fat_per_100g: 0,
      fiber_per_100g: 0,
    });
  }

  const totals = useMemo(() => {
    return items.reduce(
      (acc, it) => {
        const r = it.quantity_g / 100;
        acc.kcal += it.kcal_per_100g * r;
        acc.p += it.protein_per_100g * r;
        acc.c += it.carbs_per_100g * r;
        acc.f += it.fat_per_100g * r;
        return acc;
      },
      { kcal: 0, p: 0, c: 0, f: 0 },
    );
  }, [items]);

  async function submit() {
    if (!items.length) {
      toast.warning("Ajoute au moins un aliment");
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

    if (editingMealId) {
      const { error: upErr } = await supabase
        .from("meals")
        .update({
          name: name || MEAL_TYPES.find((m) => m.value === mealType)!.label,
          meal_type: mealType,
          media_urls: media,
          notes: notes || null,
        })
        .eq("id", editingMealId)
        .eq("user_id", user.id);
      if (upErr) {
        toast.error(upErr.message);
        setSaving(false);
        return;
      }
      const { error: delErr } = await supabase
        .from("meal_items")
        .delete()
        .eq("meal_id", editingMealId);
      if (delErr) {
        toast.error(delErr.message);
        setSaving(false);
        return;
      }
      const itemsPayload = items.map((it) => ({
        meal_id: editingMealId,
        user_id: user.id,
        food_name: it.name_fr,
        quantity_g: it.quantity_g,
        kcal_per_100g: it.kcal_per_100g,
        protein_g: it.protein_per_100g,
        carbs_g: it.carbs_per_100g,
        fat_g: it.fat_per_100g,
        fiber_g: it.fiber_per_100g,
      }));
      const { error: insErr } = await supabase
        .from("meal_items")
        .insert(itemsPayload);
      setSaving(false);
      if (insErr) {
        toast.error(insErr.message);
        return;
      }
      toast.success("Repas mis à jour 🍽");
      router.push(todayHrefAfterLog(logDate));
      router.refresh();
      return;
    }

    const { data: dl } = await supabase.rpc("get_or_create_daily_log", {
      p_date: logDate,
    });
    if (!dl) {
      toast.error("Impossible de créer le journal du jour");
      setSaving(false);
      return;
    }

    const { data: meal, error } = await supabase
      .from("meals")
      .insert({
        user_id: user.id,
        daily_log_id: dl.id,
        name: name || MEAL_TYPES.find((m) => m.value === mealType)!.label,
        meal_type: mealType,
        media_urls: media,
        notes: notes || null,
        eaten_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !meal) {
      toast.error(error?.message ?? "Erreur");
      setSaving(false);
      return;
    }

    const itemsPayload = items.map((it) => ({
      meal_id: meal.id,
      user_id: user.id,
      food_name: it.name_fr,
      quantity_g: it.quantity_g,
      kcal_per_100g: it.kcal_per_100g,
      protein_g: it.protein_per_100g,
      carbs_g: it.carbs_per_100g,
      fat_g: it.fat_per_100g,
      fiber_g: it.fiber_per_100g,
    }));
    const { error: err2 } = await supabase
      .from("meal_items")
      .insert(itemsPayload);
    setSaving(false);
    if (err2) {
      toast.error(err2.message);
      return;
    }
    toast.success("Repas enregistré 🍽");
    router.push(todayHrefAfterLog(logDate));
    router.refresh();
  }

  async function deleteMeal() {
    if (!editingMealId) return;
    if (
      !confirm(
        "Supprimer définitivement ce repas et ses ingrédients ? Cette action est irréversible.",
      )
    ) {
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
    const { error } = await supabase
      .from("meals")
      .delete()
      .eq("id", editingMealId)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Repas supprimé");
    router.push(todayHrefAfterLog(logDate));
    router.refresh();
  }

  if (loadingEdit) {
    return (
      <div className="py-12 text-center text-sm text-[var(--color-muted)]">
        Chargement du repas…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Type de repas */}
      <Card className="space-y-3">
        <CardTitle>Type de repas</CardTitle>
        <div className="grid grid-cols-4 gap-2">
          {MEAL_TYPES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => {
                setMealType(m.value);
                setName(m.label);
              }}
              className={`rounded-2xl px-3 py-3 text-xs font-medium ${
                mealType === m.value
                  ? "bg-gradient-primary text-white"
                  : "bg-[var(--color-card-soft)] text-[var(--color-muted)]"
              }`}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label>Nom</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </Card>

      {/* Photos */}
      <Card className="space-y-3">
        <CardTitle>Photos / vidéo (optionnel)</CardTitle>
        <MediaUploader
          value={media}
          onChange={setMedia}
          kind="meal"
          date={logDate}
          max={3}
        />
      </Card>

      {/* Aliments */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle>
            Aliments{items.length > 0 && ` (${items.length})`}
          </CardTitle>
          <Link
            href="/foods"
            className="text-xs font-medium text-[var(--color-primary-soft)] hover:underline">
            Gérer la base →
          </Link>
        </div>
        <p className="text-xs text-[var(--color-muted)]">
          Ajoute autant d&apos;aliments que tu veux — les kcal se calculent
          automatiquement.
        </p>
        <FoodSearchInput onSelect={addFood} />

        {/* Bouton + toujours visible pour ajouter une ligne vide */}
        <button
          type="button"
          onClick={addEmptyItem}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-primary-soft)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-card-soft)]">
          <Plus className="size-5" />
          Ajouter un aliment
        </button>

        {items.length > 0 && (
          <ul className="space-y-2">
            {items.map((it) => {
              const r = it.quantity_g / 100;
              const kcal = Math.round(it.kcal_per_100g * r);
              return (
                <li
                  key={it.tempId}
                  className="space-y-2 rounded-2xl bg-[var(--color-card-soft)] p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={it.name_fr}
                      placeholder="Nom de l'aliment"
                      onChange={(e) =>
                        updateItem(it.tempId, { name_fr: e.target.value })
                      }
                      className="h-10 flex-1 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(it.tempId)}
                      aria-label="Supprimer"
                      className="rounded-full p-2 text-[var(--color-muted)] hover:bg-[var(--color-card)] hover:text-[var(--color-accent)]">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={it.quantity_g}
                      onChange={(e) =>
                        updateItem(it.tempId, {
                          quantity_g: Number(e.target.value) || 0,
                        })
                      }
                      className="h-10"
                    />
                    <span className="text-xs text-[var(--color-muted)]">g</span>
                    <Badge tone="accent">{kcal} kcal</Badge>
                  </div>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={it.kcal_per_100g}
                    onChange={(e) =>
                      updateItem(it.tempId, {
                        kcal_per_100g: Number(e.target.value) || 0,
                      })
                    }
                    className="h-10 text-xs"
                    placeholder="kcal / 100g"
                  />
                </li>
              );
            })}
          </ul>
        )}

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </Card>

      {/* Totaux */}
      {items.length > 0 && (
        <Card className="bg-gradient-to-br from-[var(--color-accent)]/20 to-[var(--color-primary)]/20">
          <div className="flex items-center justify-between">
            <CardTitle>Total repas</CardTitle>
            <span className="text-2xl font-bold text-gradient-primary">
              {formatKcal(totals.kcal)}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
            <span>P {Math.round(totals.p)}g</span>
            <span>G {Math.round(totals.c)}g</span>
            <span>L {Math.round(totals.f)}g</span>
          </div>
        </Card>
      )}

      <Button block size="lg" loading={saving} onClick={submit}>
        {editingMealId ? "Enregistrer les modifications" : "Enregistrer le repas"}
      </Button>

      {editingMealId ? (
        <Button
          type="button"
          variant="outline"
          block
          disabled={saving}
          onClick={deleteMeal}>
          Supprimer ce repas
        </Button>
      ) : null}
    </div>
  );
}
