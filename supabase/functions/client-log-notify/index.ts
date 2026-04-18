/**
 * Supabase Edge Function — client-log-notify
 *
 * Déclenchée par un Database Webhook sur daily_logs UPDATE
 * quand status passe de 'empty'/'partial' à 'complete' ou 'partial'.
 * Envoie un Web Push au coach de la cliente.
 *
 * Déploiement :
 *   pnpm dlx supabase functions deploy client-log-notify
 *
 * Secrets requis :
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 */

// @ts-expect-error deno env
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-expect-error deno env
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-expect-error deno env
import webpush from "https://esm.sh/web-push@3.6.7";

// @ts-expect-error deno env
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-expect-error deno env
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// @ts-expect-error deno env
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
// @ts-expect-error deno env
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
// @ts-expect-error deno env
const VAPID_SUBJECT =
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@slimtrack.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

interface Payload {
  record: {
    user_id: string;
    log_date: string;
    status: "empty" | "partial" | "complete";
    total_kcal_eaten: number;
    net_kcal: number;
  };
  old_record?: {
    status?: "empty" | "partial" | "complete";
    total_kcal_eaten?: number;
    total_kcal_burned?: number;
    steps_kcal_burned?: number;
    net_kcal?: number;
  };
}

serve(async (req: Request) => {
  const payload = (await req.json()) as Payload;
  const { user_id, log_date, status, total_kcal_eaten } = payload?.record ?? {};

  // Le trigger SQL n’appelle cette fonction que si repas/activité/statut ont changé
  if (!user_id || status === "empty")
    return new Response("noop", { status: 200 });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Récupère le coach_id et le prénom de la cliente
  const { data: profile } = await sb
    .from("profiles")
    .select("full_name, coach_id")
    .eq("id", user_id)
    .single();

  const coachId = profile?.coach_id;
  if (!coachId) return new Response("no coach", { status: 200 });

  const clientName = profile?.full_name ?? "Une cliente";

  // Récupère les push subscriptions du coach
  const { data: subs } = await sb
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", coachId);

  const statusLabel = status === "complete" ? "complètes" : "partielles";
  const title = `${clientName} a mis à jour son journal`;
  const body = `Données du ${log_date} ${statusLabel} — ${total_kcal_eaten} kcal enregistrées`;

  const linkUrl = `/coach/${user_id}`;
  const pushBody = JSON.stringify({ title, body, url: linkUrl });

  await Promise.allSettled(
    (subs ?? []).map((s: { endpoint: string; p256dh: string; auth: string }) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        pushBody,
      ),
    ),
  );

  await sb.from("notifications").insert({
    user_id: coachId,
    type: "client_log",
    title,
    body,
    link_url: linkUrl,
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
