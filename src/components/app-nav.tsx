"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/wordmark";

const ITEMS = [
  { href: "/", label: "Home", d: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/explore", label: "Explore", d: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16l-4-4" },
  { href: "/sell", label: "Sell", d: "M12 5v14M5 12h14" },
  { href: "/messages", label: "Messages", d: "M4 5h16v11H9l-5 4z" },
  { href: "/you", label: "You", d: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0" },
] as const;

export function AppNav({ unread = 0 }: { unread?: number }) {
  const path = usePathname();
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <nav aria-label="Primary" className="pb-safe fixed inset-x-0 bottom-0 z-[var(--z-nav)] border-t border-line bg-surface md:inset-y-0 md:right-auto md:flex md:w-60 md:flex-col md:border-r md:border-t-0 md:px-5 md:py-7">
      <Link href="/" aria-label="f!nd home" className="mb-10 hidden text-[1.75rem] md:block"><Wordmark /></Link>
      <ul className="grid grid-cols-5 md:block md:space-y-0.5">
        {ITEMS.map((i) => {
          const on = active(i.href), sell = i.href === "/sell";
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={on ? "page" : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors md:min-h-11 md:flex-row md:justify-start md:gap-3 md:rounded-[var(--radius-md)] md:px-3 md:text-[0.9375rem] ${on ? "text-ink md:bg-bg" : "text-muted hover:text-ink"}`}>
                {on && <span aria-hidden="true" className="absolute inset-x-5 top-0 h-0.5 bg-brand md:inset-x-auto md:bottom-2.5 md:left-0 md:top-2.5 md:h-auto md:w-0.5" />}
                <span className={sell ? "grid size-8 place-items-center rounded-[var(--radius-md)] bg-brand text-white md:size-5 md:rounded-none md:bg-transparent md:text-current" : ""}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={i.d} /></svg>
                </span>
                <span>{i.label}</span>
                {i.href === "/messages" && unread > 0 && (
                  <span className="absolute right-[calc(50%-1.5rem)] top-1.5 min-w-4 rounded-full bg-brand px-1 text-center text-[0.625rem] font-semibold leading-4 text-white md:static md:ml-auto">
                    <span className="sr-only">Unread: </span>{unread > 99 ? "99+" : unread}
                  </span>)}
              </Link>
            </li>);
        })}
      </ul>
      <div className="mt-8 hidden border-t border-line pt-5 md:block">
        <p className="t-label mb-2 px-3">Campus</p>
        {([{ h: "/requests", l: "Requests" }, { h: "/lost-found", l: "Lost and found" }] as const).map(({ h, l }) => (
          <Link key={h} href={h} className={`flex min-h-10 items-center rounded-[var(--radius-md)] px-3 text-[0.9375rem] transition-colors ${path.startsWith(h) ? "text-ink" : "text-muted hover:text-ink"}`}>{l}</Link>))}
      </div>
    </nav>
  );
}
