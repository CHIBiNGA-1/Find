export type Category = { id: string; slug: string; name: string; parent_id: string | null };
export type CategoryNode = Category & { children: Category[] };

/** Groups a flat category list into parents with children, both sorted by name. */
export function categoryTree(rows: Category[]): CategoryNode[] {
  // Alphabetical, with the catch-all "other" always last.
  const byName = (a: Category, b: Category) => (a.slug === "other" ? 1 : b.slug === "other" ? -1 : a.name.localeCompare(b.name));
  return rows.filter((c) => !c.parent_id).sort(byName)
    .map((p) => ({ ...p, children: rows.filter((c) => c.parent_id === p.id).sort(byName) }));
}
/** The parent id for any category id (itself when top-level). */
export function topLevelOf(rows: Category[], id: string | null | undefined): string | null {
  const c = rows.find((r) => r.id === id);
  return c ? (c.parent_id ?? c.id) : null;
}
