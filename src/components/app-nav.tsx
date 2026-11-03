"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { Wordmark } from "@/components/wordmark";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/explore", label: "Explore", icon: "search" },
  { href: "/sell", label: "Sell", icon: "plus" },
  { href: "/messages", label: "Messages", icon: "chat" },
  { href: "/you", label: "You", icon: "user" },
];
const LINKS = [{ href: "/explore", label: "Explore" }, { href: "/requests", label: "Requests" }, { href: "/lost-found", label: "Lost and found" }];

function Badge({ n }: { n: number }) {
  return (
    <span className="absolute -right-2 -top-1.5 grid min-w-[1.125rem] place-items-center rounded-full bg-hl px-1 text-[0.6875rem] font-extrabold leading-[1.125rem] text-ink">
      <span className="sr-only">Unread: </span>{n > 99 ? "99+" : n}
    </span>
  );
}

/** Desktop: a top bar with search. Mobile: a slim top bar plus a full-width tab bar, labels always visible. */
export function AppNav({ unread = 0 }: { unread?: number }) {
  const path = usePathname();
  const on = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="wrap flex h-16 items-center gap-6">
          <Link href="/" aria-label="f!nd home" className="text-[2.125rem]"><Wordmark /></Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} aria-current={on(l.href) ? "page" : undefined}
                className="rounded-full px-3.5 py-2 text-[0.9375rem] font-semibold text-muted transition-colors hover:text-ink aria-[current=page]:bg-ink aria-[current=page]:text-white">{l.label}</Link>))}
          </nav>
          <form action="/explore" method="get" role="search" className="ml-auto hidden max-w-sm flex-1 md:block">
            <label className="relative block"><span className="sr-only">Search listings</span>
              <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input name="q" type="search" placeholder="Search listings" className="field !min-h-10 !rounded-full !pl-10" /></label>
          </form>
          <div className="ml-auto flex items-center gap-4 md:ml-0">
            <Link href="/explore" aria-label="Search" className="grid size-10 place-items-center md:hidden"><Icon name="search" size={22} /></Link>
            <Link href="/messages" aria-label="Messages" className="relative hidden size-10 place-items-center md:grid"><Icon name="chat" size={22} />{unread > 0 && <Badge n={unread} />}</Link>
            <Link href="/you" aria-label="You" className="hidden size-10 place-items-center md:grid"><Icon name="user" size={22} /></Link>
            <Link href="/sell" className="btn btn-primary btn-sm hidden md:inline-flex"><Icon name="plus" size={18} />Sell</Link>
          </div>
        </div>
      </header>

      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid h-[var(--bar-h)] grid-cols-5">
          {TABS.map((t) => {
            const active = on(t.href), sell = t.href === "/sell";
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={active ? "page" : undefined}
                  className={`relative flex h-full flex-col items-center justify-center gap-1 text-[0.75rem] font-semibold ${active ? "text-brand" : "text-muted"}`}>
                  {sell
                    ? <span className="grid h-9 w-12 place-items-center rounded-[10px] bg-brand text-white"><Icon name="plus" size={22} /></span>
                    : <span className="relative"><Icon name={t.icon} size={24} />{t.href === "/messages" && unread > 0 && <Badge n={unread} />}</span>}
                  <span className={sell ? "text-ink" : ""}>{t.label}</span>
                  {active && !sell && <span aria-hidden="true" className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-brand" />}
                </Link>
              </li>);
          })}
        </ul>
      </nav>
    </>
  );
}
