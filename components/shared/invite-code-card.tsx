"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Copy, RefreshCw, Check, KeyRound } from "lucide-react";

export function InviteCodeCard({
  initialCode,
  coachName,
}: {
  initialCode: string | null;
  coachName: string | null;
}) {
  const toast = useToast();
  const [code, setCode] = useState<string | null>(initialCode);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copié");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Impossible de copier");
    }
  }

  async function rotate() {
    if (
      !confirm(
        coachName
          ? `Générer un nouveau code ? L'ancien ne fonctionnera plus (ton affiliation avec ${coachName} reste inchangée).`
          : "Générer un nouveau code ? L'ancien ne fonctionnera plus (ton affiliation actuelle reste la même).",
      )
    )
      return;
    setRotating(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("rotate_my_invite_code");
    setRotating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCode(data as string);
    toast.success("Nouveau code généré");
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-primary">
          <KeyRound className="size-5 on-warm" />
        </div>
        <div className="flex-1">
          <CardTitle>Mon code d&apos;invitation</CardTitle>
          <CardDescription>
            {coachName
              ? `Coach actuel : ${coachName}`
              : "Partage ce code avec la personne qui te suit pour vous affilier."}
          </CardDescription>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-2xl bg-[var(--color-card-soft)] px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] text-[var(--color-primary-soft)]">
          {code ?? "——————"}
        </code>
        <Button
          variant="secondary"
          size="icon"
          onClick={copy}
          aria-label="Copier">
          {copied ? (
            <Check className="size-5 text-[var(--color-success)]" />
          ) : (
            <Copy className="size-5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={rotate}
          loading={rotating}
          aria-label="Régénérer">
          <RefreshCw className="size-5" />
        </Button>
      </div>
    </Card>
  );
}
