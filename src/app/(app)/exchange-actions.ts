"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/session";

const uuid = z.string().uuid();

export async function markSold(listingId: string, form: FormData) {
  const { supabase, userId } = await getContext();
  const conv = String(form.get("conversationId") ?? "");
  if (conv && conv !== "elsewhere") {
    const { error } = await supabase.rpc("record_exchange", { p_listing: listingId, p_conv: conv });
    if (error) redirect(`/listing/${listingId}/sold?error=1`);
  } else {
    await supabase.from("listings").update({ status: "sold" }).eq("id", listingId).eq("seller_id", userId).eq("status", "active");
  }
  revalidatePath("/you"); revalidatePath(`/listing/${listingId}`);
  redirect("/you");
}

export async function confirmExchange(id: string, accept: boolean) {
  if (!uuid.safeParse(id).success) return;
  const { supabase } = await getContext();
  await supabase.rpc("confirm_exchange", { p_ex: id, p_accept: accept });
  revalidatePath("/you");
}

export type ReviewState = { message?: string };
export async function submitReview(exchangeId: string, _: ReviewState, form: FormData): Promise<ReviewState> {
  const p = z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().max(1000) })
    .safeParse({ rating: form.get("rating"), comment: form.get("comment") ?? "" });
  if (!p.success) return { message: "Choose a rating from 1 to 5." };
  const { supabase } = await getContext();
  const { error } = await supabase.rpc("submit_review", { p_ex: exchangeId, p_rating: p.data.rating, p_comment: p.data.comment });
  if (error) return { message: error.message.includes("already_reviewed") ? "You've already reviewed this exchange." : "We couldn't save your review. Try again." };
  revalidatePath("/you");
  redirect("/you");
}
