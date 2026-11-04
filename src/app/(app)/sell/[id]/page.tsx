import { notFound } from "next/navigation";
import { ListingForm, type FormImage } from "@/components/listing-form";
import { getContext } from "@/lib/session";
import { signedUrls } from "@/lib/listings/queries";
import { minorToInput } from "@/lib/money";
import type { Category } from "@/lib/categories";

export const metadata = { title: "Edit listing" };

export default async function EditListing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, currency } = await getContext();
  const { data: l } = await supabase.from("listings").select("*").eq("id", id).eq("seller_id", userId).maybeSingle();
  if (!l || l.status === "removed") notFound();
  const [{ data: categories }, { data: imgs }] = await Promise.all([
    supabase.from("categories").select("id, slug, name, parent_id"),
    supabase.from("listing_images").select("id, storage_path, width, height").eq("listing_id", id).order("position"),
  ]);
  const urls = await signedUrls((imgs ?? []).map((i) => i.storage_path));
  const images: FormImage[] = (imgs ?? []).map((i) => ({ key: i.id, id: i.id, path: i.storage_path, preview: urls.get(i.storage_path) ?? "", status: "done", w: i.width, h: i.height }));
  return (
    <main>
      <h1 className="t-page mb-6">{l.status === "draft" ? "Finish your listing" : "Edit listing"}</h1>
      <ListingForm categories={(categories ?? []) as Category[]} userId={userId} currency={l.currency_code ?? currency}
        initial={{ id, status: l.status, title: l.title, description: l.description, price: minorToInput(l.price_minor), condition: l.condition, categoryId: l.category_id ?? undefined, campusArea: l.campus_area ?? "", meeting: l.meeting_preferences ?? "", images }} />
    </main>
  );
}
