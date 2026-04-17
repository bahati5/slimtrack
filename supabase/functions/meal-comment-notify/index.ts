/**
 * Supabase Edge Function — meal-comment-notify
 *
 * Déclenchée par trigger après INSERT sur meal_comments.
 * - Si l'auteur est la cliente → notifie son coach.
 * - Si l'auteur est le coach   → notifie la cliente.
 *
 * Déploiement :
 *   pnpm dlx supabase functions deploy meal-comment-notify
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
    id: string;
    meal_id: string;
    author_id: string;
    body: string;
  };
}

serve(async (req: Request) => {
  const payload = (await req.json()) as Payload;
  const { meal_id, author_id, body: commentBody } = payload?.record ?? {};
  if (!meal_id || !author_id || !commentBody) {
    return new Response("noop", { status: 200 });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Récup le repas + propriétaire + coach affilié
  const { data: meal } = await sb
    .from("meals")
    .select("id, user_id, name")
    .eq("id", meal_id)
    .maybeSingle();
  if (!meal) return new Response("no-meal", { status: 200 });

  const mealOwnerId = meal.user_id as string;
  const { data: ownerProfile } = await sb
    .from("profiles")
    .select("coach_id, full_name")
    .eq("id", mealOwnerId)
    .maybeSingle();

  const coachId = ownerProfile?.coach_id as string | null;
  const ownerName = (ownerProfile?.full_name as string | null) ?? "ta cliente";

  // Détermine la cible : si l'auteur est la propriétaire du repas → cible = coach.
  // Sinon (coach commente) → cible = cliente.
  let targetUserId: string | null = null;
  let title = "";
  if (author_id === mealOwnerId) {
    if (!coachId) return new Response("no-coach", { status: 200 });
    targetUserId = coachId;
    title = `${ownerName} a commenté son repas`;
  } else {
    targetUserId = mealOwnerId;
    title = "Ta coach a commenté ton repas";
  }

  const { data: subs } = await sb
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", targetUserId);

  const pushBody = JSON.stringify({
    title,
    body: commentBody.slice(0, 140),
    url: `/meal/${meal_id}`,
  });

  await Promise.allSettled(
    (subs ?? []).map((s: { endpoint: string; p256dh: string; auth: string }) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        pushBody,
      ),
    ),
  );

  await sb.from("notifications").insert({
    user_id: targetUserId,
    type: "meal_comment",
    title,
    body: commentBody.slice(0, 140),
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
