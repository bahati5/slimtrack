"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function DeleteMealButton({
  mealId,
  afterDeleteHref,
}: {
  mealId: string;
  /** Ex. `/today?date=…` */
  afterDeleteHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (
      !confirm(
        "Supprimer définitivement ce repas et ses ingrédients ? Cette action est irréversible.",
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
      .from("meals")
      .delete()
      .eq("id", mealId)
      .eq("user_id", user.id);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Repas supprimé");
    router.push(afterDeleteHref);
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-[var(--color-muted)] hover:text-[var(--color-accent)]"
      loading={loading}
      onClick={onDelete}>
      Supprimer
    </Button>
  );
}
