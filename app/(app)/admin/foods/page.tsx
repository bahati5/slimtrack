import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Apple } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FoodsView } from "../../foods/foods-view";

export const dynamic = "force-dynamic";

export default async function AdminFoodsPage() {
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

  return (
    <div className="space-y-4 p-5">
      <header className="space-y-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
        >
          <ChevronLeft className="size-4" /> Retour admin
        </Link>
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary">
            <Apple className="size-5 on-warm" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Base aliments</h1>
            <p className="text-sm text-[var(--color-muted)]">
              Modifier, supprimer ou ajouter des entrées dans la base partagée
              (visible par toutes les utilisatrices).
            </p>
          </div>
        </div>
      </header>
      <FoodsView userId={user.id} isAdmin />
    </div>
  );
}
