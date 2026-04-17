import { createClient } from "@/lib/supabase/server";
import { FoodsView } from "./foods-view";

export const dynamic = "force-dynamic";

export default async function FoodsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return (
    <div className="space-y-4 p-5">
      <header>
        <h1 className="text-2xl font-bold">Base d&apos;aliments</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Recherche, modifie ou ajoute tes propres aliments.
        </p>
      </header>
      <FoodsView userId={user.id} />
    </div>
  );
}
