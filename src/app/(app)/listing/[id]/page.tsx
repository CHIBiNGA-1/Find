import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/session";
import { signedUrls } from "@/lib/listings/queries";
import { formatMoney } from "@/lib/money";
import { CONDITION_LABEL, type CONDITIONS } from "@/lib/listings/schema";
import { SaveButton } from "@/components/save-button";
import { ReportDialog } from "@/components/report-dialog";
import { startConversation } from "../../messages/actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { supabase } = await getContext();
  const { data } = await supabase.from("listings").select("title").eq("id", id).maybeSingle();
  return { title: data?.title ?? "Listing" };
}

export default async function ListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ contact?: string }> }) {
  const { id } = await params;
  const { contact } = await searchParams;
  const { supabase, userId } = await getContext();
  const { data: l } = await supabase.from("listings").select("*, profiles(display_name)").eq("id", id).maybeSingle();
  if (!l || l.status === "removed" || (l.status === "draft" && l.seller_id !== userId)) notFound();
  const [{ data: imgs }, { data: saved }] = await Promise.all([
    supabase.from("listing_images").select("storage_path, width, height, alt_text").eq("listing_id", id).order("position"),
    supabase.from("saved_listings").select("listing_id").eq("listing_id", id).maybeSingle(),
  ]);
  const urls = await signedUrls((imgs ?? []).map((i) => i.storage_path));
  const { data: repRaw } = await supabase.rpc("reputation", { p_user: l.seller_id });
  const rep = repRaw as { review_count: number; avg_rating: string | null }[] | null;
  const reviews = Number(rep?.[0]?.review_count ?? 0);
  const seller = (l.profiles as { display_name: string } | null)?.display_name ?? "Student";
  const unavailable = l.status === "sold" ? "This item has been sold." : l.status === "archived" ? "This listing is no longer active." : l.status === "draft" ? "Draft: only you can see this." : null;
  return (
    <main className="grid gap-8 md:grid-cols-2">
      <div className="space-y-2">
        {(imgs ?? []).map((i, n) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i.storage_path} src={urls.get(i.storage_path) ?? undefined} width={i.width} height={i.height} alt={i.alt_text ?? `${l.title}, photo ${n + 1}`}
            loading={n ? "lazy" : "eager"} className="h-auto w-full rounded-[var(--radius-md)] border border-line" />))}
      </div>
      <div>
        {unavailable && <p role="status" className="mb-3 rounded-[var(--radius-md)] border border-line bg-surface p-3 text-sm">{unavailable}</p>}
        <p className="price text-3xl font-semibold">{formatMoney(l.price_minor, l.currency_code)}</p>
        <h1 className="mt-1 font-serif text-2xl tracking-tight">{l.title}</h1>
        <p className="mt-1 text-sm text-muted">{CONDITION_LABEL[l.condition as (typeof CONDITIONS)[number]]} · Sold by <Link className="underline" href={`/profile/${l.seller_id}`}>{seller}</Link> · {reviews > 0 ? `${rep?.[0]?.avg_rating} out of 5 from ${reviews} confirmed exchange${reviews === 1 ? "" : "s"}` : "No reviews yet"}</p>
        {contact === "failed" && <p role="alert" className="mt-3 text-sm text-danger">We couldn't start that conversation. The listing may be unavailable, or messaging between you and this seller isn't possible.</p>}
        {l.seller_id !== userId && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {l.status === "active" && <form action={startConversation.bind(null, id)}><button className="min-h-11 rounded-[var(--radius-md)] bg-brand px-5 font-medium text-white">Message seller</button></form>}
            <SaveButton listingId={id} saved={!!saved} />
            <ReportDialog type="listing" targetId={id} label="Report listing" />
          </div>)}
        <p className="mt-6 whitespace-pre-line">{l.description}</p>
        {l.meeting_preferences && <p className="mt-4 text-sm text-muted">Meeting preference: {l.meeting_preferences}. Meet in a public place on campus. f!nd doesn't handle payment or guarantee any exchange.</p>}
      </div>
    </main>
  );
}
