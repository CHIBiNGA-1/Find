import Link from "next/link";
import { signOut } from "../../(auth)/actions";
import { getContext } from "@/lib/session";
import { coverImages } from "@/lib/listings/queries";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/time";
import { confirmExchange } from "../exchange-actions";
import { deleteDraft, setListingStatus } from "../sell/actions";
import { Avatar } from "@/components/avatar";
import { ListingCard } from "@/components/listing-card";
import { ConfirmAction } from "@/components/confirm-action";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "You" };
const TABS = [["listings", "Listings"], ["saved", "Saved"], ["enquiries", "Enquiries"], ["reviews", "Reviews"]] as const;
const GROUPS = [["draft", "Drafts"], ["active", "Active"], ["sold", "Sold"], ["archived", "Archived"]] as const;
type Tab = (typeof TABS)[number][0];

export default async function You({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab: Tab = TABS.some(([k]) => k === sp.tab) ? (sp.tab as Tab) : "listings";
  const { supabase, userId, timezone, universityName, isModerator } = await getContext();
  const [{ data: profile }, { data: membership }, { data: repRaw }, { data: exchanges }, { data: myReviews }] = await Promise.all([
    supabase.from("profiles").select("display_name, created_at").eq("id", userId).maybeSingle(),
    supabase.from("university_memberships").select("status, verified_at").eq("status", "verified").limit(1).maybeSingle(),
    supabase.rpc("reputation", { p_user: userId }),
    supabase.from("exchange_records").select("id, status, seller_id, buyer_id, listings(title)").neq("status", "declined"),
    supabase.from("reviews").select("exchange_id").eq("reviewer_id", userId),
  ]);
  const name = profile?.display_name ?? "You";
  const rep = repRaw as { review_count: number; avg_rating: string | null }[] | null, nReviews = Number(rep?.[0]?.review_count ?? 0);
  const reviewed = new Set((myReviews ?? []).map((r) => r.exchange_id));
  const title = (e: { listings: unknown }) => (e.listings as { title: string } | null)?.title ?? "an item";
  const toConfirm = (exchanges ?? []).filter((e) => e.status === "pending" && e.buyer_id === userId);
  const toReview = (exchanges ?? []).filter((e) => e.status === "confirmed" && !reviewed.has(e.id));

  const tabBody = await (async () => {
    if (tab === "listings") {
      const [{ data: mine }, { data: enq }] = await Promise.all([
        supabase.from("listings").select("id, title, price_minor, currency_code, status").eq("seller_id", userId).neq("status", "removed").order("updated_at", { ascending: false }),
        supabase.from("conversations").select("listing_id").eq("seller_id", userId).not("listing_id", "is", null),
      ]);
      const covers = await coverImages((mine ?? []).map((l) => l.id));
      const enquiryCount = new Map<string, number>(); (enq ?? []).forEach((c) => enquiryCount.set(c.listing_id!, (enquiryCount.get(c.listing_id!) ?? 0) + 1));
      if (!mine?.length) return <EmptyState title="You haven't listed anything." hint="Photos, a price and a title are all it takes." href="/sell" action="Create a listing" />;
      return GROUPS.map(([status, label]) => {
        const items = mine.filter((l) => l.status === status); if (!items.length) return null;
        return (
          <section key={status} className="mt-8 first:mt-0"><h2 className="t-meta mb-2 font-semibold">{label} ({items.length})</h2>
            <ul className="rows">{items.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 py-3">
                <Link href={status === "draft" ? `/sell/${l.id}` : `/listing/${l.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="size-14 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-sunken">{ }{covers.get(l.id) && <img src={covers.get(l.id)!.url} alt="" className="size-full object-cover" />}</span>
                  <span className="min-w-0"><span className="block truncate font-semibold">{l.title}</span>
                    <span className="t-meta block">{formatMoney(l.price_minor, l.currency_code)}{status === "active" && enquiryCount.get(l.id) ? `, ${enquiryCount.get(l.id)} enquir${enquiryCount.get(l.id) === 1 ? "y" : "ies"}` : ""}</span></span></Link>
                <div className="flex flex-wrap gap-2">
                  {status !== "sold" && <Link href={`/sell/${l.id}`} className="btn btn-quiet btn-sm">{status === "draft" ? "Continue" : "Edit"}</Link>}
                  {status === "active" && <><Link href={`/listing/${l.id}/sold`} className="btn btn-quiet btn-sm">Mark sold</Link>
                    <form action={setListingStatus.bind(null, l.id, "archived")}><button className="btn btn-quiet btn-sm">Take down</button></form></>}
                  {status === "archived" && <form action={setListingStatus.bind(null, l.id, "active")}><button className="btn btn-quiet btn-sm">Relist</button></form>}
                  {status === "draft" && <ConfirmAction action={deleteDraft.bind(null, l.id)} label="Delete" title="Delete this draft?" body="The draft and its photos are removed. This can't be undone." confirmLabel="Delete draft" />}
                </div></li>))}</ul></section>);
      });
    }
    if (tab === "saved") {
      const { data: saved } = await supabase.from("saved_listings").select("listings(id, title, price_minor, currency_code, condition, status, published_at)").order("created_at", { ascending: false });
      type L = { id: string; title: string; price_minor: number; currency_code: string; condition: string; status: string; published_at: string | null };
      const list = (saved ?? []).map((s) => s.listings as unknown as L | null).filter((l): l is L => !!l);
      const covers = await coverImages(list.map((l) => l.id));
      if (!list.length) return <EmptyState title="Nothing saved." hint="Tap Save on a listing to keep it here." href="/explore" action="Explore listings" />;
      return <ul className="grid-listings">{list.map((l) => <li key={l.id}><ListingCard id={l.id} title={l.title} priceMinor={l.price_minor} currency={l.currency_code} condition={l.condition} image={covers.get(l.id)?.url} status={l.status} publishedAt={l.published_at} /></li>)}</ul>;
    }
    if (tab === "enquiries") {
      const { data: convs } = await supabase.from("conversations").select("id, last_message_at, listings(title, status, price_minor, currency_code), requests(title), lost_found:lost_found_reports(title)").eq("buyer_id", userId).order("last_message_at", { ascending: false, nullsFirst: false });
      if (!convs?.length) return <EmptyState title="No enquiries yet." hint="Messages you start from a listing, request or report appear here." href="/explore" action="Explore listings" />;
      return <ul className="rows">{convs.map((c) => {
        const l = c.listings as unknown as { title: string; status: string; price_minor: number; currency_code: string } | null;
        const t = l?.title ?? (c.requests as unknown as { title: string } | null)?.title ?? (c.lost_found as unknown as { title: string } | null)?.title ?? "Item removed";
        return <li key={c.id}><Link href={`/messages/${c.id}`} className="row-link justify-between"><span className="min-w-0"><span className="block truncate font-semibold">{t}</span>
          <span className="t-meta block">{l ? `${formatMoney(l.price_minor, l.currency_code)}, ${l.status}` : "Conversation"}{c.last_message_at ? `, last message ${formatDate(c.last_message_at, timezone)}` : ""}</span></span></Link></li>; })}</ul>;
    }
    const { data: reviews } = await supabase.from("reviews").select("id, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(display_name)").eq("reviewee_id", userId).eq("status", "published").order("created_at", { ascending: false }).limit(50);
    if (!reviews?.length) return <EmptyState title="No reviews yet." hint="Reviews appear after a buyer and seller both confirm an exchange." />;
    return <ul className="rows">{reviews.map((r) => <li key={r.id} className="py-4"><p className="text-sm"><span className="font-extrabold">{r.rating} out of 5</span> <span className="text-muted">from {(r.reviewer as unknown as { display_name: string } | null)?.display_name ?? "a student"}, {formatDate(r.created_at, timezone, true)}</span></p>{r.comment && <p className="mt-1 max-w-prose">{r.comment}</p>}</li>)}</ul>;
  })();

  return (
    <main className="max-w-3xl">
      <header className="flex flex-wrap items-center gap-4">
        <Avatar name={name} size={72} />
        <div className="min-w-0 flex-1"><h1 className="t-page">{name}</h1>
          <p className="t-meta mt-1.5">{membership ? `Verified member of ${universityName}${membership.verified_at ? ` since ${formatDate(membership.verified_at, timezone, true)}` : ""}` : universityName}</p>
          <p className="t-meta">{nReviews > 0 ? `${rep?.[0]?.avg_rating} out of 5 from ${nReviews} confirmed exchange${nReviews === 1 ? "" : "s"}` : "No reviews yet"}</p></div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/profile/${userId}`} className="btn btn-quiet btn-sm">Public profile</Link>
          <Link href="/you/settings" className="btn btn-quiet btn-sm">Settings</Link>
          {isModerator && <Link href="/admin" className="btn btn-quiet btn-sm">Moderation</Link>}
          <form action={signOut}><button className="btn btn-quiet btn-sm">Sign out</button></form>
        </div>
      </header>

      {(toConfirm.length > 0 || toReview.length > 0) && (
        <section aria-label="Needs your attention" className="note mt-8 space-y-3">
          {toConfirm.map((e) => <div key={e.id} className="flex flex-wrap items-center gap-3"><span>A seller says you bought {title(e)}. Is that right?</span>
            <form action={confirmExchange.bind(null, e.id, true)}><button className="btn btn-primary btn-sm">Yes, confirm</button></form>
            <form action={confirmExchange.bind(null, e.id, false)}><button className="btn btn-quiet btn-sm">No</button></form></div>)}
          {toReview.map((e) => <p key={e.id}><Link className="link" href={`/review/${e.id}`}>Review your exchange for {title(e)}</Link></p>)}
        </section>)}

      <nav aria-label="Your activity" className="mt-8 border-b border-line"><ul className="flex gap-1">
        {TABS.map(([k, label]) => <li key={k}><Link href={k === "listings" ? "/you" : `/you?tab=${k}`} aria-current={tab === k ? "page" : undefined}
          className="inline-flex min-h-11 items-center border-b-2 border-transparent px-3 text-[0.9375rem] font-semibold text-muted aria-[current=page]:border-brand aria-[current=page]:text-ink">{label}</Link></li>)}
      </ul></nav>
      <div className="mt-6">{tabBody}</div>
    </main>
  );
}
