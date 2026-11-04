"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Wordmark } from "@/components/wordmark";
import { createClient } from "@/lib/supabase/client";
import { tap } from "@/lib/haptics";

/** The five destinations, identical on every screen size. */
const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" }, { href: "/explore", label: "Explore", icon: "search" },
  { href: "/sell", label: "Sell", icon: "plus" }, { href: "/messages", label: "Messages", icon: "chat" }, { href: "/you", label: "You", icon: "user" },
];
/** Campus boards live under Home, not beside it. Desktop gets them in the rail; phones reach them from Home. */
const CAMPUS = [{ href: "/requests", label: "Requests", icon: "megaphone" as IconName }, { href: "/lost-found", label: "Lost and found", icon: "pin" as IconName }];

/** Screens that are not a tab get a back button: [pattern, title, where Back goes with no history]. */
const DEEP: [RegExp, string, string][] = [
  [/^\/listing\/[^/]+\/sold$/, "Mark as sold", "/you"], [/^\/listing\//, "Listing", "/explore"], [/^\/sell\//, "Edit listing", "/you"],
  [/^\/requests\/new$/, "Post a request", "/requests"], [/^\/requests\//, "Request", "/requests"], [/^\/requests$/, "Requests", "/"],
  [/^\/lost-found\/new$/, "Report an item", "/lost-found"], [/^\/lost-found\//, "Lost and found", "/lost-found"], [/^\/lost-found$/, "Lost and found", "/"],
  [/^\/messages\//, "Conversation", "/messages"], [/^\/profile\//, "Profile", "/explore"],
  [/^\/you\/settings\/danger$/, "Delete account", "/you/settings"], [/^\/you\/settings$/, "Settings", "/you"],
  [/^\/admin/, "Moderation", "/you"], [/^\/review\//, "Leave a review", "/you"],
];
const IMMERSIVE = /^\/(messages|listing)\/[^/]+$/;   // screens with their own bottom action bar

export function UnreadBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return <span className="badge"><span className="sr-only">Unread: </span>{n > 99 ? "99+" : n}</span>;
}

export function AppNav({ unread, university }: { unread: number; university: string }) {
  const path = usePathname(), router = useRouter();
  const on = (h: string) => (h === "/" ? path === "/" : path === h || path.startsWith(h + "/"));
  const deep = DEEP.find(([re]) => re.test(path));
  const immersive = IMMERSIVE.test(path);

  // Live inbox: any new message visible to this user (RLS filters the stream) refreshes unread counts and the conversation list.
  const last = useRef(0);
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel("inbox").on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
      const now = Date.now(); if (now - last.current < 1500) return; last.current = now; router.refresh();
    }).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [router]);

  // Back uses real history inside the app; a cold launch has none, so it goes to the logical parent.
  const moves = useRef(0);
  useEffect(() => { moves.current += 1; }, [path]);
  const back = () => { tap(); if (moves.current > 1) router.back(); else router.push(deep?.[2] ?? "/"); };

  return (
    <>
      <aside className="rail" aria-label="Sidebar">
        <div><Link href="/" aria-label="f!nd home" className="block text-[2.25rem]"><Wordmark /></Link><p className="t-meta mt-1 truncate pl-0.5">{university}</p></div>
        <nav aria-label="Primary"><ul className="space-y-1">
          {TABS.map((t) => (
            <li key={t.href}><Link href={t.href} aria-current={on(t.href) ? "page" : undefined} className="rail-link">
              <Icon name={t.icon} size={22} /><span className="flex-1">{t.label}</span>{t.href === "/messages" && <UnreadBadge n={unread} />}</Link></li>))}
        </ul></nav>
        <nav aria-label="Campus" className="border-t border-line pt-4"><p className="mb-1 px-3 text-[0.8125rem] font-semibold text-muted">Campus</p>
          <ul className="space-y-1">{CAMPUS.map((c) => (
            <li key={c.href}><Link href={c.href} aria-current={on(c.href) ? "page" : undefined} className="rail-link"><Icon name={c.icon} size={20} />{c.label}</Link></li>))}</ul></nav>
      </aside>

      <header className="topbar">
        <div className="flex h-14 items-center px-2">
          {deep ? (<>
            <button type="button" onClick={back} aria-label="Back" className="grid size-11 place-items-center rounded-full"><Icon name="arrow" size={22} className="rotate-180" /></button>
            <p className="min-w-0 flex-1 truncate text-center text-[1.0625rem] font-bold">{deep[1]}</p><span className="size-11" aria-hidden="true" />
          </>) : (<>
            <Link href="/" aria-label="f!nd home" className="px-2 text-[2rem]"><Wordmark /></Link>
            {path !== "/" && !path.startsWith("/explore") && <Link href="/explore" aria-label="Search" className="ml-auto grid size-11 place-items-center rounded-full"><Icon name="search" size={22} /></Link>}
          </>)}
        </div>
      </header>

      <nav aria-label="Primary" className={`tabbar ${immersive ? "hidden" : ""}`}>
        <ul className="grid h-[var(--bar-h)] grid-cols-5">
          {TABS.map((t) => {
            const active = on(t.href), sell = t.href === "/sell";
            return (
              <li key={t.href}><Link href={t.href} onClick={() => tap(6)} aria-current={active ? "page" : undefined}
                className={`relative flex h-full flex-col items-center justify-center gap-1 text-[0.75rem] font-semibold ${active ? "text-brand" : "text-muted"}`}>
                {sell ? <span className="grid h-9 w-12 place-items-center rounded-[var(--radius-md)] bg-brand text-white"><Icon name="plus" size={22} /></span>
                  : <span className="relative"><Icon name={t.icon} size={24} />{t.href === "/messages" && unread > 0 && <span className="absolute -right-3 -top-2"><UnreadBadge n={unread} /></span>}</span>}
                <span className={sell ? "text-ink" : ""}>{t.label}</span>
                {active && !sell && <span aria-hidden="true" className="absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-brand" />}
              </Link></li>);
          })}
        </ul>
      </nav>
    </>
  );
}
