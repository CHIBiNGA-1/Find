const PATHS = {
  book: "M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z",
  laptop: "M5 6h14v9H5zM3 19h18",
  chair: "M7 4h10v7H7zM6 11h12v3H6zM8 14v6M16 14v6",
  shirt: "M8 4 3 7l2 4 3-1v10h8V10l3 1 2-4-5-3a4 4 0 0 1-8 0z",
  wrench: "M15 4a4 4 0 0 0-3.6 5.6L4 17l3 3 7.4-7.4A4 4 0 0 0 20 9l-3 3-2.5-.5L14 9l3-3z",
  box: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
  tag: "M3 12V4h8l10 10-8 8zM7.5 8.5h.01",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  request: "M5 4h14v16H5zM9 9h6M9 13h6M9 17h3",
  bag: "M6 8h12l1 12H5zM9 8a3 3 0 0 1 6 0",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4",
  chat: "M4 5h16v11H9l-5 4z",
  lock: "M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  pin: "M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16l-4-4",
  home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  plus: "M12 5v14M5 12h14",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0",
  arrow: "M5 12h14M13 6l6 6-6 6",
  bookmark: "M6 4h12v17l-6-4-6 4z",
  sliders: "M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6",
} as const;
export type IconName = keyof typeof PATHS;

/** One icon set, one stroke weight. Decorative by default; pass `label` when it carries meaning. */
export function Icon({ name, size = 20, className = "", label, filled = false }: { name: IconName; size?: number; className?: string; label?: string; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className} {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}><path d={PATHS[name]} /></svg>
  );
}
export const CATEGORY_ICON: Record<string, IconName> = { textbooks: "book", electronics: "laptop", furniture: "chair", clothing: "shirt", services: "wrench", other: "box" };
