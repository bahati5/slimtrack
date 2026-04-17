import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { LogMealForm } from "./log-meal-form";

export const dynamic = "force-dynamic";

export default async function LogMealPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return (
    <div className="space-y-4 p-5">
      <header>
        <h1 className="text-2xl font-bold">Nouveau repas</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Détaille chaque aliment pour un calcul précis.
        </p>
      </header>
      <Suspense>
        <LogMealForm userId={user.id} />
      </Suspense>
    </div>
  );
}
