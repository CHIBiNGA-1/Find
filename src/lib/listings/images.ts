/** Move one item within a list (drag/keyboard reordering). Out-of-range moves are clamped; the input is never mutated. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length) return [...list];
  const target = Math.max(0, Math.min(list.length - 1, to));
  const next = [...list]; const [item] = next.splice(from, 1); next.splice(target, 0, item as T);
  return next;
}
export const MAX_IMAGES = 8;
/** How many of the chosen files can still be accepted. */
export function roomFor(existing: number, chosen: number): number { return Math.max(0, Math.min(chosen, MAX_IMAGES - existing)); }
