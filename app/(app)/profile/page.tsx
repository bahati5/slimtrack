import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { MeasurementsForm } from "./measurements-form";
import { WeightDateForm } from "./weight-date-form";
import { LogoutButton } from "./logout-button";
import { CoachModeCard } from "./coach-mode-card";
import { InviteCodeCard } from "@/components/shared/invite-code-card";
import { LeaveCoachButton } from "@/components/profile/leave-coach-button";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Nom du coach si assigné
  let coachName: string | null = null;
  if (profile?.coach_id) {
    const { data: coach } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", profile.coach_id)
      .maybeSingle();
    coachName = coach?.full_name ?? null;
  }

  return (
    <div className="space-y-4 p-5 pb-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mon profil</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Ces infos servent à calculer ton objectif kcal journalier.
          </p>
        </div>
      </header>

      <CoachModeCard currentRole={profile?.role ?? null} />

      <InviteCodeCard
        initialCode={profile?.invite_code ?? null}
        coachName={coachName}
      />

      {profile?.coach_id ? (
        <LeaveCoachButton coachName={coachName} />
      ) : null}

      <ProfileForm
        initial={{
          full_name: profile?.full_name ?? null,
          age: profile?.age ?? null,
          sex: profile?.sex ?? null,
          height_cm: profile?.height_cm ?? null,
          current_weight_kg: profile?.current_weight_kg ?? null,
          goal_weight_kg: profile?.goal_weight_kg ?? null,
          activity_level: profile?.activity_level ?? null,
          deficit_kcal: profile?.deficit_kcal ?? 500,
          target_kcal: profile?.target_kcal ?? null,
          avatar_url: profile?.avatar_url ?? null,
        }}
      />

      <WeightDateForm timezone={profile?.timezone ?? null} />

      <MeasurementsForm timezone={profile?.timezone ?? null} />

      <LogoutButton />
    </div>
  );
}
