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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function friendlyAuthError(raw: string | undefined, status?: number): string {
  const t = (raw ?? "").toLowerCase();
  if (status === 500 || t.includes("internal server error") || t.includes("500")) {
    return "Erreur serveur (500). Le projet Supabase ou la connexion réseau pose problème, ou le mot de passe du compte ne correspond pas (essaie « Mot de passe oublié »).";
  }
  if (t.includes("invalid login") || t.includes("invalid credentials")) {
    return "Email ou mot de passe incorrect. Tu peux utiliser « Mot de passe oublié » pour recevoir un lien de réinitialisation.";
  }
  return raw ?? "Une erreur est survenue. Réessaie ou demande un lien magique.";
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/today";
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const urlError = params.get("error");
  const urlMessage = params.get("message");

  useEffect(() => {
    if (urlMessage) {
      setError(urlMessage);
      return;
    }
    if (urlError === "auth") {
      setError(
        "Connexion impossible (lien incomplet ou expiré). Demande un nouveau lien magique ou réinitialise ton mot de passe.",
      );
    }
  }, [urlError, urlMessage]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(friendlyAuthError(error.message, (error as { status?: number }).status));
      return;
    }
    toast.success("Connexion réussie !");
    router.push(next);
    router.refresh();
  }

  async function onMagicLink() {
    if (!email) {
      setError("Entre ton email pour recevoir le lien");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const redirect = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirect,
        shouldCreateUser: true,
      },
    });
    setLoading(false);
    if (error) {
      setError(
        friendlyAuthError(error.message, (error as { status?: number }).status) +
          " Vérifie dans Supabase → Authentication → URL Configuration que cette URL est autorisée : " +
          redirect,
      );
      return;
    }
    toast.success("Lien magique envoyé 📬 Vérifie ta boîte mail (et les spams).");
  }

  async function onForgotPassword() {
    if (!email) {
      setError("Entre ton email pour recevoir le lien de réinitialisation");
      return;
    }
    setLoading(true);
    setError(null);
    setResetSent(false);
    const supabase = createClient();
    // Passe par /auth/callback pour l’échange PKCE (code → session), comme le lien magique.
    const afterRecovery = `/auth/update-password?next=${encodeURIComponent(next)}`;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(afterRecovery)}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setLoading(false);
    if (error) {
      setError(
        friendlyAuthError(error.message, (error as { status?: number }).status) +
          " Ajoute dans Supabase → URL Configuration une redirection autorisée vers /auth/callback (ex. http://localhost:3000/auth/callback).",
      );
      return;
    }
    setResetSent(true);
    toast.success("Si un compte existe pour cet email, tu vas recevoir un lien pour choisir un nouveau mot de passe.");
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg shadow-black/40">
          <Heart className="size-6 on-warm" />
        </div>
        <div>
          <CardTitle>Bon retour 👋</CardTitle>
          <CardDescription>Connecte-toi à ton SlimTrack</CardDescription>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="toi@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <FieldError>{error}</FieldError>
        <Button type="submit" block loading={loading}>
          Se connecter
        </Button>
        <Button
          type="button"
          variant="secondary"
          block
          onClick={onMagicLink}
          disabled={loading}
        >
          Envoyer un lien magique
        </Button>
        <button
          type="button"
          className="w-full text-center text-sm font-medium text-[var(--color-primary-soft)] hover:underline"
          onClick={() => {
            setShowForgot((v) => !v);
            setResetSent(false);
            setError(null);
          }}
        >
          Mot de passe oublié ?
        </button>
      </form>

      {showForgot && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-soft)] p-4 text-sm text-[var(--color-text)]">
          <p className="mb-3 text-[var(--color-muted)]">
            Nous t’enverrons un e-mail avec un lien pour définir un nouveau mot
            de passe (le même mécanisme que Supabase « reset password »).
          </p>
          {resetSent ? (
            <p className="text-[var(--color-success)]">
              Demande envoyée. Ouvre l’e-mail et clique sur le lien (vérifie les
              spams).
            </p>
          ) : (
            <Button
              type="button"
              variant="secondary"
              block
              onClick={onForgotPassword}
              loading={loading}
            >
              Recevoir le lien par e-mail
            </Button>
          )}
        </div>
      )}

      <p className="text-center text-sm text-[var(--color-muted)]">
        Pas encore de compte ?{" "}
        <Link
          href="/register"
          className="font-semibold text-[var(--color-primary-soft)] hover:underline"
        >
          Créer un compte
        </Link>
      </p>
    </Card>
  );
}
