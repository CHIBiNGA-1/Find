"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { Icon, type IconName } from "@/components/icons";

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" }, { href: "/explore", label: "Explore", icon: "search" },
  { href: "/sell", label: "Sell", icon: "plus" }, { href: "/messages", label: "Messages", icon: "chat" }, { href: "/you", label: "You", icon: "user" },
];

export function AppNav({ unread = 0 }: { unread?: number }) {
  const path = usePathname();
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  const badge = unread > 0 && <span className="rounded-full bg-brand px-1.5 text-[0.625rem] font-semibold leading-4 text-white"><span className="sr-only">Unread: </span>{unread > 99 ? "99+" : unread}</span>;
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[var(--z-nav)] hidden h-16 border-b border-line bg-surface md:block">
        <div className="mx-auto flex h-full max-w-[var(--width-content)] items-center justify-between px-[var(--space-gutter)]">
          <Link href="/" aria-label="f!nd home" className="text-[1.75rem]"><Wordmark /></Link>
          <nav aria-label="Primary" className="flex h-full items-stretch gap-1">
            {ITEMS.map((i) => (
              <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}
                className={`relative flex items-center gap-2 px-4 text-[0.9375rem] font-medium transition-colors ${active(i.href) ? "text-brand" : "text-muted hover:text-ink"}`}>
                <Icon name={i.icon} size={18} />{i.label}{i.href === "/messages" && badge}
                {active(i.href) && <span aria-hidden="true" className="absolute inset-x-4 bottom-0 h-0.5 bg-brand" />}
              </Link>))}
          </nav>
        </div>
      </header>
      <nav aria-label="Primary, mobile" className="pb-safe fixed inset-x-0 bottom-0 z-[var(--z-nav)] border-t border-line bg-surface md:hidden">
        <ul className="grid grid-cols-5">
          {ITEMS.map((i) => {
            const on = active(i.href), sell = i.href === "/sell";
            return (
              <li key={i.href}><Link href={i.href} aria-current={on ? "page" : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium ${on ? "text-brand" : "text-muted"}`}>
                {on && <span aria-hidden="true" className="absolute inset-x-5 top-0 h-0.5 bg-brand" />}
                <span className={sell ? "grid size-8 place-items-center rounded-[var(--radius-md)] bg-brand text-white" : ""}><Icon name={i.icon} size={20} /></span>
                <span className="flex items-center gap-1">{i.label}{i.href === "/messages" && badge}</span></Link></li>);
          })}
        </ul>
      </nav>
    </>
  );
}
