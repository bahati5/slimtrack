import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TodayContentSkeleton } from "@/components/shared/app-page-skeleton";
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
      "id, full_name, target_kcal, current_weight_kg, timezone, age, sex, height_cm, activity_level, coach_id",
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

  let coachDisplayName: string | null = null;
  // @ts-expect-error supabase types not generated
  if (profile?.coach_id) {
    const { data: coach } = await supabase
      .from("profiles")
      .select("full_name")
      // @ts-expect-error supabase types not generated
      .eq("id", profile.coach_id)
      .maybeSingle();
    coachDisplayName = coach?.full_name ?? null;
  }

  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-5 pb-40 max-[380px]:pb-44">
          <TodayContentSkeleton />
        </div>
      }>
      <TodayView
        userId={user.id}
        profile={profile ?? null}
        serverToday={serverToday}
        coachDisplayName={coachDisplayName}
      />
    </Suspense>
  );
}
