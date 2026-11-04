import "server-only";
import { getContext } from "@/lib/session";
import { coverImages } from "@/lib/listings/queries";
import type { ExploreQuery } from "@/lib/explore-params";

export type ExploreItem = { id: string; title: string; priceMinor: number; condition: string; publishedAt: string | null; image?: string };
export type ExploreCursor = { at: string | null; id: string | null; price: number | null; offset: number | null };
export type ExploreResult = { items: ExploreItem[]; next: ExploreCursor | null; error: boolean };
const PAGE = 24;

/** One place that runs the marketplace search, so the page and the "show more" action can never disagree. */
export async function runExplore(query: ExploreQuery): Promise<ExploreResult> {
  const { supabase, universityId } = await getContext();
  const { data, error } = await supabase.rpc("search_listings", {
    uni: universityId, q: query.q, cat: query.cat, min_price: query.min, max_price: query.max,
    conds: query.conds.length ? query.conds : null, sort: query.sort, lim: PAGE + 1,
    cursor_at: query.cursor?.at ?? null, cursor_id: query.cursor?.id ?? null, cursor_price: query.cursor?.price ?? null,
    rank_offset: query.sort === "relevant" ? (query.cursor?.offset ?? 0) : 0,
  });
  if (error) return { items: [], next: null, error: true };
  const rows = (data ?? []) as { id: string; title: string; price_minor: number; condition: string; published_at: string | null }[];
  const page = rows.slice(0, PAGE), last = page[page.length - 1];
  const covers = await coverImages(page.map((r) => r.id));
  return {
    error: false,
    items: page.map((r) => ({ id: r.id, title: r.title, priceMinor: r.price_minor, condition: r.condition, publishedAt: r.published_at, image: covers.get(r.id)?.url })),
    next: rows.length > PAGE && last
      ? (query.sort === "relevant"
          ? { at: null, id: null, price: null, offset: (query.cursor?.offset ?? 0) + PAGE }
          : { at: last.published_at, id: last.id, price: last.price_minor, offset: null })
      : null,
  };
}
