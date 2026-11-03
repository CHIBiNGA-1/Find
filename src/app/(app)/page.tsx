import Link from "next/link";
import { getContext } from "@/lib/session";
import { coverImages } from "@/lib/listings/queries";
import { ListingCard } from "@/components/listing-card";
import { Icon, CATEGORY_ICON } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/time";
import { InstallPrompt } from "@/components/install-prompt";

export const dynamic = "force-dynamic";
type Row = { id: string; title: string; price_minor: number; published_at: string | null };

export default async function Home() {
  const { supabase, universityId, currency } = await getContext();
  const now = new Date().toISOString();
  const [recent, trending, cats, uni, reqs, lost] = await Promise.all([
    supabase.rpc("search_listings", { uni: universityId, lim: 8 }),
    supabase.rpc("trending_listings", { uni: universityId, lim: 5 }),
    supabase.from("categories").select("id, slug, name").order("name"),
    supabase.from("universities").select("name").eq("id", universityId).maybeSingle(),
    supabase.from("requests").select("id, title, budget_minor, currency_code, created_at")
      .eq("university_id", universityId).eq("status", "open").gt("expires_at", now).order("created_at", { ascending: false }).limit(4),
    supabase.from("lost_found_reports").select("id, kind, title, area, created_at")
      .eq("university_id", universityId).eq("status", "open").order("created_at", { ascending: false }).limit(4),
  ]);
  const recentRows = (recent.data ?? []) as Row[], trendRows = (trending.data ?? []) as Row[];
  const covers = await coverImages([...new Set([...recentRows, ...trendRows].map((l) => l.id))]);
  const uniName = uni.data?.name ?? "Campus";
  const card = (l: Row) => <ListingCard id={l.id} title={l.title} priceMinor={l.price_minor} currency={currency} image={covers.get(l.id)?.url} publishedAt={l.published_at} />;

  return (
    <main className="find-home space-y-10 md:space-y-14">
      <section className="find-home-top" aria-label="Campus marketplace">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="find-eyebrow">{uniName}</p>
            <h1 className="find-heading">The campus marketplace<span>.</span></h1>
          </div>
          <Link href="/sell" className="find-sell-link"><Icon name="plus" size={18} /> List an item</Link>
        </div>
        <form action="/explore" method="get" role="search" className="find-search mt-7">
          <Icon name="search" size={21} className="shrink-0 text-muted" />
          <label className="min-w-0 flex-1"><span className="sr-only">Search listings</span><input name="q" type="search" placeholder="Search anything on campus" /></label>
          <button type="submit" aria-label="Search"><Icon name="arrow" size={20} /></button>
        </form>
        {cats.data && cats.data.length > 0 && <nav aria-label="Shop by category" className="find-categories no-scrollbar mt-5">
          {cats.data.map((c) => <Link key={c.id} href={`/explore?cat=${c.id}`}><Icon name={CATEGORY_ICON[c.slug] ?? "tag"} size={17} />{c.name}</Link>)}
        </nav>}
      </section>

      <InstallPrompt className="md:hidden" />

      <section aria-labelledby="recent" className="find-section">
        <div className="find-section-head"><div><p className="find-eyebrow">Fresh on campus</p><h2 id="recent">Just listed</h2></div><Link href="/explore" className="find-text-link">View all <Icon name="arrow" size={16} /></Link></div>
        {recentRows.length ? <ul className="find-listing-grid">{recentRows.map((l) => <li key={l.id}>{card(l)}</li>)}</ul> :
          <div className="find-empty"><p>Nothing here yet.</p><Link href="/sell" className="find-text-link">Be the first to list <Icon name="arrow" size={16} /></Link></div>}
      </section>

      {trendRows.length > 0 && <section aria-labelledby="trend-h" className="find-section">
        <div className="find-section-head"><div><p className="find-eyebrow">Popular right now</p><h2 id="trend-h">Getting attention</h2></div><Link href="/explore" className="find-text-link">Explore <Icon name="arrow" size={16} /></Link></div>
        <ul className="find-trending-grid">{trendRows.map((l) => <li key={l.id}>{card(l)}</li>)}</ul>
      </section>}

      <section className="find-community" aria-label="Campus community">
        <div className="find-community-head"><div><p className="find-eyebrow">Beyond the marketplace</p><h2>Campus, connected.</h2></div></div>
        <div className="find-community-grid">
          <div className="find-community-panel"><div className="find-panel-title"><h3>Wanted</h3><Link href="/requests" aria-label="All requests"> <Icon name="arrow" size={18} /></Link></div>
            {reqs.data?.length ? <ul>{reqs.data.map((r) => <li key={r.id}><Link href={`/requests/${r.id}`}><span><strong>{r.title}</strong><small>{timeAgo(r.created_at)}</small></span>{r.budget_minor != null && <b>{formatMoney(r.budget_minor, r.currency_code)}</b>}</Link></li>)}</ul> : <p className="find-quiet">No open requests.</p>}
            <Link href="/requests/new" className="find-inline-action">Post a request <Icon name="arrow" size={15} /></Link>
          </div>
          <div className="find-community-panel"><div className="find-panel-title"><h3>Lost & found</h3><Link href="/lost-found" aria-label="All lost and found reports"><Icon name="arrow" size={18} /></Link></div>
            {lost.data?.length ? <ul>{lost.data.map((r) => <li key={r.id}><Link href={`/lost-found/${r.id}`}><span><strong>{r.title}</strong><small>{r.area} · {timeAgo(r.created_at)}</small></span><em>{r.kind === "lost" ? "Lost" : "Found"}</em></Link></li>)}</ul> : <p className="find-quiet">No reports right now.</p>}
            <Link href="/lost-found/new" className="find-inline-action">Report an item <Icon name="arrow" size={15} /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
