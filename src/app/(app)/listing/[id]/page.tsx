import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/session";
import { signedUrls, coverImages } from "@/lib/listings/queries";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/time";
import { CONDITION_LABEL, type CONDITIONS } from "@/lib/listings/schema";
import { SaveButton } from "@/components/save-button";
import { ShareButton } from "@/components/share-button";
import { PhotoStage } from "@/components/photo-stage";
import { ListingCard } from "@/components/listing-card";
import { ReportDialog } from "@/components/report-dialog";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { startConversation } from "../../messages/actions";
import { setListingStatus } from "../../sell/actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { supabase } = await getContext();
  const { data } = await supabase.from("listings").select("title").eq("id", id).maybeSingle();
  return { title: data?.title ?? "Listing" };
}

export default async function ListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ contact?: string }> }) {
  const { id } = await params;
  const { contact } = await searchParams;
  const { supabase, userId, universityId, timezone } = await getContext();
  const { data: l } = await supabase.from("listings").select("*, profiles(display_name)").eq("id", id).maybeSingle();
  if (!l || l.status === "removed" || (l.status === "draft" && l.seller_id !== userId)) notFound();
  const mine = l.seller_id === userId;

  const topCat = l.category_id ? (await supabase.from("categories").select("id, parent_id").eq("id", l.category_id).maybeSingle()).data : null;
  const [{ data: imgs }, { data: saved }, { data: repRaw }, { data: relatedRaw }] = await Promise.all([
    supabase.from("listing_images").select("storage_path, width, height, alt_text").eq("listing_id", id).order("position"),
    supabase.from("saved_listings").select("listing_id").eq("listing_id", id).maybeSingle(),
    supabase.rpc("reputation", { p_user: l.seller_id }),
    topCat ? supabase.rpc("search_listings", { uni: universityId, cat: topCat.parent_id ?? topCat.id, lim: 6 }) : Promise.resolve({ data: [] }),
  ]);
  const urls = await signedUrls((imgs ?? []).map((i) => i.storage_path));
  const photos = (imgs ?? []).flatMap((i, n) => { const url = urls.get(i.storage_path); return url ? [{ url, w: i.width as number, h: i.height as number, alt: (i.alt_text as string | null) ?? `${l.title}, photo ${n + 1}` }] : []; });
  const related = ((relatedRaw ?? []) as { id: string; title: string; price_minor: number; currency_code: string; condition: string; published_at: string | null }[]).filter((r) => r.id !== id).slice(0, 4);
  const relCovers = await coverImages(related.map((r) => r.id));

  const rep = repRaw as { review_count: number; avg_rating: string | null }[] | null;
  const reviews = Number(rep?.[0]?.review_count ?? 0);
  const seller = (l.profiles as { display_name: string } | null)?.display_name ?? "Student";
  const notice = l.status === "sold" ? "This item has been sold." : l.status === "archived" ? "The seller has taken this listing down." : l.status === "draft" ? "Draft. Only you can see this." : null;
  const row = "flex justify-between gap-4 border-b border-line py-3 text-[0.9375rem]";

  return (
    <main className="space-y-14">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div className="lg:sticky lg:top-8 lg:self-start"><PhotoStage images={photos} /></div>
        <div>
          {notice && <p role="status" className="note mb-4">{notice}</p>}
          <h1 className="text-[clamp(1.9rem,1.2rem+2.6vw,3rem)] font-extrabold leading-[1] [font-stretch:78%]">{l.title}</h1>
          <p className="mt-4"><span className="pricetag pricetag-lg">{formatMoney(l.price_minor, l.currency_code)}</span></p>

          <div className="mt-6 hidden flex-wrap items-center gap-3 md:flex">
            {mine ? (<>
              <Link href={`/sell/${id}`} className="btn btn-primary"><Icon name="edit" size={18} />Edit listing</Link>
              {l.status === "active" && <><Link href={`/listing/${id}/sold`} className="btn btn-quiet">Mark as sold</Link>
                <form action={setListingStatus.bind(null, id, "archived")}><button className="btn btn-quiet">Take down</button></form></>}
            </>) : (<>
              {l.status === "active" && <form action={startConversation.bind(null, id)} className="min-w-40 flex-1"><button className="btn btn-primary w-full">Message seller</button></form>}
              <SaveButton listingId={id} saved={!!saved} /><ShareButton title={l.title} path={`/listing/${id}`} />
            </>)}
          </div>
          {contact === "failed" && <p role="alert" className="note note-danger mt-4">We couldn&rsquo;t start that conversation. The listing may be unavailable, or messaging with this seller isn&rsquo;t possible.</p>}

          {l.description && <p className="mt-8 max-w-prose whitespace-pre-line text-[1.0625rem] leading-relaxed">{l.description}</p>}

          <dl className="mt-8 border-t border-line">
            <div className={row}><dt className="text-muted">Condition</dt><dd className="font-semibold">{CONDITION_LABEL[l.condition as (typeof CONDITIONS)[number]]}</dd></div>
            {l.published_at && <div className={row}><dt className="text-muted">Listed</dt><dd className="font-semibold">{timeAgo(l.published_at, Date.now(), timezone)}</dd></div>}
            {l.campus_area && <div className={row}><dt className="text-muted">Campus area</dt><dd className="font-semibold text-right">{l.campus_area}</dd></div>}
            {l.meeting_preferences && <div className={row}><dt className="text-muted">Pickup</dt><dd className="font-semibold text-right">{l.meeting_preferences}</dd></div>}
          </dl>

          <Link href={`/profile/${l.seller_id}`} className="mt-6 flex items-center gap-3 rounded-[var(--radius-md)] py-2 hover:bg-sunken">
            <Avatar name={seller} /><span className="min-w-0 flex-1"><span className="block font-semibold">{seller}</span>
              <span className="t-meta block">{reviews > 0 ? `${rep?.[0]?.avg_rating} out of 5 from ${reviews} confirmed exchange${reviews === 1 ? "" : "s"}` : "No reviews yet"}</span></span>
            <Icon name="arrow" size={18} className="text-muted" /></Link>

          <p className="note mt-6"><Icon name="pin" size={16} className="mr-1.5 inline -translate-y-px" />Meet in a public place on campus. f!nd doesn&rsquo;t handle payment or guarantee any exchange.</p>
          {!mine && <div className="mt-3"><ReportDialog type="listing" targetId={id} label="Report listing" /></div>}
        </div>
      </div>

      {related.length > 0 && (
        <section aria-label="More like this"><h2 className="t-section mb-4">More like this</h2>
          <ul className="grid-listings">{related.map((r) => <li key={r.id}><ListingCard id={r.id} title={r.title} priceMinor={r.price_minor} currency={r.currency_code} condition={r.condition} image={relCovers.get(r.id)?.url} publishedAt={r.published_at} /></li>)}</ul></section>)}

      <div className="fixed inset-x-0 bottom-0 z-[var(--z-bar)] flex items-center gap-2 border-t border-line bg-white px-[var(--gutter)] pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
        {mine ? (<>
          <Link href={`/sell/${id}`} className="btn btn-primary flex-1">Edit listing</Link>
          {l.status === "active" && <Link href={`/listing/${id}/sold`} className="btn btn-quiet">Mark sold</Link>}
        </>) : (<>
          <SaveButton listingId={id} saved={!!saved} iconOnly /><ShareButton title={l.title} path={`/listing/${id}`} iconOnly />
          {l.status === "active" ? <form action={startConversation.bind(null, id)} className="flex-1"><button className="btn btn-primary w-full">Message seller</button></form>
            : <p className="t-meta flex-1 text-center">{notice}</p>}
        </>)}
      </div>
    </main>
  );
}
