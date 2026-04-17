import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/utils/format";
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
    .select("role")
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
    <Suspense>
      <TodayView
        userId={user.id}
        targetUserId={clientId}
        profile={client}
        readonly
        titleOverride={title}
        basePath={`/coach/${clientId}`}
        serverToday={serverToday}
      />
    </Suspense>
  );
}
