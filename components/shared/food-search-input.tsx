"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface FoodRow {
  id?: string;
  name_fr: string;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  category?: string | null;
}

export function FoodSearchInput({
  onSelect,
}: {
  onSelect: (food: FoodRow) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FoodRow[]>([]);
  const [open, setOpen] = useState(false);
  const supabase = useRef(createClient());

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 2) {
        setResults([]);
        return;
      }
      const { data } = await supabase.current
        .from("food_database")
        .select(
          "id,name_fr,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,fiber_per_100g,category",
        )
        .ilike("name_fr", `%${q.trim()}%`)
        .limit(12);
      setResults((data ?? []) as FoodRow[]);
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
        <Input
          className="pl-11"
          placeholder="Rechercher un aliment (ex: riz, poulet…)"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
        />
      </div>
      {open && (results.length > 0 || q.trim().length >= 2) && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-xl">
          {results.map((f) => (
            <button
              key={f.id}
              type="button"
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--color-card-soft)]"
              onClick={() => {
                onSelect(f);
                setQ("");
                setOpen(false);
              }}
            >
              <span className="truncate">{f.name_fr}</span>
              <span className="text-xs text-[var(--color-muted)]">
                {Math.round(f.kcal_per_100g)} kcal/100g
              </span>
            </button>
          ))}
          {q.trim().length >= 2 && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[var(--color-primary-soft)] hover:bg-[var(--color-card-soft)]"
              onClick={() => {
                onSelect({
                  name_fr: q.trim(),
                  kcal_per_100g: 0,
                  protein_per_100g: 0,
                  carbs_per_100g: 0,
                  fat_per_100g: 0,
                  fiber_per_100g: 0,
                });
                setQ("");
                setOpen(false);
              }}
            >
              <Plus className="size-4" /> Ajouter « {q.trim()} » manuellement
            </button>
          )}
        </div>
      )}
    </div>
  );
}
