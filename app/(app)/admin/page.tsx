import Link from "next/link";
import { redirect } from "next/navigation";
import { Apple } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
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

      <Link href="/admin/foods" className="block">
        <Card className="transition hover:border-[var(--color-primary)]/35">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-card-soft)]">
              <Apple className="size-5 text-[var(--color-primary-soft)]" />
            </div>
            <div>
              <CardTitle className="text-base">Base aliments</CardTitle>
              <CardDescription>
                Éditer la table food_database : macros, catégories, ajouts et
                suppressions.
              </CardDescription>
            </div>
          </div>
        </Card>
      </Link>

      <AdminUsersView users={users ?? []} coaches={coaches} meId={user.id} />
    </div>
  );
}
