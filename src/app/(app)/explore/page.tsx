import Link from "next/link";
import { getContext } from "@/lib/session";
import { parseExplore, exploreHref, defaultSort, SORT_LABEL } from "@/lib/explore-params";
import { runExplore } from "@/lib/listings/explore";
import { categoryTree, type Category } from "@/lib/categories";
import { minorToInput } from "@/lib/money";
import { CONDITION_LABEL, type CONDITIONS } from "@/lib/listings/schema";
import { ResultsGrid } from "@/components/results-grid";
import { EmptyState } from "@/components/empty-state";
import { FilterSheet } from "@/components/filter-sheet";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Explore" };
type SP = Record<string, string | string[] | undefined>;

export default async function Explore({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const query = parseExplore(sp);
  const { supabase, currency } = await getContext();
  const [{ data: catRows }, res] = await Promise.all([supabase.from("categories").select("id, slug, name, parent_id"), runExplore(query)]);
  const result = res;
  const tree = categoryTree((catRows ?? []) as Category[]);
  const selected = (catRows ?? []).find((c) => c.id === query.cat);
  const parent = tree.find((p) => p.id === (selected?.parent_id ?? selected?.id));

  // Links rebuild from the *validated* query, so a malformed URL can never leak back into the page.
  const base: SP = { q: query.q ?? undefined, cat: query.cat ?? undefined, min: query.min !== null ? minorToInput(query.min) : undefined, max: query.max !== null ? minorToInput(query.max) : undefined, cond: query.conds, sort: query.sort === defaultSort(query.q) ? undefined : query.sort };
  const href = (o: Record<string, string | string[] | null>) => exploreHref(base, o);
  const filterCount = (query.min !== null ? 1 : 0) + (query.max !== null ? 1 : 0) + query.conds.length + (query.sort !== defaultSort(query.q) ? 1 : 0);
  const hasAny = !!(query.q || query.cat || filterCount);
  const active: { label: string; remove: string }[] = [
    ...(query.min !== null ? [{ label: `From ${minorToInput(query.min)}`, remove: href({ min: null }) }] : []),
    ...(query.max !== null ? [{ label: `Up to ${minorToInput(query.max)}`, remove: href({ max: null }) }] : []),
    ...query.conds.map((c) => ({ label: CONDITION_LABEL[c as (typeof CONDITIONS)[number]], remove: href({ cond: query.conds.filter((x) => x !== c) }) })),
    ...(query.sort !== defaultSort(query.q) ? [{ label: SORT_LABEL[query.sort], remove: href({ sort: null }) }] : []),
  ];
  const gridParams: Record<string, string | string[]> = Object.fromEntries(Object.entries(base).filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length))) as Record<string, string | string[]>;

  return (
    <main>
      <h1 className="t-page">{selected ? selected.name : query.q ? `\u201c${query.q}\u201d` : "Explore"}</h1>

      <form role="search" id="explore-filters" className="relative mt-5 max-w-2xl">
        {query.cat && <input type="hidden" name="cat" value={query.cat} />}
        <label><span className="sr-only">Search listings</span>
          <Icon name="search" size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" type="search" defaultValue={query.q ?? ""} placeholder="Search listings" className="field !pl-12 !pr-28" /></label>
        <button type="submit" className="btn btn-primary btn-sm absolute right-2 top-1/2 -translate-y-1/2">Search</button>
      </form>

      <div className="mt-4 space-y-3">
        <ul className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)]">
          <li className="shrink-0"><FilterSheet count={filterCount} sort={query.sort} hasQuery={!!query.q} min={query.min !== null ? minorToInput(query.min) : ""} max={query.max !== null ? minorToInput(query.max) : ""} conds={query.conds} currency={currency} resetHref={href({ min: null, max: null, cond: [], sort: null })} /></li>
          <li className="shrink-0"><Link href={href({ cat: null })} className="chip" aria-current={!query.cat ? "true" : undefined}>All</Link></li>
          {tree.map((c) => <li key={c.id} className="shrink-0"><Link href={href({ cat: c.id })} className="chip" aria-current={parent?.id === c.id && (selected?.id === c.id) ? "true" : undefined}>{c.name}</Link></li>)}
        </ul>
        {parent && parent.children.length > 0 && (
          <ul aria-label={`${parent.name} subcategories`} className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)]">
            {parent.children.map((c) => <li key={c.id} className="shrink-0"><Link href={href({ cat: c.id })} className="chip !min-h-9 !text-[0.85rem]" aria-current={selected?.id === c.id ? "true" : undefined}>{c.name}</Link></li>)}
          </ul>)}
        {active.length > 0 && (
          <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
            {active.map((a) => <li key={a.label}><Link href={a.remove} className="tag" aria-label={`Remove filter: ${a.label}`}>{a.label}<Icon name="close" size={14} className="ml-1" /></Link></li>)}
            <li><Link href={href({ min: null, max: null, cond: [], sort: null })} className="link-quiet">Clear all</Link></li>
          </ul>)}
      </div>

      <div className="mt-8">
        {result.error ? (
          <p role="alert" className="note note-danger">Search isn&rsquo;t working right now. Try again in a moment.</p>
        ) : result.items.length === 0 ? (
          <EmptyState title="No listings match." hint={query.q ? "Check the spelling, try a shorter word, or remove a filter." : "Try removing a filter."} href={hasAny ? "/explore" : "/sell"} action={hasAny ? "Clear everything" : "List the first item"} />
        ) : (<>
          <p className="t-meta mb-4" aria-live="polite">{result.next ? `${result.items.length}+ listings` : `${result.items.length} listing${result.items.length === 1 ? "" : "s"}`}</p>
          <ResultsGrid key={JSON.stringify(gridParams)} initial={result.items} next={result.next} params={gridParams} currency={currency} />
        </>)}
      </div>
    </main>
  );
}
