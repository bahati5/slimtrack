/**
 * Supabase Edge Function — coach-notify
 *
 * Déclenchée (via webhook ou trigger) lorsqu'une coach poste un commentaire
 * sur `daily_logs.coach_comment`. Envoie un Web Push à la cliente.
 *
 * Déploiement :
 *   pnpm dlx supabase functions deploy coach-notify
 *
 * Secrets requis (Supabase → Functions → Secrets) :
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
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@slimtrack.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

interface Payload {
  record: {
    user_id: string;
    coach_comment: string | null;
    log_date: string;
  };
}

serve(async (req: Request) => {
  const payload = (await req.json()) as Payload;
  const userId = payload?.record?.user_id;
  const comment = payload?.record?.coach_comment;
  if (!userId || !comment) return new Response("noop", { status: 200 });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: subs } = await sb
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  const logDate = payload?.record?.log_date;
  const linkUrl =
    logDate && logDate.length >= 10
      ? `/today?date=${encodeURIComponent(logDate.slice(0, 10))}`
      : "/today";

  const body = JSON.stringify({
    title: "Ta coach a laissé un commentaire",
    body: comment.slice(0, 140),
    url: linkUrl,
  });

  await Promise.allSettled(
    (subs ?? []).map((s: { endpoint: string; p256dh: string; auth: string }) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      ),
    ),
  );

  await sb.from("notifications").insert({
    user_id: userId,
    type: "coach_comment",
    title: "Ta coach a laissé un commentaire",
    body: comment.slice(0, 140),
    link_url: linkUrl,
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
