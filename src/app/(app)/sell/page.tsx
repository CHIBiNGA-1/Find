import { ListingForm } from "@/components/listing-form";
import { getContext } from "@/lib/session";

export const metadata = { title: "Create a listing" };

export default async function Sell() {
  const { supabase, userId } = await getContext();
  const { data: categories } = await supabase.from("categories").select("id, name").order("name");
  return (<main><h1 className="mb-6 font-serif text-3xl tracking-tight">Create a listing</h1><ListingForm categories={categories ?? []} userId={userId} /></main>);
}
