import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { LogMealForm } from "./log-meal-form";

export const dynamic = "force-dynamic";

export default async function LogMealPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; edit?: string }>;
}) {
  const sp = await searchParams;
  const isEdit = Boolean(sp?.edit);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return (
    <div className="space-y-4 p-5">
      <header>
        <h1 className="text-2xl font-bold">
          {isEdit ? "Modifier le repas" : "Nouveau repas"}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          {isEdit
            ? "Corrige les aliments et quantités puis enregistre."
            : "Détaille chaque aliment pour un calcul précis."}
        </p>
      </header>
      <Suspense>
        <LogMealForm userId={user.id} />
      </Suspense>
    </div>
  );
}
