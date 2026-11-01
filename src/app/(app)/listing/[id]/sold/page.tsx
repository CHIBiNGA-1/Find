import { notFound } from "next/navigation";
import { getContext } from "@/lib/session";
import { markSold } from "../../../exchange-actions";

export const metadata = { title: "Mark as sold" };

export default async function Sold({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params; const { error } = await searchParams;
  const { supabase, userId } = await getContext();
  const { data: l } = await supabase.from("listings").select("id, title, status").eq("id", id).eq("seller_id", userId).maybeSingle();
  if (!l || l.status !== "active") notFound();
  const { data: convs } = await supabase.from("conversations").select("id, buyer:profiles!conversations_buyer_id_fkey(display_name)").eq("listing_id", id).eq("seller_id", userId);
  return (
    <main className="max-w-xl">
      <h1 className="font-serif text-3xl tracking-tight">Mark as sold</h1>
      <p className="mt-2 text-muted">{l.title}</p>
      {error && <p role="alert" className="mt-3 text-sm text-danger">We couldn't record that exchange. The buyer must have sent you a message first.</p>}
      <form action={markSold.bind(null, id)} className="mt-6 space-y-3">
        <fieldset><legend className="text-sm font-medium">Who bought it?</legend>
          {convs?.map((c) => <label key={c.id} className="flex min-h-11 items-center gap-2"><input type="radio" name="conversationId" value={c.id} required />{(c.buyer as unknown as { display_name: string } | null)?.display_name ?? "Student"}</label>)}
          <label className="flex min-h-11 items-center gap-2"><input type="radio" name="conversationId" value="elsewhere" required />Sold elsewhere or outside f!nd</label></fieldset>
        <p className="text-sm text-muted">If you choose a buyer, they're asked to confirm. Only confirmed exchanges let you both leave reviews. Choosing "elsewhere" never creates a review.</p>
        <button className="min-h-11 rounded-[var(--radius-md)] bg-brand px-5 font-medium text-white">Mark as sold</button>
      </form>
    </main>
  );
}
