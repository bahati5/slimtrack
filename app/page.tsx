import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "coach" || profile?.role === "admin") {
    const coachClientId = (await cookies()).get("coach_active_client")?.value;
    if (coachClientId) {
      redirect(`/coach/${coachClientId}`);
    }
    redirect("/coach");
  }
  redirect("/today");
}

