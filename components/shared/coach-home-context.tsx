"use client";

import { createContext, useContext, type ReactNode } from "react";

const CoachHomeContext = createContext<string | null>(null);

export function CoachHomeProvider({
  coachHomeHref,
  children,
}: {
  coachHomeHref: string | null;
  children: ReactNode;
}) {
  return (
    <CoachHomeContext.Provider value={coachHomeHref}>
      {children}
    </CoachHomeContext.Provider>
  );
}

/** Dernière cliente consultée (`/coach/[id]`) — pour les liens « Accueil » / retour. */
export function useCoachHomeHref() {
  return useContext(CoachHomeContext);
}
