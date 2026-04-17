/**
 * Supabase Edge Function — push-reminders
 *
 * À appeler via cron Supabase (Scheduled Triggers) à 12h et 19h en TZ locale.
 * Envoie un rappel aux utilisatrices qui n'ont pas encore logé de repas
 * sur la journée en cours.
 *
 *   supabase functions deploy push-reminders
 *   # Puis dans Dashboard > Database > Scheduled Triggers :
 *   #   cron: "0 11,18 * * *"   (UTC) → 12h/19h Libreville
 *   #   http request: POST <function_url>
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
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@slimtrack.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

serve(async () => {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const today = new Date().toISOString().slice(0, 10);

  // Utilisatrices "user" sans repas aujourd'hui
  const { data: toNotify } = await sb.rpc("reminder_candidates", {
    p_date: today,
  }).maybeSingle();

  // Fallback si RPC pas créée : on prend tout le monde avec un push_sub.
  const userIds: string[] =
    (toNotify as string[] | null) ??
    (
      (await sb.from("push_subscriptions").select("user_id")).data ?? []
    ).map((r: { user_id: string }) => r.user_id);

  const { data: subs } = await sb
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  const body = JSON.stringify({
    title: "SlimTrack — un petit rappel 👋",
    body: "N'oublie pas de logger ton repas aujourd'hui.",
    url: "/log-meal",
  });

  await Promise.allSettled(
    (subs ?? []).map(
      (s: { endpoint: string; p256dh: string; auth: string }) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        ),
    ),
  );

  return new Response(
    JSON.stringify({ ok: true, sent: subs?.length ?? 0 }),
    { headers: { "Content-Type": "application/json" } },
  );
});
