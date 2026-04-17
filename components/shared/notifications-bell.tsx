"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

export function NotificationsBell() {
  const supabase = useMemo(() => createClient(), []);
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`notifications-feed-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void qc.invalidateQueries({
            queryKey: ["notifications-unread", userId],
          });
          void qc.invalidateQueries({ queryKey: ["notifications", userId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, userId, qc]);

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications-unread", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId!)
        .eq("is_read", false);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 20_000,
  });

  if (!userId) return null;

  return (
    <Link
      href="/notifications"
      className={cn(
        "fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-40 flex size-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/95 shadow-md backdrop-blur-sm transition hover:bg-[var(--color-card)]",
      )}
      aria-label="Notifications"
    >
      <Bell className="size-5 text-[var(--color-primary)]" />
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
