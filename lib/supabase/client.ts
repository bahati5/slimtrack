"use client";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase à utiliser DANS les composants `"use client"`.
 *
 * Note : on n'utilise pas le generic `<Database>` tant que les types ne sont
 * pas générés par `pnpm dlx supabase gen types`. Voir `supabase/README.md`.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
