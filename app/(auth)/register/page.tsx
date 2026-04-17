"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Heart, User as UserIcon, Users as UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Role = "user" | "coach";

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${location.origin}/auth/callback?next=/onboarding`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    toast.success("Bienvenue ! Vérifie ton email pour confirmer.");
    router.push("/login");
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#4f2b1f] shadow-lg">
          <Heart className="size-6 on-warm" />
        </div>
        <div>
          <CardTitle>Rejoins SlimTrack</CardTitle>
          <CardDescription>
            Commence ton parcours de perte de poids
          </CardDescription>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Je suis…</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRole("user")}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition",
              role === "user"
                ? "border-[#4f2b1f] bg-[#faf0f5]"
                : "border-[var(--color-border)] bg-[var(--color-card)]",
            )}
          >
            <UserIcon className="size-6 text-[#4f2b1f]" />
            <div>
              <div className="text-sm font-semibold">Cliente</div>
              <div className="text-xs text-[var(--color-muted)]">
                Je me suis
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setRole("coach")}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition",
              role === "coach"
                ? "border-[#4f2b1f] bg-[#faf0f5]"
                : "border-[var(--color-border)] bg-[var(--color-card)]",
            )}
          >
            <UsersIcon className="size-6 text-[#4f2b1f]" />
            <div>
              <div className="text-sm font-semibold">Coach</div>
              <div className="text-xs text-[var(--color-muted)]">
                Je coache + me suis
              </div>
            </div>
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Prénom</Label>
          <Input
            id="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Amélie"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <FieldError>{error}</FieldError>
        <Button type="submit" block loading={loading}>
          Créer mon compte
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--color-muted)]">
        Déjà un compte ?{" "}
        <Link
          href="/login"
          className="font-semibold text-[var(--color-primary-soft)] hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </Card>
  );
}
