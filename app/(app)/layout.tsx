import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/shared/bottom-nav";
import { NotificationsBell } from "@/components/shared/notifications-bell";
import { CoachHomeProvider } from "@/components/shared/coach-home-context";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, age, height_cm, current_weight_kg")
    .eq("id", user.id)
    .maybeSingle();

  // Profil incomplet ? On oriente vers /onboarding (sauf si on y est déjà)
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? headersList.get("x-invoke-path") ?? "";
  const isOnboarding = pathname.startsWith("/onboarding");

  const profileIncomplete =
    !profile?.age ||
    !profile?.height_cm ||
    !profile?.current_weight_kg;

  if (profileIncomplete && !isOnboarding) {
    redirect("/onboarding");
  }

  const isCoachOrAdmin =
    profile?.role === "coach" || profile?.role === "admin";
  const cookieStore = await cookies();
  const coachClientId = cookieStore.get("coach_active_client")?.value;
  const coachHomeHref =
    isCoachOrAdmin && coachClientId ? `/coach/${coachClientId}` : null;

  return (
    <CoachHomeProvider coachHomeHref={coachHomeHref}>
      <div
        className={`relative mx-auto flex min-h-dvh w-full max-w-lg flex-col safe-top ${
          isOnboarding ? "" : "pb-24"
        }`}
      >
        {!isOnboarding && <NotificationsBell />}
        <main className="flex-1">{children}</main>
        {!isOnboarding && (
          <BottomNav isCoach={isCoachOrAdmin} isAdmin={profile?.role === "admin"} />
        )}
      </div>
    </CoachHomeProvider>
  );
}
