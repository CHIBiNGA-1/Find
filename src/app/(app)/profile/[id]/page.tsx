import { notFound } from "next/navigation";
import { getContext } from "@/lib/session";
import { ListingCard } from "@/components/listing-card";
import { ReportDialog } from "@/components/report-dialog";
import { coverImages } from "@/lib/listings/queries";

export default async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, currency } = await getContext();
  const { data: p } = await supabase.from("profiles").select("id, display_name, created_at").eq("id", id).maybeSingle();
  if (!p) notFound();
  type RepRow = { review_count: number; avg_rating: string | null };
  const [{ data: repRaw }, { data: reviews }, { data: listings }] = await Promise.all([
    supabase.rpc("reputation", { p_user: id }),
    supabase.from("reviews").select("id, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(display_name)").eq("reviewee_id", id).eq("status", "published").order("created_at", { ascending: false }).limit(20),
    supabase.from("listings").select("id, title, price_minor, currency_code, condition").eq("seller_id", id).eq("status", "active").order("published_at", { ascending: false }).limit(12),
  ]);
  const rep = repRaw as RepRow[] | null;
  const covers = await coverImages((listings ?? []).map((l) => l.id));
  const n = Number(rep?.[0]?.review_count ?? 0);
  const name = p.display_name as string;
  return (
    <main>
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="grid size-20 shrink-0 place-items-center rounded-[var(--radius-md)] bg-ink text-[2.25rem] font-extrabold text-white">{name.charAt(0).toUpperCase()}</span>
        <div><h1 className="t-page">{name}</h1>
          <p className="mt-2">{n > 0 ? <><span className="tag tag-amber price mr-2">{rep?.[0]?.avg_rating} out of 5</span><span className="t-meta">from {n} confirmed exchange{n === 1 ? "" : "s"}</span></> : <span className="t-meta">No reviews yet</span>}</p></div>
      </div>
      <p className="t-meta mt-5 max-w-xl">Verified member of the university. Verification confirms membership, not how someone will behave. Reviews only come from exchanges both people confirmed.</p>
      {id !== userId && <div className="mt-3"><ReportDialog type="user" targetId={id} label="Report user" /></div>}

      <h2 className="mb-5 mt-12 text-[1.75rem] md:text-[2.125rem]">Active listings</h2>
      {listings?.length ? <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">{listings.map((l) => <li key={l.id}><ListingCard id={l.id} title={l.title} priceMinor={l.price_minor} currency={l.currency_code ?? currency} condition={l.condition} image={covers.get(l.id)?.url} /></li>)}</ul> : <p className="text-muted">No active listings.</p>}

      {n > 0 && <><h2 className="mb-3 mt-12 text-[1.75rem] md:text-[2.125rem]">Reviews</h2>
        <ul className="divide-y divide-line border-y border-line">{reviews?.map((r) => <li key={r.id} className="py-4">
          <p className="text-sm"><span className="font-extrabold">{r.rating} out of 5</span> <span className="text-muted">from {(r.reviewer as unknown as { display_name: string } | null)?.display_name ?? "a student"}, {new Date(r.created_at).toLocaleDateString()}</span></p>
          {r.comment && <p className="mt-1.5 max-w-prose">{r.comment}</p>}
          {id === userId && <div className="mt-1"><ReportDialog type="review" targetId={r.id} label="Dispute this review" /></div>}
        </li>)}</ul></>}
    </main>
  );
}
