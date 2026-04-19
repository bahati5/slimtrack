"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Comment {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  author_name: string | null;
}

export function MealComments({
  mealId,
  viewerId,
  mealOwnerId,
}: {
  mealId: string;
  viewerId: string;
  mealOwnerId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const isOwner = viewerId === mealOwnerId;

  const load = useCallback(
    async () => {
      const { data } = await supabase
        .from("meal_comments")
        .select("id, author_id, body, created_at")
        .eq("meal_id", mealId)
        .order("created_at", { ascending: true });

      const rows = (data ?? []) as {
        id: string;
        author_id: string;
        body: string;
        created_at: string;
      }[];

      const authorIds = [...new Set(rows.map((r) => r.author_id))];
      const names: Record<string, string | null> = {};
      if (authorIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", authorIds);
        for (const p of (profs ?? []) as {
          id: string;
          full_name: string | null;
        }[]) {
          names[p.id] = p.full_name;
        }
      }

      setComments(
        rows.map((r) => ({ ...r, author_name: names[r.author_id] ?? null })),
      );
      setLoading(false);
    },
    [supabase, mealId],
  );

  useEffect(() => {
    void load();

    // Polling léger (toutes les 10 s) comme filet de sécurité si le realtime
    // n'est pas activé sur la table ou en cas de latence.
    const poll = setInterval(() => void load(), 10000);

    // Realtime
    const channel = supabase
      .channel(`meal-comments-${mealId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meal_comments",
          filter: `meal_id=eq.${mealId}`,
        },
        () => void load(),
      )
      .subscribe();

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [supabase, mealId, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const { error } = await supabase.from("meal_comments").insert({
      meal_id: mealId,
      author_id: viewerId,
      body: text,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
    // Refetch immédiat — ne pas dépendre du realtime uniquement.
    await load();
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageCircle className="size-4 text-[var(--color-primary)]" />
        <CardTitle>Commentaires</CardTitle>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Chargement…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          {isOwner
            ? "Aucun commentaire pour l'instant."
            : "Laisse un mot à ta cliente."}
        </p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => {
            const mine = c.author_id === viewerId;
            return (
              <li
                key={c.id}
                className={cn(
                  "flex",
                  mine ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    mine
                      ? "bg-[#4f2b1f] text-[#efcedb]"
                      : "bg-[var(--color-card-soft)] text-[var(--color-text)]",
                  )}
                >
                  <div
                    className={cn(
                      "text-xs font-semibold",
                      mine ? "text-[#efcedb]/70" : "text-[var(--color-muted)]",
                    )}
                  >
                    {c.author_name ?? "Anonyme"} ·{" "}
                    {new Intl.DateTimeFormat("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Africa/Libreville",
                    }).format(new Date(c.created_at))}
                  </div>
                  <div className="whitespace-pre-wrap">{c.body}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={submit} className="flex items-end gap-2 pt-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={isOwner ? "Ajouter une note…" : "Commenter…"}
          rows={2}
          maxLength={1000}
          className="flex-1 resize-none rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-sm outline-none transition focus:border-[var(--color-primary)]"
        />
        <Button
          type="submit"
          loading={sending}
          disabled={!body.trim()}
          aria-label="Envoyer"
        >
          <Send className="size-4" />
        </Button>
      </form>
    </Card>
  );
}
