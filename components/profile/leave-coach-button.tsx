"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { UserMinus } from "lucide-react";

export function LeaveCoachButton({ coachName }: { coachName: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function onLeave() {
    const label = coachName?.trim() || "ton coach";
    if (
      !confirm(
        `Mettre fin au suivi avec ${label} ? Tu pourras te réaffilier plus tard avec un nouveau code.`,
      )
    ) {
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ coach_id: null })
      .eq("id", user.id);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Affiliation retirée");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="secondary"
      loading={loading}
      onClick={() => void onLeave()}
      className="w-full border-[var(--color-border)]"
    >
      <UserMinus className="size-4" />
      Retirer l&apos;affiliation
      {coachName?.trim() ? ` (${coachName.trim()})` : ""}
    </Button>
  );
}
