import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback OAuth / Magic-link : échange le `code` contre une session
 * Supabase puis redirige vers `next` (ou /today).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/today";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    const msg =
      error.message ||
      "Échec de la connexion (échange du code). Vérifie les URL de redirection dans Supabase.";
    return NextResponse.redirect(
      `${origin}/login?error=callback&message=${encodeURIComponent(msg)}`,
    );
  }
  return NextResponse.redirect(
    `${origin}/login?error=auth&message=${encodeURIComponent("Lien incomplet ou expiré. Demande un nouveau lien magique.")}`,
  );
}
