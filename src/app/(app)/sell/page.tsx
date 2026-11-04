import { ListingForm } from "@/components/listing-form";
import { getContext } from "@/lib/session";
import type { Category } from "@/lib/categories";

export const metadata = { title: "Sell" };

export default async function Sell() {
  const { supabase, userId, currency } = await getContext();
  const [{ data: categories }, { data: drafts }] = await Promise.all([
    supabase.from("categories").select("id, slug, name, parent_id"),
    supabase.from("listings").select("id, title").eq("seller_id", userId).eq("status", "draft").order("updated_at", { ascending: false }).limit(3),
  ]);
  return (
    <main>
      <h1 className="t-page mb-6">Sell</h1>
      {drafts && drafts.length > 0 && (
        <p className="note mb-8">Unfinished: {drafts.map((d, i) => <span key={d.id}>{i > 0 && ", "}<a className="link" href={`/sell/${d.id}`}>{d.title}</a></span>)}</p>)}
      <ListingForm categories={(categories ?? []) as Category[]} userId={userId} currency={currency} />
    </main>
  );
}
