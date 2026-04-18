import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClaimClientForm } from "./claim-client-form";
import { UnlinkClientButton } from "@/components/coach/unlink-client-button";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
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
  if (me?.role !== "coach" && me?.role !== "admin") redirect("/today");

  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, current_weight_kg, goal_weight_kg")
    .eq("coach_id", user.id)
    .order("full_name", { ascending: true });

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString().slice(0, 10);

  const clientIds = (clients ?? []).map((c) => c.id);
  const { data: logs } = clientIds.length
    ? await supabase
        .from("daily_logs")
        .select("user_id, deficit_respected, log_date")
        .in("user_id", clientIds)
        .gte("log_date", sinceStr)
    : { data: [] };

  const compliance: Record<string, { ok: number; total: number }> = {};
  for (const l of logs ?? []) {
    const k = compliance[l.user_id] ?? { ok: 0, total: 0 };
    k.total++;
    if (l.deficit_respected) k.ok++;
    compliance[l.user_id] = k;
  }

  return (
    <div className="space-y-4 p-5">
      <header>
        <h1 className="text-2xl font-bold">Espace Coach</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Vue d&apos;ensemble de tes clientes sur 7 jours.
        </p>
      </header>

      <ClaimClientForm />

      {!clients?.length && (
        <Card className="border-dashed">
          <CardTitle>Aucune cliente pour le moment</CardTitle>
          <CardDescription>
            Demande à ta cliente son code d&apos;invitation (visible sur son
            profil) et entre-le dans le champ ci-dessus.
          </CardDescription>
        </Card>
      )}

      {clients?.map((c) => {
        const k = compliance[c.id];
        const pct = k?.total ? Math.round((k.ok / k.total) * 100) : 0;
        return (
          <Card
            key={c.id}
            className="flex items-center gap-1 p-2 pr-1 transition hover:border-[var(--color-primary)]"
          >
            <Link
              href={`/coach/${c.id}`}
              className="flex min-w-0 flex-1 items-center gap-3 p-1"
            >
              <div className="size-12 shrink-0 rounded-full bg-gradient-primary" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{c.full_name ?? "Sans nom"}</div>
                <div className="text-xs text-[var(--color-muted)]">
                  Poids : {c.current_weight_kg ?? "—"} kg
                  {c.goal_weight_kg && ` → ${c.goal_weight_kg} kg`}
                </div>
              </div>
              <Badge
                tone={pct >= 70 ? "success" : pct >= 40 ? "warning" : "accent"}
              >
                {pct}% 7j
              </Badge>
            </Link>
            <UnlinkClientButton clientId={c.id} clientName={c.full_name} />
          </Card>
        );
      })}
    </div>
  );
}
