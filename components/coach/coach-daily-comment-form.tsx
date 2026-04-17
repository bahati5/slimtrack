"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function CoachDailyCommentForm({
  dailyLogId,
  clientId: _clientId,
  coachId: _coachId,
  initial,
  invalidateQueryKey,
}: {
  dailyLogId: string;
  clientId: string;
  coachId: string;
  initial: string;
  invalidateQueryKey: readonly unknown[];
}) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const qc = useQueryClient();

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("daily_logs")
      .update({
        coach_comment: value || null,
        coach_commented_at: value ? new Date().toISOString() : null,
      })
      .eq("id", dailyLogId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Commentaire envoyé");
    void qc.invalidateQueries({ queryKey: [...invalidateQueryKey] });
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Commentaire pour ce jour (visible par ta cliente)…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        size="sm"
        variant="secondary"
        onClick={save}
        loading={saving}
        block
      >
        Envoyer
      </Button>
    </div>
  );
}
