import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Squelette générique pour la zone principale sous la barre du haut (max-w-lg). */
export function AppPageSkeleton() {
  return (
    <div
      className="space-y-4 p-5 pb-28"
      aria-busy="true"
      aria-label="Chargement de la page">
      <header className="space-y-3">
        <Skeleton className="h-8 w-44 rounded-2xl" />
        <Skeleton className="h-4 w-full max-w-[min(20rem,85vw)]" />
      </header>
      <Skeleton className="h-52 w-full rounded-3xl" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/**
 * Bloc jour (anneau + repas + activités) — utilisé sur la vue Aujourd’hui
 * pendant le fetch client ou la vue coach en lecture seule.
 */
export function TodayContentSkeleton() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-label="Chargement des données">
      <Card className="flex flex-col items-center gap-4 py-8">
        <div className="aspect-square w-[min(18rem,80vw)] max-h-72 animate-pulse rounded-full bg-[var(--color-card-soft)]" />
        <div className="grid w-full grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-[var(--color-card-soft)]"
            />
          ))}
        </div>
        <div className="mx-auto h-4 w-48 animate-pulse rounded bg-[var(--color-card-soft)]" />
      </Card>
      <section className="space-y-2">
        <div className="h-5 w-16 animate-pulse rounded bg-[var(--color-card-soft)]" />
        <div className="h-20 animate-pulse rounded-2xl bg-[var(--color-card-soft)]" />
        <div className="h-20 animate-pulse rounded-2xl bg-[var(--color-card-soft)]" />
      </section>
      <section className="space-y-2">
        <div className="h-5 w-24 animate-pulse rounded bg-[var(--color-card-soft)]" />
        <div className="h-20 animate-pulse rounded-2xl bg-[var(--color-card-soft)]" />
      </section>
    </div>
  );
}

/** Liste type fiche (notifications, aliments). */
export function ListPageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="space-y-2" aria-busy="true" aria-label="Chargement de la liste">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i}>
          <Skeleton className="h-[4.5rem] w-full rounded-2xl" />
        </li>
      ))}
    </ul>
  );
}

/** Pages login / mot de passe (même grille que les layouts auth). */
export function AuthPageSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-10"
      aria-busy="true"
      aria-label="Chargement">
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-9 w-48 rounded-2xl" />
        <Skeleton className="mx-auto h-4 w-64 max-w-full" />
      </div>
      <div className="space-y-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/** Formulaire long (repas, activité, profil). */
export function FormPageSkeleton() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-label="Chargement du formulaire">
      <Skeleton className="h-36 w-full rounded-3xl" />
      <Skeleton className="h-48 w-full rounded-3xl" />
      <Skeleton className="h-32 w-full rounded-3xl" />
      <Skeleton className="mx-auto h-14 w-full max-w-sm rounded-2xl" />
    </div>
  );
}
