"use client";

import { useEffect, useState } from "react";
import { Download, Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushSubscription, subscribeForPush } from "@/lib/hooks/use-push-subscription";

type Step = "install" | "notify" | null;

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

    // Si déjà installé mais notifs pas accordées, montrer le prompt notif directement
    if (isStandalone && !notifGranted) {
      const t = setTimeout(() => setStep("notify"), 3000);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        clearTimeout(t);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
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
          aria-label="Fermer"
        >
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
                  Reçois les commentaires de ta coach en temps réel
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
