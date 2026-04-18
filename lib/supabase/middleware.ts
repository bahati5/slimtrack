import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Rafraîchit la session Supabase à chaque requête et protège les routes privées.
 * Appelée depuis `middleware.ts` à la racine.
 */
function pathnameHeaders(request: NextRequest) {
  const h = new Headers(request.headers);
  h.set("x-pathname", request.nextUrl.pathname);
  return h;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: pathnameHeaders(request) },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: { headers: pathnameHeaders(request) },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: appelle getUser() — vérifie le token auprès du serveur Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isPublic =
    isAuthRoute ||
    pathname === "/" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/youtube-oembed") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/icons") ||
    pathname === "/sw.js";

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/today";
    return NextResponse.redirect(url);
  }

  // Dernière cliente ouverte par le coach — utilisée pour l’accueil / retours.
  const coachClientMatch = pathname.match(
    /^\/coach\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i,
  );
  if (coachClientMatch && user) {
    response.cookies.set("coach_active_client", coachClientMatch[1], {
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  // Route coach: le check fin du rôle est fait dans app/(app)/coach/layout.tsx.
  return response;
}
