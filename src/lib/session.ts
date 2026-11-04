import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Current user plus their verified university. Redirects when either is missing. */
export const getContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data } = await supabase.from("university_memberships")
    .select("university_id, role, universities(name, currency_code, timezone)").eq("status", "verified").limit(1).maybeSingle();
  if (!data) redirect("/onboarding");
  const uni = data.universities as unknown as { name: string; currency_code: string; timezone: string } | null;
  return {
    supabase, userId: user.id, universityId: data.university_id as string,
    currency: uni?.currency_code ?? "ZMW", timezone: uni?.timezone ?? "Africa/Lusaka", universityName: uni?.name ?? "Campus",
    isModerator: data.role === "moderator" || data.role === "admin",
  };
});
