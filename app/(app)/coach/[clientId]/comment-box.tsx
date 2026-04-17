"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function CoachCommentBox({
  dailyLogId,
  clientId,
  coachId: _coachId,
  initial,
}: {
  dailyLogId: string;
  clientId: string;
  coachId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

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
    if (!error) {
      await supabase.from("notifications").insert({
        user_id: clientId,
        type: "coach_comment",
        title: "Ta coach a laissé un commentaire",
        body: value.slice(0, 120),
      });
    }
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Commentaire envoyé");
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Laisser un commentaire…"
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
