"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" }, { href: "/explore", label: "Explore", icon: "search" },
  { href: "/sell", label: "Sell", icon: "plus" }, { href: "/messages", label: "Messages", icon: "chat" }, { href: "/you", label: "You", icon: "user" },
];

/** One navigation on every screen size: a floating dock. Only the active destination shows its name. */
export function AppNav({ unread = 0 }: { unread?: number }) {
  const path = usePathname();
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[var(--z-nav)] flex justify-center px-4">
      <ul className="flex items-center gap-1 rounded-full bg-[var(--ink)] p-1.5 shadow-[0_12px_40px_rgb(17_26_21/0.28)]">
        {ITEMS.map((i) => {
          const on = active(i.href), sell = i.href === "/sell";
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={on ? "page" : undefined}
                className={`relative flex h-12 items-center gap-2 rounded-full px-3.5 text-[0.875rem] font-medium transition-[background-color,color,padding] duration-200 ${on ? "bg-white text-[var(--ink)]" : sell ? "bg-brand px-4 text-white" : "text-white/70 hover:text-white"}`}>
                <Icon name={i.icon} size={20} />
                <span className={on ? "" : "sr-only"}>{i.label}</span>
                {i.href === "/messages" && unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 grid min-w-[1.0625rem] place-items-center rounded-full bg-[#e8b23a] px-1 text-[0.625rem] font-bold leading-[1.0625rem] text-[var(--ink)]">
                    <span className="sr-only">Unread: </span>{unread > 99 ? "99+" : unread}</span>)}
              </Link>
            </li>);
        })}
      </ul>
    </nav>
  );
}
