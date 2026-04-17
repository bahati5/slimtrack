"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { UserPlus } from "lucide-react";

export function ClaimClientForm() {
  const router = useRouter();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 8) {
      toast.warning("Le code doit contenir 8 caractères");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("coach_claim_client", {
      p_code: trimmed,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      `Cliente affiliée : ${data?.full_name ?? "(sans nom)"} 🎉`,
    );
    setCode("");
    router.refresh();
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-primary">
          <UserPlus className="size-5 on-warm" />
        </div>
        <div>
          <CardTitle>Affilier une cliente</CardTitle>
          <CardDescription>
            Demande-lui son code d&apos;invitation (8 caractères) et entre-le ici.
          </CardDescription>
        </div>
      </div>
      <form onSubmit={submit} className="flex items-center gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Ex. A7B2C9Q4"
          maxLength={8}
          className="flex-1 font-mono tracking-[0.3em] uppercase"
          autoCapitalize="characters"
          autoComplete="off"
        />
        <Button type="submit" loading={loading}>
          Affilier
        </Button>
      </form>
    </Card>
  );
}
