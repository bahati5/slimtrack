"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Users, CheckCircle2 } from "lucide-react";

export function CoachModeCard({ currentRole }: { currentRole: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  if (currentRole === "coach" || currentRole === "admin") {
    return (
      <Card className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-[#4f2b1f]">
          <CheckCircle2 className="size-5 on-warm" />
        </div>
        <div>
          <CardTitle>Mode coaching activé</CardTitle>
          <CardDescription>
            Tu peux affilier des clientes depuis l&apos;onglet Clientes.
          </CardDescription>
        </div>
      </Card>
    );
  }

  async function enable() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("become_coach");
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Mode coaching activé");
    router.refresh();
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-[#4f2b1f]">
          <Users className="size-5 on-warm" />
        </div>
        <div>
          <CardTitle>Devenir coach</CardTitle>
          <CardDescription>
            Active le mode coaching pour suivre tes clientes en plus de toi.
          </CardDescription>
        </div>
      </div>
      <Button onClick={enable} loading={loading} block>
        Activer le mode coaching
      </Button>
    </Card>
  );
}
