"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseFoundingError } from "@/lib/founding";

export async function requestMembership(form: FormData) {
  const id = z.string().uuid().safeParse(form.get("universityId"));
  if (!id.success) throw new Error("Invalid university ID.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  // RLS pins user_id, role='student' and status='pending'. A duplicate request is a harmless no-op.
  const { error } = await supabase.from("university_memberships").insert({ user_id: user.id, university_id: id.data });
  if (error && error.code !== "23505") throw error;
  revalidatePath("/onboarding");
}

export type FoundState = { message?: string; similar?: { id: string; name: string } };

export async function foundUniversity(_: FoundState, form: FormData): Promise<FoundState> {
  const name = z.string().trim().min(3, "Use at least 3 characters.").max(120, "Keep it under 120 characters.").safeParse(form.get("name"));
  if (!name.success) return { message: name.error.issues[0]?.message };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { error } = await supabase.rpc("found_university", { p_name: name.data, p_confirm_distinct: form.get("confirmDistinct") === "1" });
  if (error) {
    const e = parseFoundingError(error.message);
    if (e.code === "similar" || e.code === "exists") {
      const { data } = await supabase.from("universities").select("id, name").ilike("name", e.code === "exists" ? name.data : (e.name ?? "")).limit(1).maybeSingle();
      if (data) return { similar: data as { id: string; name: string }, message: e.code === "exists" ? "That university is already on f!nd." : undefined };
    }
    return { message: ({
      already_founded: "You've already added a university.", already_member: "You already belong to a university.",
      invalid_name: "Use between 3 and 120 characters.", exists: "That university is already on f!nd.", similar: "That looks like a university already on f!nd.",
      failed: "We couldn't add the university. Try again in a moment.",
    } as const)[e.code] };
  }
  revalidatePath("/", "layout");
  redirect("/");
}
