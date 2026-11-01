"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/session";

export async function startConversation(listingId: string) {
  const { supabase } = await getContext();
  const { data, error } = await supabase.rpc("start_conversation", { p_listing: listingId });
  if (error || !data) redirect(`/listing/${listingId}?contact=failed`);
  redirect(`/messages/${data}`);
}

const sendSchema = z.object({ conversationId: z.string().uuid(), clientId: z.string().uuid(), body: z.string().trim().max(2000), imagePath: z.string().nullable() });
export type SendResult = { ok: true } | { ok: false; code: "invalid" | "rate_limited" | "failed" };

export async function sendMessage(input: z.infer<typeof sendSchema>): Promise<SendResult> {
  const p = sendSchema.safeParse(input);
  const { supabase, userId } = await getContext();
  if (!p.success || (!p.data.body && !p.data.imagePath)) return { ok: false, code: "invalid" };
  const { conversationId, clientId, body, imagePath } = p.data;
  if (imagePath && !imagePath.startsWith(`${conversationId}/${userId}/`)) return { ok: false, code: "invalid" };
  const { error } = await supabase.from("messages")
    .insert({ conversation_id: conversationId, sender_id: userId, client_id: clientId, body, image_path: imagePath });
  if (!error || error.code === "23505") return { ok: true };           // 23505: this retry already landed
  if (error.message.includes("rate_limited")) return { ok: false, code: "rate_limited" };
  return { ok: false, code: "failed" };
}

export async function markRead(conversationId: string) {
  const { supabase } = await getContext();
  await supabase.rpc("mark_read", { p_conv: conversationId });
}

export async function blockUser(userId: string, conversationId: string) {
  const { supabase, userId: me } = await getContext();
  if (z.string().uuid().safeParse(userId).success && userId !== me) await supabase.from("blocks").upsert({ blocker_id: me, blocked_id: userId });
  revalidatePath(`/messages/${conversationId}`);
}
export async function unblockUser(userId: string, conversationId: string) {
  const { supabase, userId: me } = await getContext();
  await supabase.from("blocks").delete().eq("blocker_id", me).eq("blocked_id", userId);
  revalidatePath(`/messages/${conversationId}`);
}

export async function reportContent(type: "listing" | "message" | "user" | "request" | "lost_found" | "review", targetId: string, reason: string, details: string) {
  const ok = z.object({ t: z.enum(["listing", "message", "user", "request", "lost_found", "review"]), id: z.string().uuid(), r: z.enum(["spam", "scam", "prohibited", "harassment", "other"]), d: z.string().max(1000) })
    .safeParse({ t: type, id: targetId, r: reason, d: details });
  if (!ok.success) return { ok: false as const };
  const { supabase } = await getContext();
  const { error } = await supabase.rpc("submit_report", { p_type: type, p_target: targetId, p_reason: reason, p_details: details });
  return { ok: !error };
}
