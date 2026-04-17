import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { LogActivityForm } from "./log-activity-form";

export const dynamic = "force-dynamic";

export default async function LogActivityPage() {
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
        <h1 className="text-2xl font-bold">Nouvelle activité</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Logge ta séance — kcal estimées ou saisie manuelle.
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
