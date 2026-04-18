import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, LineChart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/utils/format";
import { UnlinkClientButton } from "@/components/coach/unlink-client-button";
import { TodayView } from "../../today/today-view";

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

  const { data: me } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const isCoach = me?.role === "coach";
  const isAdmin = me?.role === "admin";
  if (!isCoach && !isAdmin) redirect("/today");

  const { data: client } = await supabase
    .from("profiles")
    .select(
      "id, full_name, target_kcal, current_weight_kg, timezone, age, sex, height_cm, activity_level, coach_id",
    )
    .eq("id", clientId)
    .maybeSingle();

  if (!client) redirect("/coach");

  if (!isAdmin && client.coach_id !== user.id) {
    redirect("/coach");
  }

  const serverToday = todayIso(client.timezone);
  const title =
    client.full_name?.trim() ||
    "Cliente";

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-5 pt-4">
        <Link
          href="/coach"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
        >
          <ChevronLeft className="size-4" /> Clientes
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/coach/${clientId}/stats`}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-card-soft)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-card)]"
          >
            <LineChart className="size-3.5" /> Statistiques
          </Link>
          <UnlinkClientButton clientId={clientId} clientName={client.full_name} />
        </div>
      </div>
      <Suspense>
        <TodayView
          userId={user.id}
          targetUserId={clientId}
          profile={client}
          readonly
          titleOverride={title}
          basePath={`/coach/${clientId}`}
          serverToday={serverToday}
          coachDisplayName={me?.full_name ?? null}
        />
      </Suspense>
    </>
  );
}
