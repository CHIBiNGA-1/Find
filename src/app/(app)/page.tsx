import Link from "next/link";
import { getContext } from "@/lib/session";
import { coverImages } from "@/lib/listings/queries";
import { categoryTree, topLevelOf, type Category } from "@/lib/categories";
import { ListingCard } from "@/components/listing-card";
import { EmptyState } from "@/components/empty-state";
import { Icon, CATEGORY_ICON } from "@/components/icons";
import { InstallPrompt } from "@/components/install-prompt";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/time";

export const dynamic = "force-dynamic";
type Row = { id: string; title: string; price_minor: number; published_at: string | null; seller_id: string };

function Strip({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <div className="mb-4 flex items-baseline justify-between gap-4"><h2 className="t-section">{title}</h2>{href && <Link href={href} className="link text-[0.9rem]">See all</Link>}</div>
      {children}
    </section>
  );
}

export default async function Home() {
  const { supabase, userId, universityId, currency, timezone } = await getContext();
  const now = new Date().toISOString();
  const [recent, trending, cats, reqs, lost, savedCats] = await Promise.all([
    supabase.rpc("search_listings", { uni: universityId, lim: 12 }),
    supabase.rpc("trending_listings", { uni: universityId, lim: 4 }),
    supabase.from("categories").select("id, slug, name, parent_id"),
    supabase.from("requests").select("id, title, budget_minor, currency_code, created_at").eq("university_id", universityId).eq("status", "open").gt("expires_at", now).order("created_at", { ascending: false }).limit(4),
    supabase.from("lost_found_reports").select("id, kind, title, area, created_at").eq("university_id", universityId).eq("status", "open").order("created_at", { ascending: false }).limit(4),
    supabase.from("saved_listings").select("listings(category_id)").order("created_at", { ascending: false }).limit(20),
  ]);
  const all = (cats.data ?? []) as Category[];
  const tree = categoryTree(all);

  // "Because you saved": the category you save from most. Derived from real saves only; absent until you have some.
  const counts = new Map<string, number>();
  for (const s of savedCats.data ?? []) {
    const top = topLevelOf(all, (s.listings as unknown as { category_id: string | null } | null)?.category_id);
    if (top) counts.set(top, (counts.get(top) ?? 0) + 1);
  }
  const favId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const fav = favId ? all.find((c) => c.id === favId) : undefined;
  const forYouRaw = favId ? await supabase.rpc("search_listings", { uni: universityId, cat: favId, lim: 9 }) : null;

  const recentRows = (recent.data ?? []) as Row[], trendRows = (trending.data ?? []) as Row[];
  const forYou = ((forYouRaw?.data ?? []) as Row[]).filter((l) => l.seller_id !== userId).slice(0, 4);
  const covers = await coverImages([...new Set([...recentRows, ...trendRows, ...forYou].map((l) => l.id))]);
  const card = (l: Row, priority = false) => <ListingCard id={l.id} title={l.title} priceMinor={l.price_minor} currency={currency} image={covers.get(l.id)?.url} publishedAt={l.published_at} priority={priority} />;

  return (
    <main className="space-y-12">
      <h1 className="sr-only">Home</h1>
      <section aria-label="Search and categories" className="space-y-4">
        <form action="/explore" method="get" role="search" className="relative">
          <label><span className="sr-only">Search listings</span>
            <Icon name="search" size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input name="q" type="search" placeholder="Search listings" className="field !min-h-14 !pl-12 !pr-28" /></label>
          <button className="btn btn-primary btn-sm absolute right-2 top-1/2 -translate-y-1/2">Search</button>
        </form>
        <nav aria-label="Categories"><ul className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)]">
          {tree.map((c) => <li key={c.id} className="shrink-0"><Link href={`/explore?cat=${c.id}`} className="chip"><Icon name={CATEGORY_ICON[c.slug] ?? "tag"} size={17} />{c.name}</Link></li>)}
        </ul></nav>
        <nav aria-label="Campus boards" className="flex gap-2 md:hidden">
          <Link href="/requests" className="chip"><Icon name="megaphone" size={17} />Requests</Link>
          <Link href="/lost-found" className="chip"><Icon name="pin" size={17} />Lost and found</Link>
        </nav>
      </section>

      <InstallPrompt className="md:hidden" />

      <Strip title="Just listed" href="/explore">
        {recentRows.length
          ? <ul className="grid-listings">{recentRows.map((l, i) => <li key={l.id}>{card(l, i < 4)}</li>)}</ul>
          : <EmptyState title="Nothing listed yet." hint="Listings from verified students at your university appear here." href="/sell" action="List the first item" />}
      </Strip>

      {forYou.length > 0 && fav && <Strip title={`More ${fav.name.toLowerCase()}`} href={`/explore?cat=${fav.id}`}>
        <ul className="grid-listings">{forYou.map((l) => <li key={l.id}>{card(l)}</li>)}</ul>
      </Strip>}

      {trendRows.length > 0 && <Strip title="Saved most this week">
        <ul className="grid-listings">{trendRows.map((l) => <li key={l.id}>{card(l)}</li>)}</ul>
      </Strip>}

      <section aria-label="Campus boards" className="grid gap-10 md:grid-cols-2 md:gap-12">
        <div>
          <div className="mb-3 flex items-baseline justify-between"><h2 className="t-section">Wanted</h2><Link href="/requests/new" className="link text-[0.9rem]">Post a request</Link></div>
          {reqs.data?.length ? <ul className="rows">{reqs.data.map((r) => (
            <li key={r.id}><Link href={`/requests/${r.id}`} className="row-link justify-between">
              <span className="min-w-0"><span className="block truncate font-semibold">{r.title}</span><span className="t-meta block">{timeAgo(r.created_at, Date.now(), timezone)}</span></span>
              {r.budget_minor != null && <span className="shrink-0 font-bold tnum">{formatMoney(r.budget_minor, r.currency_code)}</span>}</Link></li>))}</ul>
            : <p className="t-meta border-y border-line py-6">No open requests. <Link href="/requests/new" className="link">Ask for something</Link></p>}
        </div>
        <div>
          <div className="mb-3 flex items-baseline justify-between"><h2 className="t-section">Lost and found</h2><Link href="/lost-found/new" className="link text-[0.9rem]">Report an item</Link></div>
          {lost.data?.length ? <ul className="rows">{lost.data.map((r) => (
            <li key={r.id}><Link href={`/lost-found/${r.id}`} className="row-link justify-between">
              <span className="min-w-0"><span className="block truncate font-semibold">{r.title}</span><span className="t-meta block truncate">{r.area}, {timeAgo(r.created_at, Date.now(), timezone)}</span></span>
              <span className={`tag shrink-0 ${r.kind === "lost" ? "tag-ink" : ""}`}>{r.kind === "lost" ? "Lost" : "Found"}</span></Link></li>))}</ul>
            : <p className="t-meta border-y border-line py-6">Nothing reported right now.</p>}
        </div>
      </section>
    </main>
  );
}
