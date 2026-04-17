import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 : le fichier `middleware.ts` a été renommé en `proxy.ts`.
// L'API reste la même — on garde aussi la fonction `updateSession` dans
// `lib/supabase/middleware.ts` par souci de cohérence avec les guides Supabase.
export async function proxy(request: NextRequest) {
  // `x-pathname` est injecté sur la requête dans `updateSession` (pas sur la réponse)
  // pour que les Server Components puissent le lire via `headers()`.
  return updateSession(request);
}

export const config = {
  matcher: [
    // Exclut les assets Next, images, favicon, manifest et service worker
    "/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.png$|.*\\.svg$|.*\\.webmanifest$|sw.js).*)",
  ],
};
