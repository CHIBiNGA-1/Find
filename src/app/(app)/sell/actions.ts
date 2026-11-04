"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/session";
import { listingInput } from "@/lib/listings/schema";
import { parseMinor } from "@/lib/money";

const uuid = z.string().uuid();
export type SaveResult = { id?: string; fieldErrors?: Record<string, string[]>; message?: string };

export async function saveListing(id: string | null, raw: Record<string, string>): Promise<SaveResult> {
  const parsed = listingInput.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  if (id !== null && !uuid.safeParse(id).success) return { message: "That listing can't be found." };
  const { supabase, userId, universityId, currency } = await getContext();
  const v = parsed.data;
  const row = {
    title: v.title, description: v.description, price_minor: parseMinor(v.price)!, condition: v.condition, category_id: v.categoryId,
    meeting_preferences: v.meetingPreferences || null, campus_area: v.campusArea || null,
  };
  if (id) {
    // .select() so that "no row matched" (not yours, or removed) is an error, not a silent success.
    const { data, error } = await supabase.from("listings").update(row).eq("id", id).eq("seller_id", userId).select("id");
    if (error || !data?.length) return { message: "We couldn't save your changes. Try again." };
    revalidatePath(`/listing/${id}`);
    return { id };
  }
  const { data, error } = await supabase.from("listings").insert({ ...row, seller_id: userId, university_id: universityId, currency_code: currency, status: "draft" }).select("id").single();
  if (error || !data) return { message: "We couldn't save your draft. Try again." };
  return { id: data.id };
}

/** Positions are assigned by the database in one atomic step, so parallel or repeated uploads can't collide. */
export async function registerImage(listingId: string, path: string, width: number, height: number): Promise<{ id?: string; error?: "invalid" | "limit" | "failed" }> {
  const { supabase, userId } = await getContext();
  const ok = uuid.safeParse(listingId).success && path.startsWith(`${userId}/${listingId}/`) && Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0;
  if (!ok) return { error: "invalid" };
  const { data, error } = await supabase.rpc("register_listing_image", { p_listing: listingId, p_path: path, p_width: width, p_height: height });
  if (error) return { error: error.message.includes("too_many_images") ? "limit" : "failed" };
  return { id: data as string };
}

export async function reorderImages(listingId: string, ids: string[]): Promise<{ ok: boolean }> {
  // Cheap bound before schema validation: client-supplied arrays never reach zod unbounded.
  if (!Array.isArray(ids) || ids.length > 8) return { ok: false };
  if (!uuid.safeParse(listingId).success || !z.array(uuid).max(8).safeParse(ids).success) return { ok: false };
  const { supabase } = await getContext();
  const { error } = await supabase.rpc("reorder_listing_images", { p_listing: listingId, p_ids: ids });
  return { ok: !error };
}

export async function removeImage(imageId: string): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(imageId).success) return { ok: false };
  const { supabase } = await getContext();
  const { data, error } = await supabase.from("listing_images").delete().eq("id", imageId).select("storage_path").maybeSingle();
  if (error) return { ok: false };
  if (data) await supabase.storage.from("listing-images").remove([data.storage_path]);
  return { ok: true };
}

export async function publishListing(id: string): Promise<{ ok?: true; message?: string }> {
  if (!uuid.safeParse(id).success) return { message: "That listing can't be found." };
  const { supabase, userId } = await getContext();
  const { count } = await supabase.from("listing_images").select("id", { count: "exact", head: true }).eq("listing_id", id);
  if (!count) return { message: "Add at least one photo before publishing." };
  const { data, error } = await supabase.from("listings").update({ status: "active" }).eq("id", id).eq("seller_id", userId).eq("status", "draft").select("id");
  if (error || !data?.length) return { message: "We couldn't publish this listing. Try again." };
  revalidatePath("/"); revalidatePath("/explore"); revalidatePath("/you");
  return { ok: true };
}

export async function setListingStatus(id: string, status: "archived" | "active"): Promise<void> {
  if (!uuid.safeParse(id).success) return;
  const { supabase, userId } = await getContext();
  await supabase.from("listings").update({ status }).eq("id", id).eq("seller_id", userId).in("status", status === "archived" ? ["active"] : ["archived"]);
  revalidatePath("/you"); revalidatePath(`/listing/${id}`); revalidatePath("/explore"); revalidatePath("/");
}

export async function deleteDraft(id: string): Promise<void> {
  if (!uuid.safeParse(id).success) return;
  const { supabase, userId } = await getContext();
  const { data: imgs } = await supabase.from("listing_images").select("storage_path").eq("listing_id", id);
  const { data } = await supabase.from("listings").delete().eq("id", id).eq("seller_id", userId).eq("status", "draft").select("id");
  if (data?.length && imgs?.length) await supabase.storage.from("listing-images").remove(imgs.map((i) => i.storage_path));
  revalidatePath("/you");
}

export async function toggleSaved(listingId: string, save: boolean): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(listingId).success) return { ok: false };
  const { supabase, userId } = await getContext();
  const { error } = save
    ? await supabase.from("saved_listings").upsert({ user_id: userId, listing_id: listingId })
    : await supabase.from("saved_listings").delete().eq("user_id", userId).eq("listing_id", listingId);
  if (!error) revalidatePath("/you");
  return { ok: !error };
}
