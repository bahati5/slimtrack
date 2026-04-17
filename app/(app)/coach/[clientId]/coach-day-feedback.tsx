"use client";

import { useState } from "react";
import { CoachCommentBox } from "./comment-box";
import { cn } from "@/lib/utils/cn";

export function CoachDayFeedback({
  dailyLogId,
  clientId,
  coachId,
  initialComment,
}: {
  dailyLogId: string;
  clientId: string;
  coachId: string;
  initialComment: string;
}) {
  const [mode, setMode] = useState<"day" | "meal">("day");

  return (
    <div className="space-y-3">
      <div className="flex rounded-full bg-[var(--color-card-soft)] p-1 text-xs font-medium text-[var(--color-text)]">
        <button
          type="button"
          className={cn(
            "flex-1 rounded-full py-2 transition",
            mode === "day" && "bg-[var(--color-card)] shadow-sm",
          )}
          onClick={() => setMode("day")}
        >
          Commentaire du jour
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 rounded-full py-2 transition",
            mode === "meal" && "bg-[var(--color-card)] shadow-sm",
          )}
          onClick={() => setMode("meal")}
        >
          Par repas
        </button>
      </div>

      {mode === "day" ? (
        <CoachCommentBox
          dailyLogId={dailyLogId}
          clientId={clientId}
          coachId={coachId}
          initial={initialComment}
        />
      ) : (
        <p className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)]/40 p-3 text-center text-xs text-[var(--color-muted)]">
          Touche un repas dans la liste ci-dessus pour ouvrir sa fiche et le fil
          de discussion dédié à ce repas.
        </p>
      )}
    </div>
  );
}
