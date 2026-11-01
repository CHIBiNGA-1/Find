import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Current user plus their verified university. Redirects when either is missing. */
export const getContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data } = await supabase.from("university_memberships")
    .select("university_id, universities(currency_code)").eq("status", "verified").limit(1).maybeSingle();
  if (!data) redirect("/onboarding");
  const currency = (data.universities as unknown as { currency_code: string } | null)?.currency_code ?? "ZMW";
  return { supabase, userId: user.id, universityId: data.university_id as string, currency };
});
