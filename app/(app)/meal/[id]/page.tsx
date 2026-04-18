import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Utensils, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatKcal, todayHrefAfterLog, todayIso } from "@/lib/utils/format";
import { MealComments } from "./comments";

export const dynamic = "force-dynamic";

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Petit-déj",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Snack",
};

export default async function MealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: meal } = await supabase
    .from("meals")
    .select("*, daily_logs ( log_date )")
    .eq("id", id)
    .maybeSingle();
  if (!meal) notFound();

  const rawDl = meal.daily_logs as
    | { log_date?: string }
    | { log_date?: string }[]
    | null;
  const dlRow = Array.isArray(rawDl) ? rawDl[0] : rawDl;
  const logDate =
    dlRow?.log_date?.slice(0, 10) ?? todayIso();

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: items } = await supabase
    .from("meal_items")
    .select("id, food_name, quantity_g, kcal_total, protein_g, carbs_g, fat_g")
    .eq("meal_id", id)
    .order("created_at", { ascending: true });

  // @ts-expect-error supabase types not generated
  const mediaUrls: string[] = meal.media_urls ?? [];
  // @ts-expect-error
  const mealType: string = meal.meal_type;
  // @ts-expect-error
  const eatenAt: string = meal.eaten_at;
  // @ts-expect-error
  const mealName: string = meal.name;
  // @ts-expect-error
  const notes: string | null = meal.notes;
  // @ts-expect-error
  const totalKcal: number = meal.total_kcal;
  // @ts-expect-error
  const totalP: number = meal.total_protein_g;
  // @ts-expect-error
  const totalC: number = meal.total_carbs_g;
  // @ts-expect-error
  const totalF: number = meal.total_fat_g;
  // @ts-expect-error
  const mealUserId: string = meal.user_id;

  // @ts-expect-error supabase types not generated
  const viewerRole = viewerProfile?.role as string | undefined;
  const isCoachOrAdmin = viewerRole === "coach" || viewerRole === "admin";
  const isOwner = mealUserId === user.id;
  const backHref =
    isCoachOrAdmin && !isOwner
      ? `/coach/${mealUserId}`
      : todayHrefAfterLog(logDate);
  const editMealHref = `/log-meal?edit=${encodeURIComponent(id)}&date=${encodeURIComponent(logDate)}`;

  return (
    <div className="space-y-4 p-5 pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
        >
          <ChevronLeft className="size-4" /> Retour
        </Link>
        {isOwner ? (
          <Link
            href={editMealHref}
            className="text-sm font-semibold text-[var(--color-primary-soft)] hover:underline"
          >
            Modifier le repas
          </Link>
        ) : null}
      </div>

      {/* Photo */}
      {mediaUrls.length > 0 ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-[var(--color-card-soft)]">
          <Image
            src={mediaUrls[0]}
            alt={mealName}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 512px"
            priority
          />
        </div>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center rounded-3xl bg-[var(--color-card-soft)]">
          <Utensils className="size-16 text-[var(--color-muted)]" />
        </div>
      )}

      {/* Header */}
      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{mealName}</CardTitle>
            <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-muted)]">
              <Clock className="size-3" />
              {new Intl.DateTimeFormat("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(eatenAt))}
            </div>
          </div>
          <Badge tone="primary">{MEAL_LABELS[mealType] ?? mealType}</Badge>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <Macro label="kcal" value={formatKcal(totalKcal).replace(" kcal", "")} highlight />
          <Macro label="Prot." value={`${Math.round(totalP)}g`} />
          <Macro label="Gluc." value={`${Math.round(totalC)}g`} />
          <Macro label="Lip." value={`${Math.round(totalF)}g`} />
        </div>

        {notes && (
          <p className="rounded-xl bg-[var(--color-card-soft)] p-3 text-sm text-[var(--color-text)]">
            {notes}
          </p>
        )}
      </Card>

      {/* Ingrédients */}
      {items && items.length > 0 && (
        <Card className="space-y-2">
          <CardTitle>Ingrédients</CardTitle>
          <ul className="divide-y divide-[var(--color-border)]">
            {items.map((it) => {
              // @ts-expect-error
              const name: string = it.food_name;
              // @ts-expect-error
              const qty: number = it.quantity_g;
              // @ts-expect-error
              const kcal: number = it.kcal_total;
              return (
                <li
                  // @ts-expect-error
                  key={it.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{name}</div>
                    <div className="text-xs text-[var(--color-muted)]">
                      {Math.round(qty)} g
                    </div>
                  </div>
                  <div className="font-semibold">{formatKcal(kcal)}</div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Commentaires */}
      <MealComments mealId={id} viewerId={user.id} mealOwnerId={mealUserId} />
    </div>
  );
}

function Macro({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[var(--color-card-soft)] p-2">
      <div
        className={
          highlight
            ? "text-sm font-bold text-[var(--color-accent)]"
            : "text-sm font-semibold"
        }
      >
        {value}
      </div>
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
    </div>
  );
}
