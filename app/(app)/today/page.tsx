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

  // Préchargement server-side des données du jour pour éviter le skeleton client.
  const { data: dailyRaw } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("log_date", serverToday)
    .maybeSingle();

  // @ts-expect-error supabase types not generated
  const dailyId: string | null = dailyRaw?.id ?? null;

  const [mealsRes, activitiesRes, mealCommentsRes] = await Promise.all([
    dailyId
      ? supabase
          .from("meals")
          .select(
            "id,name,meal_type,total_kcal,total_protein_g,total_carbs_g,total_fat_g,media_urls,eaten_at",
          )
          .eq("user_id", user.id)
          .eq("daily_log_id", dailyId)
          .order("eaten_at", { ascending: true })
      : Promise.resolve({ data: [] as unknown[] }),
    dailyId
      ? supabase
          .from("activities")
          .select(
            "id,name,activity_type,duration_min,kcal_burned,steps,youtube_thumbnail,media_urls,done_at",
          )
          .eq("user_id", user.id)
          .eq("daily_log_id", dailyId)
          .order("done_at", { ascending: true })
      : Promise.resolve({ data: [] as unknown[] }),
    Promise.resolve({ data: [] as { meal_id: string }[] }),
  ]);

  const mealList = (mealsRes.data ?? []) as { id: string }[];
  let mealCommentCounts: Record<string, number> = {};
  if (mealList.length) {
    const mealIds = mealList.map((m) => m.id);
    const { data: mcc } = await supabase
      .from("meal_comments")
      .select("meal_id")
      .in("meal_id", mealIds);
    mealCommentCounts = {};
    for (const row of (mcc ?? []) as { meal_id: string }[]) {
      mealCommentCounts[row.meal_id] =
        (mealCommentCounts[row.meal_id] ?? 0) + 1;
    }
  }
  void mealCommentsRes;

  // Supabase types pas générés : on relâche le typage ici, les shapes
  // correspondent à ceux consommés par TodayView (voir queryFn côté client).
  const initialTodayData = {
    daily: (dailyRaw ?? null) as never,
    meals: (mealsRes.data ?? []) as never,
    activities: (activitiesRes.data ?? []) as never,
    mealCommentCounts,
  };

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
        initialData={initialTodayData}
      />
    </Suspense>
  );
}
