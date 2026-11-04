"use server";
import { parseExplore } from "@/lib/explore-params";
import { runExplore, type ExploreCursor, type ExploreResult } from "@/lib/listings/explore";

/** Next page for the current filters. Everything from the browser is re-validated; the cursor is only ever a position, never SQL. */
export async function loadMore(params: Record<string, string | string[]>, cursor: ExploreCursor): Promise<ExploreResult> {
  const q = parseExplore({ ...params, after: cursor.id ?? undefined, at: cursor.at ?? undefined, price: cursor.price === null ? undefined : String(cursor.price), off: cursor.offset === null ? undefined : String(cursor.offset) });
  if (!q.cursor) return { items: [], next: null, error: true };
  return runExplore(q);
}
