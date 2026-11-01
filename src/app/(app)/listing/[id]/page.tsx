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
  return (
    <main className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
      <PhotoStage images={photos} />
      <div className="lg:py-6">
        {unavailable && <p role="status" className="tag tag-amber mb-4">{unavailable}</p>}
        <p className="t-label">{CONDITION_LABEL[l.condition as (typeof CONDITIONS)[number]]}{l.published_at ? ` · ${timeAgo(l.published_at)}` : ""}</p>
        <h1 className="t-display mt-3 !text-[clamp(2rem,1.5rem+2vw,3rem)]">{l.title}</h1>
        <p className="price mt-4 text-[1.75rem] font-semibold text-brand">{formatMoney(l.price_minor, l.currency_code)}</p>
        <p className="t-meta mt-2">Sold by <Link className="link" href={`/profile/${l.seller_id}`}>{seller}</Link> · {reviews > 0 ? `${rep?.[0]?.avg_rating} out of 5 from ${reviews} confirmed exchange${reviews === 1 ? "" : "s"}` : "No reviews yet"}</p>
        {l.description && <p className="mt-7 max-w-prose whitespace-pre-line text-[1.0625rem] leading-relaxed">{l.description}</p>}
        {contact === "failed" && <p role="alert" className="mt-5 text-sm text-danger">We couldn&rsquo;t start that conversation. The listing may be unavailable, or messaging between you and this seller isn&rsquo;t possible.</p>}
        {!mine && (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {l.status === "active" && <form action={startConversation.bind(null, id)}><button className="btn btn-ink">Message seller<span className="chip"><Icon name="arrow" size={16} /></span></button></form>}
            <SaveButton listingId={id} saved={!!saved} />
          </div>)}
        <div className="blk blk-sand mt-10 !p-5">
          <p className="flex items-center gap-2 font-semibold"><Icon name="pin" size={18} />Meeting up</p>
          <p className="t-meta mt-1.5">{l.meeting_preferences ? `Seller prefers: ${l.meeting_preferences}. ` : ""}Meet in a public place on campus. f!nd doesn&rsquo;t handle payment or guarantee any exchange.</p>
        </div>
        {!mine && <div className="mt-5"><ReportDialog type="listing" targetId={id} label="Report listing" /></div>}
      </div>
    </main>
  );
}
