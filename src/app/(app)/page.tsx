import Link from "next/link";
import { getContext } from "@/lib/session";
import { coverImages } from "@/lib/listings/queries";
import { ListingCard } from "@/components/listing-card";

export const dynamic = "force-dynamic";

type ListingRow = {
  id: string; title: string; price_minor: number;
  currency_code: string; condition: string;
};

export default async function Home() {
  const { supabase, universityId, currency } = await getContext();

  const [{ data: rawListings }, { data: categories }] = await Promise.all([
    supabase.rpc("search_listings", { uni: universityId, lim: 16 }),
    supabase.from("categories").select("id, slug, name").order("name"),
  ]);

  const listings = (rawListings ?? []) as ListingRow[];
  const covers = await coverImages(listings.map((l) => l.id));

  // Category icons map (slug → emoji fallback)
  const catIcon: Record<string, string> = {
    textbooks: "📚", electronics: "💻", furniture: "🪑",
    clothing: "👕", services: "🔧", other: "📦",
  };

  return (
    <main>
      {/* Hero */}
      <section>
        <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
          What does your campus<br className="hidden sm:block" /> have for you?
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Buy, sell, swap and find things — only with verified students at your university.
        </p>

        {/* Search bar */}
        <form action="/explore" method="get" role="search" className="mt-5 flex max-w-xl gap-2">
          <input
            name="q"
            type="search"
            aria-label="Search listings"
            placeholder="Search for anything…"
            className="flex-1 min-h-11 rounded-[var(--radius-md)] border border-line bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            type="submit"
            className="min-h-11 rounded-[var(--radius-md)] bg-brand px-5 font-medium text-white"
          >
            Search
          </button>
        </form>
      </section>

      {/* Campus quick-links */}
      <nav aria-label="Campus sections" className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link href="/sell" className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-md)] bg-brand px-4 font-medium text-white">
          + Sell something
        </Link>
        <Link href="/requests" className="inline-flex min-h-10 items-center rounded-[var(--radius-md)] border border-line bg-surface px-4">
          Requests
        </Link>
        <Link href="/lost-found" className="inline-flex min-h-10 items-center rounded-[var(--radius-md)] border border-line bg-surface px-4">
          Lost &amp; found
        </Link>
        <Link href="/messages" className="inline-flex min-h-10 items-center rounded-[var(--radius-md)] border border-line bg-surface px-4">
          Messages
        </Link>
      </nav>

      {/* Category pills */}
      {categories && categories.length > 0 && (
        <section aria-label="Browse by category" className="mt-8">
          <h2 className="mb-3 font-semibold">Browse by category</h2>
          <ul className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/explore?cat=${c.id}`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm hover:border-brand hover:text-brand transition-colors"
                >
                  <span aria-hidden="true">{catIcon[c.slug] ?? "🏷️"}</span>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent listings */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Recently listed</h2>
          <Link href="/explore" className="text-sm text-brand underline-offset-2 hover:underline">
            See all →
          </Link>
        </div>

        {listings.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((l) => (
              <li key={l.id}>
                <ListingCard
                  id={l.id}
                  title={l.title}
                  priceMinor={l.price_minor}
                  currency={currency}
                  condition={l.condition}
                  image={covers.get(l.id)?.url}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-[var(--radius-md)] border border-line bg-surface px-6 py-10 text-center">
            <p className="font-medium">Nothing listed yet.</p>
            <p className="mt-1 text-sm text-muted">Be the first — it only takes a minute.</p>
            <Link
              href="/sell"
              className="mt-4 inline-flex min-h-10 items-center rounded-[var(--radius-md)] bg-brand px-5 text-sm font-medium text-white"
            >
              Post a listing
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
