import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { LogActivityForm } from "./log-activity-form";

export const dynamic = "force-dynamic";

export default async function LogActivityPage({
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_weight_kg")
    .eq("id", user.id)
    .maybeSingle();
  return (
    <div className="space-y-4 p-5">
      <header>
        <h1 className="text-2xl font-bold">
          {isEdit ? "Modifier l&apos;activité" : "Nouvelle activité"}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          {isEdit
            ? "Ajuste durée, pas ou kcal puis enregistre."
            : "Logge ta séance — kcal estimées ou saisie manuelle."}
        </p>
      </header>
      <Suspense>
        <LogActivityForm
          userId={user.id}
          weightKg={profile?.current_weight_kg ?? 70}
        />
      </Suspense>
    </div>
  );
}
