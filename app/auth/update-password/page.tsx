"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Heart } from "lucide-react";

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={null}>
      <UpdatePasswordInner />
    </Suspense>
  );
}

function UpdatePasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const next = params.get("next") ?? "/today";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<"loading" | "ready" | "invalid">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const markReady = () => {
      if (!cancelled) setSessionStatus("ready");
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) markReady();
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markReady();
    });

    const t = window.setTimeout(() => {
      if (!cancelled) {
        setSessionStatus((s) => (s === "loading" ? "invalid" : s));
      }
    }, 12000);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    toast.success("Mot de passe mis à jour !");
    router.push(next);
    router.refresh();
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg shadow-black/40">
          <Heart className="size-6 on-warm" />
        </div>
        <div>
          <CardTitle>Nouveau mot de passe</CardTitle>
          <CardDescription>
            Choisis un mot de passe solide pour ton compte SlimTrack.
          </CardDescription>
        </div>
      </div>

      {sessionStatus === "loading" ? (
        <p className="text-sm text-[var(--color-muted)]">
          Vérification du lien…
        </p>
      ) : sessionStatus === "invalid" ? (
        <p className="text-sm text-[var(--color-warning)]">
          Ce lien est invalide ou expiré. Retourne sur la page de connexion et
          utilise « Mot de passe oublié » pour en recevoir un nouveau par
          e-mail.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="np">Nouveau mot de passe</Label>
            <Input
              id="np"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="npc">Confirmation</Label>
            <Input
              id="npc"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <FieldError>{error}</FieldError>
          <Button type="submit" block loading={loading}>
            Enregistrer
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-[var(--color-muted)]">
        <Link
          href="/login"
          className="font-semibold text-[var(--color-primary-soft)] hover:underline"
        >
          Retour à la connexion
        </Link>
      </p>
    </Card>
  );
}
