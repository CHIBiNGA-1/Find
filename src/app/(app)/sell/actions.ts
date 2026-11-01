"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/session";
import { listingInput } from "@/lib/listings/schema";
import { parseMinor } from "@/lib/money";

export type SaveResult = { id?: string; fieldErrors?: Record<string, string[]>; message?: string };

export async function saveListing(id: string | null, raw: Record<string, string>): Promise<SaveResult> {
  const parsed = listingInput.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { supabase, userId, universityId, currency } = await getContext();
  const v = parsed.data;
  const row = {
    title: v.title, description: v.description, price_minor: parseMinor(v.price)!,
    condition: v.condition, category_id: v.categoryId, meeting_preferences: v.meetingPreferences || null,
  };
  if (id) {
    const { error } = await supabase.from("listings").update(row).eq("id", id).eq("seller_id", userId);
    if (error) return { message: "We couldn't save your changes. Try again." };
    return { id };
  }
  const { data, error } = await supabase.from("listings")
    .insert({ ...row, seller_id: userId, university_id: universityId, currency_code: currency, status: "draft" })
    .select("id").single();
  if (error || !data) return { message: "We couldn't save your draft. Try again." };
  return { id: data.id };
}

export async function registerImage(listingId: string, path: string, width: number, height: number, position: number) {
  const { supabase, userId } = await getContext();
  const ok = z.string().uuid().safeParse(listingId).success && path.startsWith(`${userId}/${listingId}/`);
  if (!ok) return { error: "invalid" };
  const { data, error } = await supabase.from("listing_images")
    .insert({ listing_id: listingId, storage_path: path, width, height, position }).select("id").single();
  return error ? { error: "failed" } : { id: data.id as string };
}

export async function removeImage(imageId: string) {
  const { supabase } = await getContext();
  const { data } = await supabase.from("listing_images").delete().eq("id", imageId).select("storage_path").maybeSingle();
  if (data) await supabase.storage.from("listing-images").remove([data.storage_path]);
}

export async function publishListing(id: string): Promise<{ ok?: true; message?: string }> {
  const { supabase, userId } = await getContext();
  const { count } = await supabase.from("listing_images").select("id", { count: "exact", head: true }).eq("listing_id", id);
  if (!count) return { message: "Add at least one photo before publishing." };
  const { error } = await supabase.from("listings").update({ status: "active" }).eq("id", id).eq("seller_id", userId).eq("status", "draft");
  if (error) return { message: "We couldn't publish this listing. Try again." };
  revalidatePath("/"); revalidatePath("/explore");
  return { ok: true };
}

export async function setListingStatus(id: string, status: "sold" | "archived" | "active") {
  const { supabase, userId } = await getContext();
  await supabase.from("listings").update({ status }).eq("id", id).eq("seller_id", userId);
  revalidatePath("/you"); revalidatePath(`/listing/${id}`); revalidatePath("/explore");
}

export async function deleteDraft(id: string) {
  const { supabase, userId } = await getContext();
  const { data: imgs } = await supabase.from("listing_images").select("storage_path").eq("listing_id", id);
  await supabase.from("listings").delete().eq("id", id).eq("seller_id", userId).eq("status", "draft");
  if (imgs?.length) await supabase.storage.from("listing-images").remove(imgs.map((i) => i.storage_path));
  revalidatePath("/you");
}

export async function toggleSaved(listingId: string, save: boolean) {
  const { supabase, userId } = await getContext();
  if (save) await supabase.from("saved_listings").upsert({ user_id: userId, listing_id: listingId });
  else await supabase.from("saved_listings").delete().eq("user_id", userId).eq("listing_id", listingId);
}
