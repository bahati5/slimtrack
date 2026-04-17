"use client";

import { Suspense, useState } from "react";
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

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/today";
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(error.message);
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
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    toast.success("Lien magique envoyé 📬");
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
      </form>

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
