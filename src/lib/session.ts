import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Current user plus their verified, open university. Redirects when either is missing. */
export const getContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data } = await supabase.from("university_memberships")
    .select("university_id, role, universities!inner(name, currency_code, timezone, status)")
    .eq("status", "verified").neq("universities.status", "closed").limit(1).maybeSingle();
  if (!data) {
    // A verified membership that only exists at a closed university sends people to a clear explanation, not a loop.
    const { count } = await supabase.from("university_memberships").select("id", { count: "exact", head: true }).eq("status", "verified");
    redirect(count ? "/closed" : "/onboarding");
  }
  const uni = data.universities as unknown as { name: string; currency_code: string; timezone: string; status: string } | null;
  if (uni?.status === "probation") {
    // Lazily promotes a university that reached its target, or closes one whose founding period ran out.
    const { data: state } = await supabase.rpc("evaluate_university", { p_uni: data.university_id });
    if (state === "closed") redirect("/closed");
  }
  return {
    supabase, userId: user.id, universityId: data.university_id as string,
    currency: uni?.currency_code ?? "ZMW", timezone: uni?.timezone ?? "Africa/Lusaka", universityName: uni?.name ?? "Campus",
    isModerator: data.role === "moderator" || data.role === "admin",
  };
});
