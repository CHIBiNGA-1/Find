import { RequestForm } from "@/components/request-form";
import { getContext } from "@/lib/session";
import { categoryTree, type Category } from "@/lib/categories";

export const metadata = { title: "Post a request" };

export default async function NewRequest() {
  const { supabase, currency } = await getContext();
  const { data } = await supabase.from("categories").select("id, slug, name, parent_id");
  const top = categoryTree((data ?? []) as Category[]).map(({ id, name }) => ({ id, name }));
  return <main><h1 className="mb-6 t-page">Post a request</h1><RequestForm categories={top} currency={currency} /></main>;
}
