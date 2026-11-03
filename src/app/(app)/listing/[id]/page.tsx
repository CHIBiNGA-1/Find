import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/session";
import { signedUrls } from "@/lib/listings/queries";
import { formatMoney } from "@/lib/money";
import { CONDITION_LABEL, type CONDITIONS } from "@/lib/listings/schema";
import { SaveButton } from "@/components/save-button";
import { PhotoStage } from "@/components/photo-stage";
import { Icon } from "@/components/icons";
import { timeAgo } from "@/lib/time";
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
  const photos = (imgs ?? []).flatMap((i, n) => { const url = urls.get(i.storage_path); return url ? [{ url, w: i.width as number, h: i.height as number, alt: (i.alt_text as string | null) ?? `${l.title}, photo ${n + 1}` }] : []; });
  const mine = l.seller_id === userId;
  const spec = "flex justify-between gap-4 border-b border-line py-3 text-[0.9375rem]";
  return (
    <main className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
      <div className="lg:sticky lg:top-24 lg:self-start"><PhotoStage images={photos} /></div>
      <div>
        {unavailable && <p role="status" className="tag tag-amber mb-4">{unavailable}</p>}
        <h1 className="text-[clamp(2rem,1.2rem+3vw,3.5rem)] font-extrabold leading-[0.98] [font-stretch:82%]">{l.title}</h1>
        <p className="mt-5"><span className="pricetag pricetag-lg">{formatMoney(l.price_minor, l.currency_code)}</span></p>

        {!mine && (
          <div className="mt-7 hidden flex-wrap items-center gap-3 md:flex">
            {l.status === "active" && <form action={startConversation.bind(null, id)}><button className="btn btn-primary min-w-52">Message seller</button></form>}
            <SaveButton listingId={id} saved={!!saved} />
          </div>)}
        {contact === "failed" && <p role="alert" className="mt-4 text-sm font-medium text-danger">We couldn&rsquo;t start that conversation. The listing may be unavailable, or messaging between you and this seller isn&rsquo;t possible.</p>}

        {l.description && <p className="mt-8 max-w-prose whitespace-pre-line text-[1.0625rem] leading-relaxed">{l.description}</p>}

        <dl className="mt-8 border-t border-line">
          <div className={spec}><dt className="text-muted">Condition</dt><dd className="font-semibold">{CONDITION_LABEL[l.condition as (typeof CONDITIONS)[number]]}</dd></div>
          {l.published_at && <div className={spec}><dt className="text-muted">Listed</dt><dd className="font-semibold">{timeAgo(l.published_at)}</dd></div>}
          <div className={spec}><dt className="text-muted">Seller</dt>
            <dd className="text-right"><Link className="link font-semibold" href={`/profile/${l.seller_id}`}>{seller}</Link>
              <span className="t-meta block text-[0.8125rem]">{reviews > 0 ? `${rep?.[0]?.avg_rating} out of 5 from ${reviews} confirmed exchange${reviews === 1 ? "" : "s"}` : "No reviews yet"}</span></dd></div>
        </dl>

        <div className="mt-8 flex gap-3 border-l-4 border-hl bg-sunken p-5">
          <Icon name="pin" size={20} className="mt-0.5 shrink-0" />
          <div><p className="font-bold">Meet in a public place on campus</p>
            <p className="t-meta mt-1">{l.meeting_preferences ? `Seller prefers: ${l.meeting_preferences}. ` : ""}f!nd doesn&rsquo;t handle payment or guarantee any exchange.</p></div>
        </div>
        {!mine && <div className="mt-5"><ReportDialog type="listing" targetId={id} label="Report listing" /></div>}
      </div>
      {!mine && (
        <div className="web-only-none fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-white px-[var(--space-gutter)] pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
          <SaveButton listingId={id} saved={!!saved} iconOnly />
          {l.status === "active"
            ? <form action={startConversation.bind(null, id)} className="flex-1"><button className="btn btn-primary w-full">Message seller</button></form>
            : <p className="t-meta flex-1 text-center">{unavailable}</p>}
        </div>)}
    </main>
  );
}