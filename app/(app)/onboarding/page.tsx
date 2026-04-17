import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "./onboarding-flow";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, age, sex, height_cm, current_weight_kg, goal_weight_kg, activity_level, deficit_kcal",
    )
    .eq("id", user.id)
    .maybeSingle();

  // Si le profil est déjà complet, on file direct à /today.
  if (
    profile?.age &&
    profile?.sex &&
    profile?.height_cm &&
    profile?.current_weight_kg &&
    profile?.activity_level
  ) {
    redirect("/today");
  }

  return (
    <OnboardingFlow
      initial={{
        full_name: profile?.full_name ?? null,
        age: profile?.age ?? null,
        sex: profile?.sex ?? null,
        height_cm: profile?.height_cm ?? null,
        current_weight_kg: profile?.current_weight_kg ?? null,
        goal_weight_kg: profile?.goal_weight_kg ?? null,
        activity_level: profile?.activity_level ?? null,
        deficit_kcal: profile?.deficit_kcal ?? 500,
      }}
    />
  );
}
