import { CONDITIONS } from "@/lib/listings/schema";
import { parseMinor } from "@/lib/money";

export const SORTS = ["relevant", "new", "price_asc", "price_desc"] as const;
export type Sort = (typeof SORTS)[number];
export const SORT_LABEL: Record<Sort, string> = { relevant: "Most relevant", new: "Newest", price_asc: "Price: low to high", price_desc: "Price: high to low" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export type ExploreQuery = {
  q: string | null; cat: string | null; min: number | null; max: number | null;
  conds: string[]; sort: Sort; cursor: { at: string | null; id: string | null; price: number | null; offset: number | null } | null;
};

export const defaultSort = (q: string | null): Sort => (q ? "relevant" : "new");

/** Turns untrusted URL parameters into a safe query. Garbage is dropped, never passed to the database. */
export function parseExplore(sp: Raw): ExploreQuery {
  const q = (one(sp.q) ?? "").trim().slice(0, 100) || null;
  const catRaw = one(sp.cat);
  let min = one(sp.min) ? parseMinor(one(sp.min)!) : null;
  let max = one(sp.max) ? parseMinor(one(sp.max)!) : null;
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  const condRaw = ([] as string[]).concat(sp.cond ?? []);
  const sortRaw = one(sp.sort);
  // With a search term the default is relevance; without one "relevant" is meaningless, so it falls back to newest.
  const valid = (SORTS as readonly string[]).includes(sortRaw ?? "") && (sortRaw !== "relevant" || q !== null);
  const sort: Sort = valid ? (sortRaw as Sort) : defaultSort(q);
  const id = one(sp.after), at = one(sp.at), price = one(sp.price), off = one(sp.off);
  const atOk = at && !Number.isNaN(Date.parse(at)) ? new Date(at).toISOString() : null;
  const priceOk = price && /^\d{1,12}$/.test(price) ? Number(price) : null;
  const offsetOk = off && /^\d{1,5}$/.test(off) ? Number(off) : null;
  const cursor = sort === "relevant"
    ? (offsetOk !== null ? { at: null, id: null, price: null, offset: offsetOk } : null)
    : id && UUID.test(id) && (sort === "new" ? atOk : priceOk !== null) ? { at: atOk, id, price: priceOk, offset: null } : null;
  return {
    q, cat: catRaw && UUID.test(catRaw) ? catRaw : null, min, max,
    conds: [...new Set(condRaw.filter((c) => (CONDITIONS as readonly string[]).includes(c)))], sort, cursor,
  };
}

/** Query string for links that keep the current filters (cursor excluded unless given). */
export function exploreHref(sp: Raw, overrides: Record<string, string | string[] | null> = {}, keepCursor = false): string {
  const p = new URLSearchParams();
  const merged: Raw = { ...sp }; for (const [k, v] of Object.entries(overrides)) merged[k] = v ?? undefined;
  for (const k of ["q", "cat", "min", "max", "sort"]) { const v = one(merged[k]); if (v) p.set(k, v); }
  ([] as string[]).concat(merged.cond ?? []).forEach((c) => p.append("cond", c));
  if (keepCursor) for (const k of ["at", "after", "price", "off"]) { const v = one(merged[k]); if (v) p.set(k, v); }
  const s = p.toString(); return s ? `/explore?${s}` : "/explore";
}
