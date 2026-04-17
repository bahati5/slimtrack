import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/utils/format";
import { TodayView } from "./today-view";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, target_kcal, current_weight_kg, timezone, age, sex, height_cm, activity_level",
    )
    .eq("id", user.id)
    .maybeSingle();

  // Profil incomplet ⇒ onboarding
  if (
    !profile?.age ||
    !profile?.sex ||
    !profile?.height_cm ||
    !profile?.current_weight_kg ||
    !profile?.activity_level
  ) {
    redirect("/onboarding");
  }

  const serverToday = todayIso(profile?.timezone);

  return (
    <Suspense>
      <TodayView userId={user.id} profile={profile ?? null} serverToday={serverToday} />
    </Suspense>
  );
}
