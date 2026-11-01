import Link from "next/link";
import { getContext } from "@/lib/session";
import { coverImages, signedUrls } from "@/lib/listings/queries";
import { ListingCard } from "@/components/listing-card";
import { Icon, CATEGORY_ICON, type IconName } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/time";

export const dynamic = "force-dynamic";
type Row = { id: string; title: string; price_minor: number; published_at: string | null };
const TINTS = ["tint-blue", "tint-amber", "tint-green", "tint-clay", "tint-teal", "tint-slate"];
const TRUST: { icon: IconName; title: string; body: string }[] = [
  { icon: "shield", title: "Verified members", body: "A moderator reviews every account." },
  { icon: "chat", title: "Messages in the app", body: "Keep your phone number private." },
  { icon: "pin", title: "Meet in public", body: "Safety guidance on every listing." },
  { icon: "flag", title: "Report and block", body: "On every listing, message and profile." },
];

export default async function Home() {
  const { supabase, universityId, currency } = await getContext();
  const now = new Date().toISOString();
  const [recent, trending, cats, uni, reqs, lost] = await Promise.all([
    supabase.rpc("search_listings", { uni: universityId, lim: 8 }),
    supabase.rpc("trending_listings", { uni: universityId, lim: 5 }),
    supabase.from("categories").select("id, slug, name").order("name"),
    supabase.from("universities").select("name").eq("id", universityId).maybeSingle(),
    supabase.from("requests").select("id, title, budget_minor, currency_code, created_at, profiles(display_name)")
      .eq("university_id", universityId).eq("status", "open").gt("expires_at", now).order("created_at", { ascending: false }).limit(3),
    supabase.from("lost_found_reports").select("id, kind, title, area, created_at, image_path")
      .eq("university_id", universityId).eq("status", "open").order("created_at", { ascending: false }).limit(2),
  ]);
  const recentRows = (recent.data ?? []) as Row[], trendRows = (trending.data ?? []) as Row[];
  const covers = await coverImages([...new Set([...recentRows, ...trendRows].map((l) => l.id))]);
  const lfUrls = await signedUrls((lost.data ?? []).flatMap((r) => (r.image_path ? [r.image_path] : [])), "lostfound-images");
  const uniName = uni.data?.name ?? "University";
  const grid = (rows: Row[]) => (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((l) => <li key={l.id}><ListingCard id={l.id} title={l.title} priceMinor={l.price_minor} currency={currency} image={covers.get(l.id)?.url} publishedAt={l.published_at} /></li>)}
    </ul>);
  const head = (id: string, icon: IconName, title: string, sub: string | null, href: string, cta: string) => (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div><h2 id={id} className="flex items-center gap-2.5 text-[1.375rem] font-semibold tracking-tight"><Icon name={icon} size={22} className="text-brand" />{title}</h2>{sub && <p className="t-meta mt-1">{sub}</p>}</div>
      <Link href={href} className="section-link shrink-0">{cta}</Link>
    </div>);

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[20px] bg-[var(--color-mint)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero.jpg" alt="" aria-hidden="true" className="absolute inset-y-0 right-0 hidden h-full w-[52%] object-cover md:block [mask-image:linear-gradient(to_right,transparent,black_38%)]" />
        <div className="relative px-6 py-10 sm:px-10 sm:py-14 md:max-w-[56%]">
          <span className="tag">{uniName}</span>
          <h1 className="t-display mt-5">Buy. Sell. Connect.<span className="mt-1 block font-normal text-brand">All on the campus.</span></h1>
          <p className="mt-4 max-w-md text-[1.0625rem] text-muted">Find what you need, sell what you don&rsquo;t, and deal with students from the same university.</p>
          <form action="/explore" method="get" role="search" className="mt-7 flex max-w-lg gap-2 rounded-[14px] bg-surface p-1.5 shadow-[var(--shadow-soft)]">
            <label className="flex flex-1 items-center gap-2.5 pl-3"><Icon name="search" size={18} className="text-muted" /><span className="sr-only">Search listings</span>
              <input name="q" type="search" placeholder="Search for anything" className="h-11 w-full bg-transparent text-base outline-none placeholder:text-[#7b877f]" /></label>
            <button className="btn btn-primary">Search</button>
          </form>
          <nav aria-label="Shortcuts" className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[0.9375rem] font-medium">
            {trendRows.length > 0 && <a href="#trending" className="flex items-center gap-2 hover:text-brand"><Icon name="trend" size={17} className="text-[#a4491f]" />Trending</a>}
            <Link href="/requests" className="flex items-center gap-2 hover:text-brand"><Icon name="request" size={17} className="text-brand" />Requests</Link>
            <Link href="/lost-found" className="flex items-center gap-2 hover:text-brand"><Icon name="bag" size={17} className="text-[#8a5a00]" />Lost and found</Link>
          </nav>
        </div>
      </section>

      {/* Categories */}
      {cats.data && cats.data.length > 0 && (
        <section aria-labelledby="cats" className="card mt-8 p-5 sm:p-6">
          <div className="mb-4 flex items-baseline justify-between"><h2 id="cats" className="text-[1.375rem] font-semibold tracking-tight">Browse by category</h2><Link href="/explore" className="section-link">All listings</Link></div>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {cats.data.map((c, n) => (
              <li key={c.id}><Link href={`/explore?cat=${c.id}`} className="card-link flex flex-col items-center gap-3 rounded-[12px] border border-line px-2 py-5 text-[0.9375rem] font-medium">
                <span className={`grid size-12 place-items-center rounded-full ${TINTS[n % TINTS.length]}`}><Icon name={CATEGORY_ICON[c.slug] ?? "tag"} size={22} /></span>{c.name}</Link></li>))}
          </ul>
        </section>)}

      {/* Trending: only when real saves exist */}
      {trendRows.length > 0 && (
        <section id="trending" aria-labelledby="trend-h" className="mt-12 scroll-mt-24">
          {head("trend-h", "trend", "Trending on the campus", "Most saved in the last 7 days", "/explore", "Explore more")}{grid(trendRows)}
        </section>)}

      <section aria-labelledby="recent" className="mt-12">
        {head("recent", "tag", "Recently listed", null, "/explore", "View all")}
        {recentRows.length ? grid(recentRows) : (
          <div className="card flex flex-col items-start gap-1 p-8">
            <p className="text-xl font-semibold tracking-tight">Nothing is listed yet.</p>
            <p className="text-muted">Listings from verified students at {uniName} will appear here. Yours can be the first.</p>
            <Link href="/sell" className="btn btn-primary mt-5">Post a listing</Link>
          </div>)}
      </section>

      {/* Trust, stated plainly */}
      <section aria-label="How f!nd works" className="mt-12 grid gap-4 md:grid-cols-[repeat(4,1fr)_1.35fr]">
        {TRUST.map((t) => (
          <div key={t.title} className="card p-5 text-center"><span className="tint-green mx-auto grid size-11 place-items-center rounded-full"><Icon name={t.icon} size={20} /></span>
            <p className="mt-3 text-[0.9375rem] font-semibold">{t.title}</p><p className="t-meta mt-1 text-[0.8125rem] leading-snug">{t.body}</p></div>))}
        <div className="flex flex-col justify-center rounded-[14px] bg-[var(--color-footer)] p-6 text-white md:col-span-1">
          <p className="text-xl font-semibold leading-snug tracking-tight">Have something to sell?</p>
          <p className="mt-1.5 text-[0.9375rem] text-white/75">Photograph it, set a price, and students nearby can find it.</p>
          <Link href="/sell" className="btn mt-5 self-start bg-white text-[var(--color-footer)] hover:bg-white/90">Sell an item <Icon name="arrow" size={16} /></Link>
        </div>
      </section>

      {/* Requests and Lost and found */}
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <section aria-labelledby="req-h" className="card p-5 sm:p-6">
          {head("req-h", "request", "Recent requests", null, "/requests", "View all")}
          {reqs.data?.length ? (
            <ul className="divide-y divide-line">{reqs.data.map((r) => {
              const who = (r.profiles as unknown as { display_name: string } | null)?.display_name ?? "S";
              return (<li key={r.id}><Link href={`/requests/${r.id}`} className="flex items-center gap-3.5 py-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-footer)] text-sm font-semibold text-white" aria-hidden="true">{who.charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{r.title}</span>
                  <span className="t-meta block text-[0.8125rem]">{r.budget_minor != null ? `Budget ${formatMoney(r.budget_minor, r.currency_code)} · ` : ""}{timeAgo(r.created_at)}</span></span>
                <span className="tag">Open</span></Link></li>);
            })}</ul>
          ) : <p className="text-muted">No open requests. <Link href="/requests/new" className="link">Ask for something you need.</Link></p>}
        </section>
        <section aria-labelledby="lf-h" className="card p-5 sm:p-6">
          {head("lf-h", "bag", "Lost and found", null, "/lost-found", "View all")}
          {lost.data?.length ? (
            <ul className="divide-y divide-line">{lost.data.map((r) => (
              <li key={r.id}><Link href={`/lost-found/${r.id}`} className="flex items-center gap-3.5 py-3">
                <span className="size-14 shrink-0 overflow-hidden rounded-[10px] bg-[var(--color-mint)]">{/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.image_path && lfUrls.get(r.image_path) && <img src={lfUrls.get(r.image_path) ?? undefined} alt="" className="size-full object-cover" />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{r.kind === "lost" ? "Lost" : "Found"}: {r.title}</span>
                  <span className="t-meta block text-[0.8125rem]">{r.area} · {timeAgo(r.created_at)}</span></span>
                <span className={`tag ${r.kind === "lost" ? "tag-blue" : ""}`}>{r.kind === "lost" ? "Lost" : "Found"}</span></Link></li>))}</ul>
          ) : <p className="text-muted">Nothing reported. <Link href="/lost-found/new" className="link">Report an item.</Link></p>}
        </section>
      </div>
    </main>
  );
}
