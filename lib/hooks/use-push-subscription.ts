"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function subscribeForPush() {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    Notification.permission !== "granted"
  )
    return;

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    await saveSubscription(existing);
    return;
  }
  if (!VAPID_PUBLIC_KEY) return;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  await saveSubscription(sub);
}

export function usePushSubscription() {
  useEffect(() => {
    subscribeForPush().catch(console.error);
  }, []);
}

async function saveSubscription(sub: PushSubscription) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const json = sub.toJSON();
  const keys = json.keys as { p256dh: string; auth: string } | undefined;
  if (!json.endpoint || !keys?.p256dh || !keys?.auth) return;

  await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: "endpoint" },
  );
}
