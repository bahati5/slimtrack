import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/shared/bottom-nav";
import { NotificationsBell } from "@/components/shared/notifications-bell";

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

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col pb-24 safe-top">
      {!isOnboarding && <NotificationsBell />}
      <main className="flex-1">{children}</main>
      {!isOnboarding && (
        <BottomNav
          isCoach={profile?.role === "coach" || profile?.role === "admin"}
          isAdmin={profile?.role === "admin"}
        />
      )}
    </div>
  );
}
