/** Premier prénom / mot du nom affiché (ex. « Marie Dupont » → « Marie »). */
export function firstName(fullName: string | null | undefined): string | null {
  const n = fullName?.trim();
  if (!n) return null;
  return n.split(/\s+/)[0] ?? null;
}

export function formatKcal(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(value).toLocaleString("fr-FR")} kcal`;
}

export function formatNumber(value: number | null | undefined, digits = 0) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Fuseau par défaut aligné sur la colonne `profiles.timezone` (migration). */
const DEFAULT_TZ = "Africa/Libreville";

export function todayIso(tz?: string | null) {
  // YYYY-MM-DD dans la TZ utilisateur — IANA explicite pour éviter que serveur
  // (Node) et client divergent quand `timezone` est NULL.
  const zone = tz || DEFAULT_TZ;
  const d = new Date();
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: zone,
  };
  return new Intl.DateTimeFormat("fr-CA", opts).format(d);
}

/** Retour à la vue « Aujourd’hui » en conservant le jour sélectionné (`?date=`). */
export function todayHrefAfterLog(selectedDate: string): string {
  const today = todayIso();
  if (selectedDate === today) return "/today";
  return `/today?date=${encodeURIComponent(selectedDate)}`;
}
