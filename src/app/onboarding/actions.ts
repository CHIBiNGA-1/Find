"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function requestMembership(form: FormData) {
  const id = z.string().uuid().safeParse(form.get("universityId"));
  if (!id.success) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  // RLS pins user_id, role='student' and status='pending'. A duplicate request is a harmless no-op.
  await supabase.from("university_memberships").insert({ user_id: user.id, university_id: id.data });
  revalidatePath("/onboarding");
}
