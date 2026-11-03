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
  const uniName = uni.data?.name ?? "your university";
  const card = (l: Row) => <ListingCard id={l.id} title={l.title} priceMinor={l.price_minor} currency={currency} image={covers.get(l.id)?.url} publishedAt={l.published_at} />;
  const head = (id: string, title: string, sub: string | null, href: string, cta: string) => (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div><h2 id={id} className="text-[1.75rem] md:text-[2.125rem]">{title}</h2>{sub && <p className="t-meta mt-1">{sub}</p>}</div>
      <Link href={href} className="link shrink-0 text-[0.9375rem] font-semibold">{cta}</Link>
    </div>);

  return (
    <main className="space-y-14 md:space-y-20">
      <section aria-label="Search" className="home-intro relative overflow-hidden rounded-[1.5rem] border border-line bg-white px-5 py-8 md:px-10 md:py-11">
        <div className="home-intro-copy relative z-10 max-w-3xl">
          <p className="mb-4 inline-flex items-center gap-2 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-brand"><span className="inline-block size-2 rounded-full bg-brand" /> Your campus, in good company</p>
          <h1 className="max-w-3xl text-[clamp(2.25rem,1rem+5vw,4.25rem)] font-extrabold leading-[0.95] [font-stretch:80%]">What do you need at {uniName}?</h1>
          <p className="mt-4 max-w-xl text-[1rem] leading-relaxed text-muted md:text-[1.0625rem]">Find useful things, pass on what you no longer need, and connect with the people around you.</p>
        </div>
        <form action="/explore" method="get" role="search" className="relative z-10 mt-7 flex max-w-2xl gap-2">
          <label className="relative flex-1"><span className="sr-only">Search listings</span>
            <Icon name="search" size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input name="q" type="search" placeholder="Textbooks, laptop, mini fridge" className="field !min-h-14 !pl-12 text-[1.0625rem]" /></label>
          <button className="btn btn-primary !min-h-14 px-7">Search</button>
        </form>
        {cats.data && cats.data.length > 0 && (
          <div className="relative z-10 mt-7">
          <p className="mb-3 text-[0.8125rem] font-semibold text-muted">Explore popular categories</p>
          <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
            {cats.data.map((c) => (
              <li key={c.id} className="shrink-0"><Link href={`/explore?cat=${c.id}`} className="chip"><Icon name={CATEGORY_ICON[c.slug] ?? "tag"} size={18} />{c.name}</Link></li>))}
          </ul>
          </div>)}
      </section>

      <InstallPrompt className="md:hidden" />

      <section aria-labelledby="recent">
        {head("recent", "Just listed", null, "/explore", "See all listings")}
        {recentRows.length ? (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">{recentRows.map((l) => <li key={l.id}>{card(l)}</li>)}</ul>
        ) : (
          <div className="rounded-[var(--radius-lg)] bg-sunken p-8 md:p-12">
            <p className="text-[1.75rem] font-bold [font-stretch:88%]">Nothing is listed yet.</p>
            <p className="mt-2 max-w-md text-muted">Listings from verified students at {uniName} will show up here. Yours can be the first.</p>
            <Link href="/sell" className="btn btn-primary mt-6">Post a listing</Link>
          </div>)}
      </section>

      {trendRows.length > 0 && (
        <section aria-labelledby="trend-h">
          {head("trend-h", "Most saved this week", null, "/explore", "Explore more")}
          <ul className="no-scrollbar -mx-[var(--space-gutter)] flex snap-x gap-4 overflow-x-auto px-[var(--space-gutter)] md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0">
            {trendRows.map((l) => <li key={l.id} className="w-[44vw] shrink-0 snap-start sm:w-[30vw] md:w-auto">{card(l)}</li>)}
          </ul>
        </section>)}

      <section aria-label="Requests and lost and found" className="bleed on-brand bg-brand py-12 text-white md:py-16">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-[1.75rem] md:text-[2.125rem]">Requests</h2>
              <Link href="/requests" className="text-[0.9375rem] font-semibold underline underline-offset-4">See all</Link>
            </div>
            <p className="t-meta mt-1">Students asking for something. Answer one, or post your own.</p>
            {reqs.data?.length ? (
              <ul className="mt-5 divide-y divide-white/25 border-y border-white/25">
                {reqs.data.map((r) => (
                  <li key={r.id}><Link href={`/requests/${r.id}`} className="flex items-baseline justify-between gap-4 py-3.5 hover:bg-white/10">
                    <span className="min-w-0"><span className="block truncate font-semibold">{r.title}</span>
                      <span className="t-meta block text-[0.8125rem]">{timeAgo(r.created_at)}</span></span>
                    {r.budget_minor != null && <span className="price shrink-0 font-bold">{formatMoney(r.budget_minor, r.currency_code)}</span>}
                  </Link></li>))}
              </ul>) : <p className="mt-5 text-white/85">No open requests right now.</p>}
            <Link href="/requests/new" className="btn btn-white mt-6">Ask for something</Link>
          </div>
          <div>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-[1.75rem] md:text-[2.125rem]">Lost and found</h2>
              <Link href="/lost-found" className="text-[0.9375rem] font-semibold underline underline-offset-4">See all</Link>
            </div>
            <p className="t-meta mt-1">Something missing, or something you picked up.</p>
            {lost.data?.length ? (
              <ul className="mt-5 divide-y divide-white/25 border-y border-white/25">
                {lost.data.map((r) => (
                  <li key={r.id}><Link href={`/lost-found/${r.id}`} className="flex items-center gap-3 py-3.5 hover:bg-white/10">
                    <span className={`tag shrink-0 ${r.kind === "lost" ? "!bg-hl !text-ink" : "!bg-white !text-ink"}`}>{r.kind === "lost" ? "Lost" : "Found"}</span>
                    <span className="min-w-0"><span className="block truncate font-semibold">{r.title}</span>
                      <span className="t-meta block text-[0.8125rem]">{r.area}, {timeAgo(r.created_at)}</span></span>
                  </Link></li>))}
              </ul>) : <p className="mt-5 text-white/85">Nothing reported right now.</p>}
            <Link href="/lost-found/new" className="btn btn-white mt-6">Report an item</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
