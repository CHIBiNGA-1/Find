import { RequestForm } from "@/components/request-form";
import { getContext } from "@/lib/session";

export const metadata = { title: "Post a request" };

export default async function NewRequest() {
  const { supabase } = await getContext();
  const { data } = await supabase.from("categories").select("id, name").order("name");
  return <main><h1 className="mb-6 t-page">Post a request</h1><RequestForm categories={data ?? []} /></main>;
}
