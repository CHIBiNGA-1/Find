"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/session";
import { parseMinor } from "@/lib/money";
import { lostFoundInput, requestInput } from "@/lib/campus/schema";

export type CampusState = { fieldErrors?: Record<string, string[]>; message?: string };

export async function createRequest(_: CampusState, form: FormData): Promise<CampusState> {
  const p = requestInput.safeParse(Object.fromEntries(form));
  if (!p.success) return { fieldErrors: p.error.flatten().fieldErrors };
  const { supabase, userId, universityId, currency } = await getContext();
  const v = p.data;
  const { data, error } = await supabase.from("requests").insert({
    author_id: userId, university_id: universityId, title: v.title, description: v.description,
    category_id: v.categoryId || null, budget_minor: v.budget ? parseMinor(v.budget) : null, currency_code: currency,
    expires_at: new Date(Date.now() + Number(v.days) * 86_400_000).toISOString(),
  }).select("id").single();
  if (error || !data) return { message: "We couldn't post your request. Try again." };
  revalidatePath("/requests");
  redirect(`/requests/${data.id}`);
}

export async function setRequestStatus(id: string, status: "fulfilled" | "closed") {
  const { supabase, userId } = await getContext();
  await supabase.from("requests").update({ status }).eq("id", id).eq("author_id", userId);
  revalidatePath("/requests"); revalidatePath(`/requests/${id}`);
}

export async function createLostFound(raw: Record<string, string | null>): Promise<CampusState & { id?: string }> {
  const p = lostFoundInput.safeParse(raw);
  if (!p.success) return { fieldErrors: p.error.flatten().fieldErrors };
  const { supabase, userId, universityId } = await getContext();
  const v = p.data;
  if (v.imagePath && !v.imagePath.startsWith(`${userId}/`)) return { message: "That photo can't be used." };
  const { data, error } = await supabase.from("lost_found_reports").insert({
    reporter_id: userId, university_id: universityId, kind: v.kind, title: v.title, description: v.description,
    area: v.area, occurred_on: v.occurredOn, image_path: v.imagePath,
  }).select("id").single();
  if (error || !data) return { message: "We couldn't save your report. Try again." };
  revalidatePath("/lost-found");
  return { id: data.id };
}

export async function resolveLostFound(id: string) {
  const { supabase, userId } = await getContext();
  await supabase.from("lost_found_reports").update({ status: "resolved" }).eq("id", id).eq("reporter_id", userId);
  revalidatePath("/lost-found"); revalidatePath(`/lost-found/${id}`);
}

export async function startTopicConversation(kind: "request" | "lost_found", id: string) {
  const { supabase } = await getContext();
  const back = kind === "request" ? `/requests/${id}` : `/lost-found/${id}`;
  if (!z.string().uuid().safeParse(id).success) redirect(back);
  const { data, error } = await supabase.rpc("start_topic_conversation", { p_kind: kind, p_id: id });
  if (error || !data) redirect(`${back}?contact=failed`);
  redirect(`/messages/${data}`);
}
