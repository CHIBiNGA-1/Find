import Link from "next/link";
import { getContext } from "@/lib/session";
import { coverImages } from "@/lib/listings/queries";
import { ListingCard } from "@/components/listing-card";

export const dynamic = "force-dynamic";
type Row = { id: string; title: string; price_minor: number; condition: string };

export default async function Home() {
  const { supabase, universityId, currency } = await getContext();
  const [{ data: rows }, { data: categories }, { data: uni }] = await Promise.all([
    supabase.rpc("search_listings", { uni: universityId, lim: 16 }),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("universities").select("name").eq("id", universityId).maybeSingle(),
  ]);
  const listings = (rows ?? []) as Row[];
  const covers = await coverImages(listings.map((l) => l.id));
  const uniName = uni?.name ?? "your university";

  return (
    <main>
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <div className="max-w-2xl">
          <p className="t-label">{uniName}</p>
          <h1 className="t-display mt-3">What your campus has for you.</h1>
        </div>
        <Link href="/sell" className="btn btn-primary">Sell an item</Link>
      </header>

      <form action="/explore" method="get" role="search" className="mt-8 flex max-w-2xl gap-2">
        <input name="q" type="search" aria-label="Search listings" placeholder="Search textbooks, laptops, furniture" className="field" />
        <button className="btn btn-quiet">Search</button>
      </form>

      <nav aria-label="Browse" className="mt-8 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-y border-line py-3 text-[0.9375rem]">
        <Link href="/explore" className="font-semibold">All</Link>
        {categories?.map((c) => <Link key={c.id} href={`/explore?cat=${c.id}`} className="text-muted transition-colors hover:text-ink">{c.name}</Link>)}
        <span aria-hidden="true" className="hidden h-4 w-px bg-line sm:block" />
        <Link href="/requests" className="text-muted transition-colors hover:text-ink">Requests</Link>
        <Link href="/lost-found" className="text-muted transition-colors hover:text-ink">Lost and found</Link>
      </nav>

      <section className="mt-12" aria-labelledby="recent">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 id="recent" className="t-title">Recently listed</h2>
          {listings.length > 0 && <Link href="/explore" className="link t-meta">View all</Link>}
        </div>
        {listings.length ? (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((l) => (
              <li key={l.id}><ListingCard id={l.id} title={l.title} priceMinor={l.price_minor} currency={currency} condition={l.condition} image={covers.get(l.id)?.url} /></li>
            ))}
          </ul>
        ) : (
          <div className="max-w-md border-t border-line pt-6">
            <p className="t-title">Nothing is listed yet.</p>
            <p className="mt-2 text-muted">Listings from verified students at {uniName} will appear here. Yours can be the first.</p>
            <Link href="/sell" className="btn btn-primary mt-6">Post a listing</Link>
          </div>
        )}
      </section>
    </main>
  );
}
