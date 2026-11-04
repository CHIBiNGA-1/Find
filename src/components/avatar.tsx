/** Initial on a flat tile. Deterministic, no remote image to load or leak. */
export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  return <span aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.42 }} className="grid shrink-0 place-items-center rounded-[var(--radius-md)] bg-brand-tint font-extrabold text-brand-strong">{name.charAt(0).toUpperCase()}</span>;
}
