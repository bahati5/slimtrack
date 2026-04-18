"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { UserMinus } from "lucide-react";

export function UnlinkClientButton({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function onUnlink() {
    const label = clientName?.trim() || "cette cliente";
    if (
      !confirm(
        `Délier ${label} ? Elle ne sera plus dans ta liste et tu n’auras plus accès à son suivi.`,
      )
    ) {
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("coach_unassign_client", {
      p_client_id: clientId,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cliente déliée");
    if (pathname.startsWith("/coach/") && pathname !== "/coach") {
      router.push("/coach");
    } else {
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      loading={loading}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void onUnlink();
      }}
      className="shrink-0 gap-1 text-[var(--color-muted)] hover:text-[var(--color-accent)]"
      title="Délier cette cliente"
    >
      <UserMinus className="size-4" />
      <span className="hidden text-xs font-medium sm:inline">Délier</span>
    </Button>
  );
}
