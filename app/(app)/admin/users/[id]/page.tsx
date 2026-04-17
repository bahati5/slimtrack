import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatKcal } from "@/lib/utils/format";
import { ArrowLeft } from "lucide-react";
import { AdminUserEditForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: target } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!target) redirect("/admin");

  const since = new Date();
  since.setDate(since.getDate() - 14);

  const { data: logs } = await supabase
    .from("daily_logs")
    .select(
      "id, log_date, total_kcal_eaten, total_kcal_burned, steps_kcal_burned, net_kcal, target_kcal, deficit_respected",
    )
    .eq("user_id", id)
    .gte("log_date", since.toISOString().slice(0, 10))
    .order("log_date", { ascending: false });

  const { data: coaches } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["coach", "admin"])
    .neq("id", id);

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center gap-2">
        <Link
          href="/admin"
          className="rounded-full p-2 hover:bg-[var(--color-card-soft)]"
          aria-label="Retour"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">{target.full_name ?? "Profil"}</h1>
      </div>

      <AdminUserEditForm user={target} coaches={coaches ?? []} />

      <Card>
        <CardTitle>Journaux (14 jours)</CardTitle>
        <CardDescription>
          {logs?.length ?? 0} journée{(logs?.length ?? 0) > 1 ? "s" : ""} loggée{(logs?.length ?? 0) > 1 ? "s" : ""}
        </CardDescription>
        <ul className="mt-3 space-y-1">
          {logs?.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded-xl bg-[var(--color-card-soft)] p-2 text-xs"
            >
              <span>{l.log_date}</span>
              <div className="flex items-center gap-2">
                <span className="text-[var(--color-accent)]">
                  {formatKcal(l.total_kcal_eaten)}
                </span>
                <span className="text-[var(--color-muted)]">/</span>
                <span className="text-[var(--color-info)]">
                  {formatKcal(l.target_kcal ?? 0)}
                </span>
                <Badge tone={l.deficit_respected ? "success" : "warning"}>
                  {l.deficit_respected ? "ok" : "×"}
                </Badge>
              </div>
            </li>
          ))}
          {!logs?.length && (
            <li className="rounded-xl bg-[var(--color-card-soft)] p-3 text-center text-xs text-[var(--color-muted)]">
              Pas de données récentes.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
