import { notFound } from "next/navigation";
import { ListingForm } from "@/components/listing-form";
import { getContext } from "@/lib/session";
import { signedUrls } from "@/lib/listings/queries";

export const metadata = { title: "Edit listing" };

export default async function EditListing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await getContext();
  const { data: l } = await supabase.from("listings").select("*").eq("id", id).eq("seller_id", userId).maybeSingle();
  if (!l || l.status === "removed") notFound();
  const [{ data: categories }, { data: imgs }] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("listing_images").select("id, storage_path, width, height").eq("listing_id", id).order("position"),
  ]);
  const urls = await signedUrls((imgs ?? []).map((i) => i.storage_path));
  const images = (imgs ?? []).map((i) => ({ key: i.id, id: i.id, path: i.storage_path, preview: urls.get(i.storage_path) ?? "", status: "done" as const, w: i.width, h: i.height }));
  return (<main><h1 className="mb-6 font-serif text-3xl tracking-tight">Edit listing</h1>
    <ListingForm categories={categories ?? []} userId={userId} initial={{ id, title: l.title, description: l.description, price: (l.price_minor / 100).toFixed(2), condition: l.condition, categoryId: l.category_id ?? undefined, meeting: l.meeting_preferences ?? "", images }} /></main>);
}
