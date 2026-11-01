import { getContext } from "@/lib/session";

export type ListingRow = {
  id: string; title: string; price_minor: number; currency_code: string; condition: string;
  status: string; published_at: string | null; seller_id: string; description: string;
  meeting_preferences: string | null; category_id: string | null;
};

/** Signed URLs for first/all images. Private bucket: URLs expire, so never persist them. */
export async function signedUrls(paths: string[], bucket = "listing-images") {
  if (!paths.length) return new Map<string, string>();
  const { supabase } = await getContext();
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 3600);
  return new Map((data ?? []).filter((d) => d.path && d.signedUrl).map((d) => [d.path as string, d.signedUrl]));
}

export async function coverImages(ids: string[]) {
  if (!ids.length) return new Map<string, { url: string; w: number; h: number }>();
  const { supabase } = await getContext();
  const { data } = await supabase.from("listing_images").select("listing_id, storage_path, width, height")
    .in("listing_id", ids).eq("position", 0);
  const urls = await signedUrls((data ?? []).map((d) => d.storage_path));
  return new Map((data ?? []).flatMap((d) => {
    const url = urls.get(d.storage_path);
    return url ? [[d.listing_id as string, { url, w: d.width as number, h: d.height as number }] as const] : [];
  }));
}
