"use client";

import { useEffect, useState } from "react";
import { Download, Bell, X, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { firstName } from "@/lib/utils/format";
import {
  usePushSubscription,
  subscribeForPush,
} from "@/lib/hooks/use-push-subscription";

type Step = "install" | "install-ios" | "notify" | null;

function detectIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  // iPhone/iPad/iPod — inclut iPadOS 13+ qui se prétend Mac mais a du touch
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (/macintosh/i.test(ua) && "ontouchend" in document)
  );
}

function detectIosSafari(): boolean {
  if (!detectIos()) return false;
  const ua = window.navigator.userAgent;
  // Exclure les navigateurs tiers sur iOS (Chrome=CriOS, Firefox=FxiOS, Edge=EdgiOS)
  // qui ne peuvent pas installer la PWA — seul Safari iOS le peut.
  return !/crios|fxios|edgios|opios/i.test(ua);
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "pwa-prompt-dismissed";

export function PwaPrompt() {
  usePushSubscription();
  const [step, setStep] = useState<Step>(null);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [coachNotifyName, setCoachNotifyName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("coach_id")
        .eq("id", user.id)
        .maybeSingle();
      const cid = (p as { coach_id?: string | null } | null)?.coach_id ?? null;
      if (!cid) return;
      const { data: c } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", cid)
        .maybeSingle();
      const fn = firstName((c?.full_name as string | null) ?? undefined);
      if (fn) setCoachNotifyName(fn);
    })();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator &&
        (window.navigator as { standalone?: boolean }).standalone === true);

    const notifGranted =
      "Notification" in window && Notification.permission === "granted";

    if (isStandalone && notifGranted) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isStandalone) setStep("install");
      else if (!notifGranted) setStep("notify");
    };

    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari ne fire jamais beforeinstallprompt → on affiche nos propres
    // instructions (Partager → Sur l'écran d'accueil) après un petit délai.
    const iosSafari = detectIosSafari();
    let iosTimer: ReturnType<typeof setTimeout> | null = null;
    if (!isStandalone && iosSafari) {
      iosTimer = setTimeout(() => setStep("install-ios"), 2500);
    }

    // Si déjà installé mais notifs pas accordées, montrer le prompt notif directement
    let notifTimer: ReturnType<typeof setTimeout> | null = null;
    if (isStandalone && !notifGranted) {
      notifTimer = setTimeout(() => setStep("notify"), 3000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (iosTimer) clearTimeout(iosTimer);
      if (notifTimer) clearTimeout(notifTimer);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setStep(null);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      // Après install, vérifier si notifs nécessaires
      if ("Notification" in window && Notification.permission !== "granted") {
        setStep("notify");
      } else {
        dismiss();
      }
    }
  }

  async function requestNotify() {
    if (!("Notification" in window)) {
      dismiss();
      return;
    }
    const result = await Notification.requestPermission();
    if (result === "granted") {
      await subscribeForPush();
    }
    dismiss();
  }

  if (!step) return null;

  return (
    <div className="fixed bottom-28 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-fade-in-up">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-2xl">
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-lg p-1 text-[var(--color-muted)] hover:text-[var(--color-text)]"
          aria-label="Fermer">
          <X className="size-4" />
        </button>

        {step === "install" && (
          <>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-primary">
                <Download className="size-5 on-warm" />
              </div>
              <div>
                <p className="font-semibold text-[var(--color-text)]">
                  Installer SlimTrack
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  Accède plus vite depuis ton écran d'accueil
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" block onClick={install}>
                Installer
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Plus tard
              </Button>
            </div>
          </>
        )}

        {step === "install-ios" && (
          <>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-primary">
                <Download className="size-5 on-warm" />
              </div>
              <div>
                <p className="font-semibold text-[var(--color-text)]">
                  Installer SlimTrack
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  Ajoute l&apos;app à ton écran d&apos;accueil
                </p>
              </div>
            </div>
            <ol className="mb-3 space-y-2 text-sm text-[var(--color-text)]">
              <li className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-[var(--color-card-soft)] text-xs font-bold">
                  1
                </span>
                <span className="flex items-center gap-1">
                  Appuie sur
                  <Share className="size-4 text-[var(--color-primary-soft)]" />
                  <span className="font-medium">Partager</span>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-[var(--color-card-soft)] text-xs font-bold">
                  2
                </span>
                <span className="flex items-center gap-1">
                  Puis
                  <Plus className="size-4 text-[var(--color-primary-soft)]" />
                  <span className="font-medium">
                    Sur l&apos;écran d&apos;accueil
                  </span>
                </span>
              </li>
            </ol>
            <Button size="sm" variant="ghost" block onClick={dismiss}>
              J&apos;ai compris
            </Button>
          </>
        )}

        {step === "notify" && (
          <>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-primary">
                <Bell className="size-5 on-warm" />
              </div>
              <div>
                <p className="font-semibold text-[var(--color-text)]">
                  Activer les notifications
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  {coachNotifyName
                    ? `Reçois les commentaires de ${coachNotifyName} en temps réel`
                    : "Reçois les commentaires sur ton suivi en temps réel"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" block onClick={requestNotify}>
                Activer
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Non merci
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
