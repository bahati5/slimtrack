import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CoachDayFeedback } from "./coach-day-feedback";
import { formatKcal } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function CoachClientPage({
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

  const { data: client } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) redirect("/coach");

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data: logs } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", clientId)
    .gte("log_date", since.toISOString().slice(0, 10))
    .order("log_date", { ascending: false });

  return (
    <div className="space-y-4 p-5">
      <header className="flex items-center gap-3">
        <div className="size-12 rounded-full bg-gradient-primary" />
        <div>
          <h1 className="text-xl font-bold">{client.full_name ?? "Cliente"}</h1>
          <p className="text-xs text-[var(--color-muted)]">
            Objectif {client.target_kcal ?? "—"} kcal/j · {client.current_weight_kg} kg → {client.goal_weight_kg ?? "—"} kg
          </p>
        </div>
      </header>

      {logs?.map((l) => (
        <DayCard key={l.id} log={l} coachId={user.id} clientId={clientId} />
      ))}

      {!logs?.length && (
        <Card>
          <CardTitle>Aucune donnée sur 7 jours</CardTitle>
          <CardDescription>
            Reviens plus tard ou demande à ta cliente de logger ses repas.
          </CardDescription>
        </Card>
      )}
    </div>
  );
}

async function DayCard({
  log,
  coachId,
  clientId,
}: {
  log: {
    id: string;
    log_date: string;
    total_kcal_eaten: number;
    total_kcal_burned: number;
    steps_kcal_burned: number;
    net_kcal: number;
    target_kcal: number | null;
    deficit_respected: boolean;
    coach_comment: string | null;
  };
  coachId: string;
  clientId: string;
}) {
  const supabase = await createClient();
  const { data: meals } = await supabase
    .from("meals")
    .select("id, name, meal_type, total_kcal, media_urls")
    .eq("daily_log_id", log.id)
    .order("eaten_at", { ascending: true });

  const mealIds = meals?.map((m) => m.id) ?? [];
  const commentCountByMeal: Record<string, number> = {};
  if (mealIds.length) {
    const { data: mcRows } = await supabase
      .from("meal_comments")
      .select("meal_id")
      .in("meal_id", mealIds);
    for (const r of (mcRows ?? []) as { meal_id: string }[]) {
      commentCountByMeal[r.meal_id] = (commentCountByMeal[r.meal_id] ?? 0) + 1;
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <CardTitle>
          {new Intl.DateTimeFormat("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          }).format(new Date(`${log.log_date}T12:00:00Z`))}
        </CardTitle>
        <Badge tone={log.deficit_respected ? "success" : "warning"}>
          {log.deficit_respected ? "Objectif ok" : "Dépassé"}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-[var(--color-card-soft)] p-2">
          <div className="text-[var(--color-accent)]">
            {formatKcal(log.total_kcal_eaten)}
          </div>
          <div className="text-[var(--color-muted)]">mangées</div>
        </div>
        <div className="rounded-xl bg-[var(--color-card-soft)] p-2">
          <div className="text-[var(--color-success)]">
            {formatKcal(log.total_kcal_burned + log.steps_kcal_burned)}
          </div>
          <div className="text-[var(--color-muted)]">brûlées</div>
        </div>
        <div className="rounded-xl bg-[var(--color-card-soft)] p-2">
          <div className="text-[var(--color-info)]">
            {formatKcal(log.target_kcal ?? 0)}
          </div>
          <div className="text-[var(--color-muted)]">objectif</div>
        </div>
      </div>
      {meals?.length ? (
        <ul className="space-y-1">
          {meals.map((m) => (
            <li key={m.id}>
              <Link
                href={`/meal/${m.id}`}
                className="flex items-center gap-2 rounded-xl bg-[var(--color-card-soft)] p-2 text-xs transition hover:bg-[var(--color-card)]"
              >
                {m.media_urls?.[0] ? (
                  <div className="relative size-8 overflow-hidden rounded-lg">
                    <Image
                      src={m.media_urls[0]}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                ) : (
                  <div className="size-8 rounded-lg bg-[var(--color-card)]" />
                )}
                <span className="flex-1 truncate">{m.name}</span>
                <span className="flex items-center gap-2">
                  {commentCountByMeal[m.id] ? (
                    <span
                      className="inline-flex items-center gap-0.5 text-[var(--color-primary)]"
                      title="Commentaires sur ce repas"
                    >
                      <MessageCircle className="size-3.5 shrink-0" />
                      <span className="text-[10px] font-semibold tabular-nums">
                        {commentCountByMeal[m.id]}
                      </span>
                    </span>
                  ) : null}
                  <span className="font-semibold text-[var(--color-accent)]">
                    {formatKcal(m.total_kcal)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <CoachDayFeedback
        dailyLogId={log.id}
        clientId={clientId}
        coachId={coachId}
        initialComment={log.coach_comment ?? ""}
      />
    </Card>
  );
}
