"use client";
import { useState, useTransition } from "react";
import { ListingCard } from "@/components/listing-card";
import { loadMore } from "@/app/(app)/explore/actions";
import type { ExploreCursor, ExploreItem } from "@/lib/listings/explore";

/** Results append in place, so scroll position and context are never lost. */
export function ResultsGrid({ initial, next: initialNext, params, currency }: { initial: ExploreItem[]; next: ExploreCursor | null; params: Record<string, string | string[]>; currency: string }) {
  const [items, setItems] = useState(initial), [next, setNext] = useState(initialNext), [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  return (<>
    <ul className="grid-listings">
      {items.map((l, i) => <li key={l.id}><ListingCard id={l.id} title={l.title} priceMinor={l.priceMinor} currency={currency} condition={l.condition} image={l.image} publishedAt={l.publishedAt} priority={i < 4} /></li>)}
    </ul>
    <div className="mt-10 flex flex-col items-center gap-3">
      {failed && <p role="alert" className="err">Couldn&rsquo;t load more. Check your connection and try again.</p>}
      {next && <button type="button" disabled={pending} className="btn btn-quiet min-w-48" onClick={() => start(async () => {
        setFailed(false);
        try { const r = await loadMore(params, next); if (r.error) { setFailed(true); return; } setItems((l) => [...l, ...r.items.filter((x) => !l.some((y) => y.id === x.id))]); setNext(r.next); }
        catch { setFailed(true); }
      })}>{pending ? "Loading…" : "Show more"}</button>}
      {!next && items.length > 12 && <p className="t-meta">That&rsquo;s everything.</p>}
    </div>
  </>);
}
