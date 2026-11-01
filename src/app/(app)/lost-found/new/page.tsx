import { LostFoundForm } from "@/components/lost-found-form";
import { getContext } from "@/lib/session";

export const metadata = { title: "Report an item" };
export default async function NewLostFound() {
  const { userId } = await getContext();
  return <main><h1 className="mb-6 font-serif text-3xl tracking-tight">Report an item</h1><LostFoundForm userId={userId} /></main>;
}
