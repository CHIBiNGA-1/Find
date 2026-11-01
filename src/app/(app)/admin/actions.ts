"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/session";

// Authorization lives in the SQL functions; these only validate input and forward.
export async function reviewMembership(id: string, status: "verified" | "rejected" | "suspended") {
  if (!z.string().uuid().safeParse(id).success) return;
  const { supabase } = await getContext();
  await supabase.rpc("review_membership", { target: id, new_status: status });
  revalidatePath("/admin");
}
export async function moderateReport(id: string, action: "dismiss" | "remove_content" | "suspend_user", form: FormData) {
  if (!z.string().uuid().safeParse(id).success) return;
  const { supabase } = await getContext();
  await supabase.rpc("moderate_report", { p_report: id, p_action: action, p_note: String(form.get("note") ?? "").slice(0, 1000) || null });
  revalidatePath("/admin");
}
