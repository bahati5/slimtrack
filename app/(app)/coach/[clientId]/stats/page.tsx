import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatsView } from "../../../stats/stats-view";

export const dynamic = "force-dynamic";

export default async function CoachClientStatsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (me as { role?: string } | null)?.role;
  const isCoach = role === "coach";
  const isAdmin = role === "admin";
  if (!isCoach && !isAdmin) redirect("/today");

  const { data: client } = await supabase
    .from("profiles")
    .select("id, full_name, coach_id")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) redirect("/coach");
  const c = client as {
    id: string;
    full_name: string | null;
    coach_id: string | null;
  };
  if (!isAdmin && c.coach_id !== user.id) redirect("/coach");

  // Même fenêtre que la page stats perso : 200 jours pour couvrir les 6 mois UI.
  const since = new Date();
  since.setDate(since.getDate() - 200);
  const sinceStr = since.toISOString().slice(0, 10);

  const [{ data: weights }, { data: logs }, { data: measures }] =
    await Promise.all([
      supabase
        .from("weight_logs")
        .select("weight_kg, logged_at")
        .eq("user_id", clientId)
        .gte("logged_at", sinceStr)
        .order("logged_at", { ascending: true }),
      supabase
        .from("daily_logs")
        .select(
          "log_date,total_kcal_eaten,total_kcal_burned,steps_kcal_burned,net_kcal,target_kcal,deficit_respected",
        )
        .eq("user_id", clientId)
        .gte("log_date", sinceStr)
        .order("log_date", { ascending: true }),
      supabase
        .from("measurements")
        .select("*")
        .eq("user_id", clientId)
        .order("measured_at", { ascending: false })
        .limit(2),
    ]);

  const title = c.full_name?.trim() || "Cliente";

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/coach/${clientId}`}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
        >
          <ChevronLeft className="size-4" /> {title}
        </Link>
      </div>
      <header>
        <h1 className="text-2xl font-bold">Statistiques · {title}</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Jusqu&apos;à 6 mois d&apos;historique — ajuste la plage ci-dessous.
        </p>
      </header>
      <StatsView
        weights={(weights ?? []) as { weight_kg: number; logged_at: string }[]}
        logs={
          (logs ?? []) as {
            log_date: string;
            total_kcal_eaten: number;
            total_kcal_burned: number;
            steps_kcal_burned: number;
            net_kcal: number;
            target_kcal: number | null;
            deficit_respected: boolean;
          }[]
        }
        measures={
          (measures ?? []) as Record<string, number | string | null>[]
        }
        serverNow={new Date().toISOString()}
      />
    </div>
  );
}
