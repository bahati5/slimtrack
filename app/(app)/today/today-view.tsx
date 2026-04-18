"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KcalRing } from "@/components/daily/kcal-ring";
import { MonthCalendar } from "@/components/daily/month-calendar";
import { Fab } from "@/components/shared/fab";
import { CoachDailyCommentForm } from "@/components/coach/coach-daily-comment-form";
import { firstName, formatKcal } from "@/lib/utils/format";
import {
  CheckCircle2,
  Flame,
  Utensils,
  Activity,
  AlertTriangle,
  Plus,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  target_kcal: number | null;
  current_weight_kg: number | null;
  timezone: string | null;
}

type Meal = {
  id: string;
  name: string;
  meal_type: string;
  total_kcal: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  media_urls: string[] | null;
  eaten_at: string;
};
type ActivityRow = {
  id: string;
  name: string;
  activity_type: string;
  duration_min: number | null;
  kcal_burned: number;
  steps: number | null;
  youtube_thumbnail: string | null;
  media_urls: string[] | null;
  done_at: string;
};
type DailyLog = {
  id: string;
  total_kcal_eaten: number;
  total_kcal_burned: number;
  steps_kcal_burned: number;
  net_kcal: number;
  target_kcal: number | null;
  deficit_respected: boolean;
  coach_comment?: string | null;
  coach_commented_at?: string | null;
};

