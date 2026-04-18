"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useCoachHomeHref } from "@/components/shared/coach-home-context";
import { firstName } from "@/lib/utils/format";
import { ChevronLeft } from "lucide-react";
import { ListPageSkeleton } from "@/components/shared/app-page-skeleton";

type Row = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link_url: string | null;
};

export default function NotificationsPage() {
  const supabase = useMemo(() => createClient(), []);
  const qc = useQueryClient();
  const coachHomeHref = useCoachHomeHref();
  const backHref = coachHomeHref ?? "/today";
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, [supabase]);

  const { data: coachFullName } = useQuery({
    queryKey: ["coach-name-for-notifs", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("coach_id")
        .eq("id", userId!)
        .maybeSingle();
      // @ts-expect-error supabase types not generated
      const cid = p?.coach_id as string | null | undefined;
      if (!cid) return null;
      const { data: c } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", cid)
        .maybeSingle();
      return (c?.full_name as string | null) ?? null;
    },
  });

  const coachFn = firstName(coachFullName ?? undefined);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, type, is_read, created_at, link_url")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      void qc.invalidateQueries({ queryKey: ["notifications", userId] });
      void qc.invalidateQueries({ queryKey: ["notifications-unread", userId] });
    })();
  }, [userId, supabase, qc]);

  return (
    <div className="space-y-4 p-5">
      <header className="flex items-center gap-3">
        <Link
          href={backHref}
          className="flex size-10 items-center justify-center rounded-xl text-[var(--color-text)] hover:bg-[var(--color-card-soft)]"
          aria-label="Retour"
        >
          <ChevronLeft className="size-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-[var(--color-muted)]">
            {coachFn
              ? `Commentaires, repas enregistrés et messages de ${coachFn}.`
              : "Commentaires, repas enregistrés et alertes sur ton suivi."}
          </p>
        </div>
      </header>

      {!userId || isLoading ? (
        <ListPageSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <Card>
          <CardTitle>Rien pour l&apos;instant</CardTitle>
          <CardDescription>
            {coachFn
              ? `Tu seras notifié(e) ici quand ${coachFn} te contacte ou que tes données bougent.`
              : "Tu seras notifié(e) ici quand ton suivi ou tes données bougent."}
          </CardDescription>
        </Card>
      ) : (
        <ul className="space-y-2">
          {rows.map((n) => {
            const inner = (
              <>
                <div className="text-xs text-[var(--color-muted)]">
                  {new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(n.created_at))}
                </div>
                <div className="font-semibold text-[var(--color-text)]">{n.title}</div>
                <p className="text-sm text-[var(--color-muted)]">{n.body}</p>
              </>
            );
            return (
              <li key={n.id}>
                {n.link_url ? (
                  <Link href={n.link_url}>
                    <Card
                      className={`block transition hover:border-[var(--color-primary)]/40 ${!n.is_read ? "border-[var(--color-primary)]/30 bg-[var(--color-card-soft)]/50" : ""}`}
                    >
                      {inner}
                    </Card>
                  </Link>
                ) : (
                  <Card
                    className={
                      !n.is_read ? "border-[var(--color-primary)]/30 bg-[var(--color-card-soft)]/50" : ""
                    }
                  >
                    {inner}
                  </Card>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
