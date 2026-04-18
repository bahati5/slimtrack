import { createClient } from "@/lib/supabase/server";
import { StatsView } from "./stats-view";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  /** Doit couvrir la plus longue plage UI (6 mois ≈ 180 j) + marge. */
  const since = new Date();
  since.setDate(since.getDate() - 200);
  const sinceStr = since.toISOString().slice(0, 10);

  const [{ data: weights }, { data: logs }, { data: measures }] =
    await Promise.all([
      supabase
        .from("weight_logs")
        .select("weight_kg, logged_at")
        .eq("user_id", user.id)
        .gte("logged_at", sinceStr)
        .order("logged_at", { ascending: true }),
      supabase
        .from("daily_logs")
        .select(
          "log_date,total_kcal_eaten,total_kcal_burned,steps_kcal_burned,net_kcal,target_kcal,deficit_respected",
        )
        .eq("user_id", user.id)
        .gte("log_date", sinceStr)
        .order("log_date", { ascending: true }),
      supabase
        .from("measurements")
        .select("*")
        .eq("user_id", user.id)
        .order("measured_at", { ascending: false })
        .limit(2),
    ]);

  return (
    <div className="space-y-4 p-5">
      <header>
        <h1 className="text-2xl font-bold">Statistiques</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Jusqu&apos;à 6 mois d&apos;historique — ajuste la plage ci-dessous.
        </p>
      </header>
      <StatsView
        weights={weights ?? []}
        logs={logs ?? []}
        measures={measures ?? []}
        serverNow={new Date().toISOString()}
      />
    </div>
  );
}
