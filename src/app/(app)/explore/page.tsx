import Link from "next/link";
import { getContext } from "@/lib/session";
import { coverImages } from "@/lib/listings/queries";
import { parseMinor } from "@/lib/money";
import { CONDITIONS, CONDITION_LABEL } from "@/lib/listings/schema";
import { ListingCard } from "@/components/listing-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Explore" };

const PAGE = 24;
type SP = {
  q?: string; cat?: string; min?: string; max?: string;
  cond?: string | string[]; at?: string; after?: string;
};
type ListingRow = {
  id: string; title: string; price_minor: number;
  currency_code: string; condition: string; published_at: string | null;
};

export default async function Explore({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, universityId, currency } = await getContext();
  const conds = ([] as string[]).concat(sp.cond ?? []).filter((c) => (CONDITIONS as readonly string[]).includes(c));

  const [{ data: categories }, { data: rows, error }] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase.rpc("search_listings", {
      uni: universityId, q: sp.q || null, cat: sp.cat || null,
      min_price: sp.min ? (parseMinor(sp.min) ?? null) : null,
      max_price: sp.max ? (parseMinor(sp.max) ?? null) : null,
      conds: conds.length ? conds : null,
      cursor_at: sp.at || null, cursor_id: sp.after || null, lim: PAGE + 1,
    }),
  ]);

  const page = ((rows ?? []) as ListingRow[]).slice(0, PAGE);
  const next = rows && rows.length > PAGE ? page[page.length - 1] : null;
  const covers = await coverImages(page.map((r) => r.id));

  // Build the current query string (for pagination + clear-filter links)
  const qs = new URLSearchParams();
  (["q", "cat", "min", "max"] as const).forEach((k) => sp[k] && qs.set(k, sp[k]!));
  conds.forEach((c) => qs.append("cond", c));

  const hasFilters = !!(sp.q || sp.cat || sp.min || sp.max || conds.length);
  const selectedCat = categories?.find((c) => c.id === sp.cat);

  const inputCls = "min-h-10 rounded-[var(--radius-md)] border border-line bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand";

  return (
    <main>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-serif text-3xl tracking-tight">
          {selectedCat ? selectedCat.name : "Explore"}
        </h1>
        {hasFilters && (
          <Link href="/explore" className="text-sm text-muted hover:text-danger">
            Clear filters
          </Link>
        )}
      </div>

      {/* Filter form */}
      <form role="search" className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5" id="explore-filters">
        {/* Search */}
        <input
          name="q"
          type="search"
          defaultValue={sp.q}
          aria-label="Search listings"
          placeholder="Search…"
          className={`${inputCls} sm:col-span-2 lg:col-span-2`}
        />
        {/* Category */}
        <select name="cat" defaultValue={sp.cat ?? ""} aria-label="Category" className={inputCls}>
          <option value="">All categories</option>
          {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {/* Price range */}
        <div className="flex gap-2">
          <input name="min" inputMode="decimal" defaultValue={sp.min} aria-label="Min price" placeholder="Min" className={`${inputCls} w-full`} />
          <input name="max" inputMode="decimal" defaultValue={sp.max} aria-label="Max price" placeholder="Max" className={`${inputCls} w-full`} />
        </div>
        {/* Submit */}
        <button type="submit" className="min-h-10 rounded-[var(--radius-md)] bg-brand px-4 text-sm font-medium text-white">
          Search
        </button>

        {/* Condition checkboxes – full width row */}
        <fieldset className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-5">
          <legend className="sr-only">Condition</legend>
          {CONDITIONS.map((c) => (
            <label key={c} className="flex min-h-8 cursor-pointer items-center gap-1.5 text-sm">
              <input type="checkbox" name="cond" value={c} defaultChecked={conds.includes(c)} className="accent-brand" />
              {CONDITION_LABEL[c]}
            </label>
          ))}
        </fieldset>
      </form>

      {/* Results header */}
      {!error && page.length > 0 && (
        <p className="mt-5 text-sm text-muted">
          Showing {page.length}{next ? "+" : ""} listing{page.length !== 1 ? "s" : ""}
          {hasFilters && " matching your filters"}
        </p>
      )}

      {/* Errors / empty state */}
      {error && (
        <p role="alert" className="mt-6 text-danger text-sm">
          Search isn&apos;t working right now. Try again in a moment.
        </p>
      )}
      {!error && !page.length && (
        <div className="mt-10 rounded-[var(--radius-md)] border border-line bg-surface px-6 py-10 text-center">
          <p className="font-medium">No listings match.</p>
          <p className="mt-1 text-sm text-muted">Try fewer filters or a simpler search word.</p>
          {hasFilters && (
            <Link href="/explore" className="mt-4 inline-flex min-h-9 items-center rounded-[var(--radius-md)] border border-line px-4 text-sm">
              Clear all filters
            </Link>
          )}
        </div>
      )}

      {/* Grid */}
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {page.map((l) => (
          <li key={l.id}>
            <ListingCard
              id={l.id} title={l.title}
              priceMinor={l.price_minor} currency={currency}
              condition={l.condition} publishedAt={l.published_at} image={covers.get(l.id)?.url}
            />
          </li>
        ))}
      </ul>

      {/* Load more (keyset pagination) */}
      {next && (
        <div className="mt-8 flex justify-center">
          <Link
            href={`/explore?${qs}&at=${encodeURIComponent(next.published_at!)}&after=${next.id}`}
            className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-line bg-surface px-6 text-sm font-medium hover:bg-bg transition-colors"
          >
            Load more listings
          </Link>
        </div>
      )}
    </main>
  );
}