export function TodayView({
  userId,
  profile,
  targetUserId,
  readonly = false,
  titleOverride,
  basePath = "/today",
  serverToday,
  coachDisplayName = null,
}: {
  userId: string;
  profile: Profile | null;
  /** Si fourni, on affiche les données de cet utilisateur (ex. coach voit cliente). Default = userId. */
  targetUserId?: string;
  /** Si true, pas de FAB, pas de liens d'ajout, pas de création de daily_log. */
  readonly?: boolean;
  /** Remplace "Salut {prénom}" en haut. */
  titleOverride?: string;
  /** Chemin de base pour la nav par date (par défaut /today). */
  basePath?: string;
  /** Date « aujourd’hui » (YYYY-MM-DD) calculée côté serveur — évite les écarts d’hydratation. */
  serverToday: string;
  /** Nom du coach (affiché sur le message du jour, etc.). */
  coachDisplayName?: string | null;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const today = serverToday;
  const date = searchParams.get("date") ?? today;
  const isToday = date === today;
  const viewUserId = targetUserId ?? userId;
  const [viewMode, setViewMode] = useState<"day" | "calendar">("day");
  const coachFirst = firstName(coachDisplayName ?? undefined);
  const fabDateQuery =
    date === today ? "" : `?date=${encodeURIComponent(date)}`;

  function goToDate(newDate: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (newDate === today) params.delete("date");
    else params.set("date", newDate);
    const qs = params.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath);
  }

  function shiftDay(delta: number) {
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + delta);
    goToDate(d.toISOString().slice(0, 10));
  }

  function selectDateFromCalendar(newDate: string) {
    goToDate(newDate);
    startTransition(() => setViewMode("day"));
  }

  const { data, isLoading } = useQuery({
    queryKey: ["today", viewUserId, date],
    queryFn: async () => {
      let daily: DailyLog | null = null;
      if (readonly) {
        // Coach consulte : pas de création, simple SELECT.
        const { data: dl } = await supabase
          .from("daily_logs")
          .select("*")
          .eq("user_id", viewUserId)
          .eq("log_date", date)
          .maybeSingle();
        daily = (dl ?? null) as DailyLog | null;
      } else {
        const { data: dl } = await supabase.rpc("get_or_create_daily_log", {
          p_date: date,
        });
        daily = (dl ?? null) as DailyLog | null;
      }
      const { data: meals } = await supabase
        .from("meals")
        .select(
          "id,name,meal_type,total_kcal,total_protein_g,total_carbs_g,total_fat_g,media_urls,eaten_at",
        )
        .eq("user_id", viewUserId)
        .eq("daily_log_id", daily?.id ?? "")
        .order("eaten_at", { ascending: true });
      const mealList = (meals ?? []) as Meal[];
      const mealIds = mealList.map((m) => m.id);
      const mealCommentCounts: Record<string, number> = {};
      if (mealIds.length) {
        const { data: mcc } = await supabase
          .from("meal_comments")
          .select("meal_id")
          .in("meal_id", mealIds);
        for (const row of (mcc ?? []) as { meal_id: string }[]) {
          mealCommentCounts[row.meal_id] =
            (mealCommentCounts[row.meal_id] ?? 0) + 1;
        }
      }
      const { data: activities } = await supabase
        .from("activities")
        .select(
          "id,name,activity_type,duration_min,kcal_burned,steps,youtube_thumbnail,media_urls,done_at",
        )
        .eq("user_id", viewUserId)
        .eq("daily_log_id", daily?.id ?? "")
        .order("done_at", { ascending: true });
      return {
        daily,
        meals: mealList,
        activities: (activities ?? []) as ActivityRow[],
        mealCommentCounts,
      };
    },
  });

  // Realtime : rafraîchit dès qu'un log bouge
  useEffect(() => {
    const channel = supabase
      .channel(`today-${viewUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_logs",
          filter: `user_id=eq.${viewUserId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["today", viewUserId, date] }),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meals",
          filter: `user_id=eq.${viewUserId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["today", viewUserId, date] }),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activities",
          filter: `user_id=eq.${viewUserId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["today", viewUserId, date] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meal_comments" },
        () => qc.invalidateQueries({ queryKey: ["today", viewUserId, date] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, viewUserId, date, qc]);

  if (!profile?.target_kcal) {
    return (
      <div className="space-y-4 p-5">
        <Card className="border-dashed border-[var(--color-primary)]/40">
          <CardTitle>Configure ton profil</CardTitle>
          <CardDescription>
            Pour démarrer, on a besoin de ton âge, sexe, poids et niveau
            d&apos;activité pour calculer ton objectif kcal.
          </CardDescription>
          <Link href="/profile">
            <Button className="mt-4" block>
              Compléter mon profil
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const daily = data?.daily;
  const target = daily?.target_kcal ?? profile.target_kcal ?? 0;
  const eaten = daily?.total_kcal_eaten ?? 0;
  const burned =
    (daily?.total_kcal_burned ?? 0) + (daily?.steps_kcal_burned ?? 0);
  const net = Math.max(0, eaten - burned);
  const respected = daily?.deficit_respected ?? true;

  return (
    <div
      className={
        readonly ? "space-y-4 p-5" : "space-y-4 p-5 pb-40 max-[380px]:pb-44"
      }
    >
      {/* Hero */}
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {titleOverride ??
              `Salut ${profile.full_name?.split(" ")[0] ?? "👋"}`}
          </h1>
          {readonly && isLoading ? (
            <Badge tone="neutral">Chargement…</Badge>
          ) : (
            <Badge tone={respected ? "success" : "warning"}>
              {respected ? (
                <>
                  <CheckCircle2 className="size-3" /> Déficit respecté
                </>
              ) : (
                <>
                  <AlertTriangle className="size-3" /> Déficit dépassé
                </>
              )}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-[var(--color-card)] p-2">
          <button
            type="button"
            onClick={() => shiftDay(-1)}
            className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-xl text-[var(--color-text)] transition hover:bg-[var(--color-card-soft)]"
            aria-label="Jour précédent">
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
              {formatRelativeDay(date, today)}
            </span>
            <span className="text-sm font-semibold">
              {new Intl.DateTimeFormat("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "UTC",
              }).format(new Date(date + "T00:00:00Z"))}
            </span>
          </div>
          <button
            type="button"
            onClick={() => shiftDay(1)}
            disabled={isToday}
            className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-xl text-[var(--color-text)] transition hover:bg-[var(--color-card-soft)] disabled:opacity-30"
            aria-label="Jour suivant">
            <ChevronRight className="size-5" />
          </button>
        </div>
        <div className="flex rounded-full bg-[var(--color-card-soft)] p-1 text-xs font-medium text-[var(--color-text)]">
          <button
            type="button"
            onClick={() => startTransition(() => setViewMode("day"))}
            className={
              viewMode === "day"
                ? "min-h-11 flex-1 touch-manipulation rounded-full bg-[var(--color-card)] px-4 py-2 shadow-sm"
                : "min-h-11 flex-1 touch-manipulation rounded-full px-4 py-2 transition hover:bg-[var(--color-card)]/70"
            }>
            Jour
          </button>
          <button
            type="button"
            onClick={() => startTransition(() => setViewMode("calendar"))}
            className={
              viewMode === "calendar"
                ? "min-h-11 flex-1 touch-manipulation rounded-full bg-[var(--color-card)] px-4 py-2 shadow-sm"
                : "min-h-11 flex-1 touch-manipulation rounded-full px-4 py-2 transition hover:bg-[var(--color-card)]/70"
            }>
            Calendrier
          </button>
        </div>
      </header>

      {viewMode === "calendar" ? (
        <MonthCalendar
          date={date}
          userId={viewUserId}
          serverToday={today}
          onSelectDate={selectDateFromCalendar}
        />
      ) : readonly && isLoading ? (
        <TodayReadonlySkeleton />
      ) : (
        <>
          {/* Anneau kcal */}
          <Card className="flex flex-col items-center gap-4 py-8">
            <KcalRing eaten={eaten} target={target} burned={burned} />
            <div className="grid w-full grid-cols-3 gap-3 text-center">
              <Kpi
                label="Mangées"
                value={formatKcal(eaten)}
                color="var(--color-accent)"
                icon={<Utensils className="size-4" />}
              />
              <Kpi
                label="Brûlées"
                value={formatKcal(burned)}
                color="var(--color-success)"
                icon={<Flame className="size-4" />}
              />
              <Kpi
                label="Objectif"
                value={formatKcal(target)}
                color="var(--color-info)"
              />
            </div>
            <div className="text-center text-xs text-[var(--color-muted)]">
              Bilan net aujourd&apos;hui :{" "}
              <span className="font-semibold text-[var(--color-text)]">
                {formatKcal(net)}
              </span>
            </div>
          </Card>

          {daily?.coach_comment ? (
            <Card className="space-y-2 border-[var(--color-primary)]/25 bg-[var(--color-card-soft)]/90">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#4f2b1f]">
                <MessageCircle className="size-4 shrink-0" />
                {coachFirst ? `Message de ${coachFirst}` : "Message"}
              </div>
              <p className="whitespace-pre-wrap text-sm text-[var(--color-text)]">
                {daily.coach_comment}
              </p>
              {daily.coach_commented_at ? (
                <p className="text-xs text-[var(--color-muted)]">
                  {new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: profile?.timezone ?? "Africa/Libreville",
                  }).format(new Date(daily.coach_commented_at))}
                </p>
              ) : null}
            </Card>
          ) : null}

          {/* Repas */}
          <Section
            title="Repas"
            action={
              readonly
                ? undefined
                : isToday
                  ? "/log-meal"
                  : `/log-meal?date=${date}`
            }>
            {data?.meals.length ? (
              <ul className="space-y-2">
                {data.meals.map((m) => (
                  <li key={m.id}>
                    <Link href={`/meal/${m.id}`}>
                      <MealRow
                        meal={m}
                        commentCount={data.mealCommentCounts?.[m.id] ?? 0}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyLine>Aucun repas pour l&apos;instant</EmptyLine>
            )}
          </Section>

          {/* Activités */}
          <Section
            title="Activités"
            action={
              readonly
                ? undefined
                : isToday
                  ? "/log-activity"
                  : `/log-activity?date=${date}`
            }>
            {data?.activities.length ? (
              <ul className="space-y-2">
                {data.activities.map((a) => (
                  <li key={a.id}>
                    {!readonly ? (
                      <Link
                        href={`/log-activity?edit=${a.id}&date=${encodeURIComponent(date)}`}
                        prefetch={false}
                        className="block"
                        aria-label={`Modifier l'activité ${a.name}`}
                      >
                        <ActivityRowCard a={a} editableHint />
                      </Link>
                    ) : (
                      <ActivityRowCard a={a} />
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyLine>Aucune activité pour l&apos;instant</EmptyLine>
            )}
          </Section>

          {!readonly && isLoading ? (
            <div className="text-center text-xs text-[var(--color-muted)]">
              Chargement…
            </div>
          ) : null}
        </>
      )}

      {readonly && targetUserId && data?.daily?.id ? (
        <Card className="mt-2 border-[var(--color-primary)]/25">
          <div className="mb-3 text-sm font-semibold text-[#4f2b1f]">
            {coachFirst
              ? `Commentaire de ${coachFirst} (jour)`
              : "Commentaire (jour)"}
          </div>
          <CoachDailyCommentForm
            dailyLogId={data.daily.id}
            clientId={targetUserId}
            coachId={userId}
            initial={data.daily.coach_comment ?? ""}
            invalidateQueryKey={["today", viewUserId, date]}
          />
        </Card>
      ) : null}

      {!readonly && <Fab dateQuery={fabDateQuery} />}
    </div>
  );
}

function TodayReadonlySkeleton() {
  return (
    <div
      className="animate-pulse space-y-4"
      aria-busy="true"
      aria-label="Chargement des données">
      <Card className="flex flex-col items-center gap-4 py-8">
        <div className="aspect-square w-[min(18rem,80vw)] max-h-72 rounded-full bg-[var(--color-card-soft)]" />
        <div className="grid w-full grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-[var(--color-card-soft)]"
            />
          ))}
        </div>
        <div className="mx-auto h-4 w-48 rounded bg-[var(--color-card-soft)]" />
      </Card>
      <section className="space-y-2">
        <div className="h-5 w-16 rounded bg-[var(--color-card-soft)]" />
        <div className="h-20 rounded-2xl bg-[var(--color-card-soft)]" />
        <div className="h-20 rounded-2xl bg-[var(--color-card-soft)]" />
      </section>
      <section className="space-y-2">
        <div className="h-5 w-24 rounded bg-[var(--color-card-soft)]" />
        <div className="h-20 rounded-2xl bg-[var(--color-card-soft)]" />
      </section>
    </div>
  );
}

function formatRelativeDay(date: string, today: string): string {
  if (date === today) return "Aujourd'hui";
  const d = new Date(date + "T00:00:00Z");
  const t = new Date(today + "T00:00:00Z");
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (diff === -1) return "Hier";
  if (diff === 1) return "Demain";
  if (diff < 0) return `Il y a ${-diff} jours`;
  return `Dans ${diff} jours`;
}

function Kpi({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-[var(--color-card-soft)] p-3">
      <div
        className="mx-auto mb-1 flex size-7 items-center justify-center rounded-full"
        style={{ background: `${color}20`, color }}>
        {icon}
      </div>
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {action && (
          <Link
            href={action}
            className="inline-flex min-h-11 min-w-[44px] touch-manipulation items-center gap-1 rounded-full bg-[var(--color-card)] px-3 py-1.5 text-xs font-medium text-[var(--color-primary-soft)]">
            <Plus className="size-3" /> Ajouter
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)]/40 p-4 text-center text-sm text-[var(--color-muted)]">
      {children}
    </div>
  );
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Petit-déj",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Snack",
};

function MealRow({
  meal,
  commentCount = 0,
}: {
  meal: Meal;
  commentCount?: number;
}) {
  const thumb = meal.media_urls?.[0];
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-card)] p-3">
      <div className="relative size-14 overflow-hidden rounded-xl bg-[var(--color-card-soft)]">
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <Utensils className="absolute inset-0 m-auto size-5 text-[var(--color-muted)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{meal.name}</span>
          <Badge tone="primary">
            {MEAL_LABELS[meal.meal_type] ?? meal.meal_type}
          </Badge>
        </div>
        <div className="text-xs text-[var(--color-muted)]">
          P {Math.round(meal.total_protein_g)}g · G{" "}
          {Math.round(meal.total_carbs_g)}g · L {Math.round(meal.total_fat_g)}g
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
        {commentCount > 0 ? (
          <span
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--color-primary)]"
            title="Commentaires sur ce repas">
            <MessageCircle className="size-3.5" />
            {commentCount}
          </span>
        ) : null}
        <div className="text-sm font-semibold text-[var(--color-accent)]">
          {formatKcal(meal.total_kcal)}
        </div>
      </div>
    </div>
  );
}

function ActivityRowCard({
  a,
  editableHint,
}: {
  a: ActivityRow;
  /** Affiche une flèche pour indiquer l’édition (lien activité). */
  editableHint?: boolean;
}) {
  const thumb = a.youtube_thumbnail ?? a.media_urls?.[0];
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-card)] p-3 transition hover:bg-[var(--color-card-soft)]">
      <div className="relative size-14 overflow-hidden rounded-xl bg-[var(--color-card-soft)]">
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <Activity className="absolute inset-0 m-auto size-5 text-[var(--color-muted)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">{a.name}</div>
        <div className="text-xs text-[var(--color-muted)]">
          {a.duration_min ? `${a.duration_min} min` : ""}
          {a.steps ? ` · ${a.steps.toLocaleString("fr-FR")} pas` : ""}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <div className="text-sm font-semibold text-[var(--color-success)]">
          −{formatKcal(a.kcal_burned)}
        </div>
        {editableHint ? (
          <ChevronRight
            className="size-4 text-[var(--color-muted)]"
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}
