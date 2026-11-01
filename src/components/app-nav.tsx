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
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] border-t border-line bg-surface pb-safe md:inset-y-0 md:right-auto md:w-56 md:border-r md:border-t-0 md:p-4">
      <Link href="/" className="mb-4 hidden px-3 text-3xl md:block" aria-label="f!nd home"><Wordmark /></Link>
      <ul className="flex md:flex-col md:gap-1">
        {ITEMS.map((i) => (
          <li key={i.href} className="flex-1 md:flex-none">
            <Link href={i.href} aria-current={active(i.href) ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs md:min-h-11 md:flex-row md:justify-start md:gap-3 md:rounded-[var(--radius-md)] md:px-3 md:text-sm ${active(i.href) ? "font-semibold text-brand md:bg-bg" : "text-muted"}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={i.d} /></svg>
              {i.label}
              {i.href === "/messages" && unread > 0 && <span className="rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white"><span className="sr-only">Unread: </span>{unread > 99 ? "99+" : unread}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
