import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminUsersView } from "./users-view";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
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
  if (me?.role !== "admin") redirect("/today");

  // Grâce aux policies admin (0005_admin.sql), cette requête renvoie
  // l'ensemble des profils.
  const { data: users } = await supabase
    .from("profiles")
    .select(
      "id, role, full_name, avatar_url, coach_id, current_weight_kg, goal_weight_kg, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  // Liste des coachs disponibles pour l'assignation
  const coaches = (users ?? []).filter(
    (u: { role: string }) => u.role === "coach" || u.role === "admin",
  );

  return (
    <div className="space-y-4 p-5">
      <header>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Gère les rôles et assignations coach de toutes les utilisatrices.
        </p>
      </header>
      <AdminUsersView users={users ?? []} coaches={coaches} meId={user.id} />
    </div>
  );
}
