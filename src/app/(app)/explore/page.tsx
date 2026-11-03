import Link from "next/link";
import { getContext } from "@/lib/session";
import { coverImages } from "@/lib/listings/queries";
import { parseMinor } from "@/lib/money";
import { CONDITIONS, CONDITION_LABEL } from "@/lib/listings/schema";
import { ListingCard } from "@/components/listing-card";
import { Icon } from "@/components/icons";
import { FilterSheet } from "@/components/filter-sheet";

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

  const catHref = (id?: string) => {
    const p = new URLSearchParams(qs); p.delete("cat"); if (id) p.set("cat", id);
    const t = p.toString(); return t ? `/explore?${t}` : "/explore";
  };
  const filterCount = (sp.min ? 1 : 0) + (sp.max ? 1 : 0) + conds.length;

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[clamp(2rem,1.2rem+3vw,3.25rem)] font-extrabold leading-none [font-stretch:80%]">{selectedCat ? selectedCat.name : sp.q ? `Results for \u201c${sp.q}\u201d` : "Explore"}</h1>
        {hasFilters && <Link href="/explore" className="link text-[0.9375rem] font-semibold">Clear filters</Link>}
      </div>

      <form role="search" id="explore-filters" className="mt-6">
        {sp.cat && <input type="hidden" name="cat" value={sp.cat} />}
        <div className="flex max-w-2xl gap-2">
          <label className="relative flex-1"><span className="sr-only">Search listings</span>
            <Icon name="search" size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input name="q" type="search" defaultValue={sp.q} placeholder="Search listings" className="field !pl-12" /></label>
          <button type="submit" className="btn btn-primary">Search</button>
        </div>
      </form>

      <ul className="no-scrollbar -mx-[var(--space-gutter)] mt-5 flex gap-2 overflow-x-auto px-[var(--space-gutter)] py-1">
        <li className="shrink-0">
          <FilterSheet count={filterCount}>
            <div><p className="label mb-2">Price</p>
              <div className="flex gap-2">
                <input form="explore-filters" name="min" inputMode="decimal" defaultValue={sp.min} aria-label="Minimum price" placeholder="Min" className="field" />
                <input form="explore-filters" name="max" inputMode="decimal" defaultValue={sp.max} aria-label="Maximum price" placeholder="Max" className="field" /></div></div>
            <fieldset><legend className="label mb-2">Condition</legend>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map((c) => (
                  <label key={c} className="pick"><input form="explore-filters" type="checkbox" name="cond" value={c} defaultChecked={conds.includes(c)} className="sr-only" />{CONDITION_LABEL[c]}</label>))}
              </div></fieldset>
          </FilterSheet>
        </li>
        <li className="shrink-0"><Link href={catHref()} className="chip" aria-current={!sp.cat ? "true" : undefined}>All</Link></li>
        {categories?.map((c) => <li key={c.id} className="shrink-0"><Link href={catHref(c.id)} className="chip" aria-current={sp.cat === c.id ? "true" : undefined}>{c.name}</Link></li>)}
      </ul>

      {error && <p role="alert" className="mt-8 font-medium text-danger">Search isn&rsquo;t working right now. Try again in a moment.</p>}
      {!error && !page.length && (
        <div className="mt-10 rounded-[var(--radius-lg)] bg-sunken px-6 py-12 text-center">
          <p className="text-[1.5rem] font-bold [font-stretch:88%]">No listings match.</p>
          <p className="t-meta mt-1">Try fewer filters or a simpler search word.</p>
          {hasFilters && <Link href="/explore" className="btn btn-quiet mt-6">Clear all filters</Link>}
        </div>)}
      {!error && page.length > 0 && <p className="t-meta mt-6">{page.length}{next ? "+" : ""} listing{page.length !== 1 ? "s" : ""}</p>}

      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {page.map((l) => (
          <li key={l.id}><ListingCard id={l.id} title={l.title} priceMinor={l.price_minor} currency={currency} condition={l.condition} publishedAt={l.published_at} image={covers.get(l.id)?.url} /></li>))}
      </ul>

      {next && (
        <div className="mt-12 flex justify-center">
          <Link href={`/explore?${qs}&at=${encodeURIComponent(next.published_at!)}&after=${next.id}`} className="btn btn-quiet">Load more listings</Link>
        </div>)}
    </main>
  );
}
