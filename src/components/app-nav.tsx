"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Wordmark } from "@/components/wordmark";
import { tap } from "@/lib/haptics";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/explore", label: "Explore", icon: "search" },
  { href: "/sell", label: "Sell", icon: "plus" },
  { href: "/messages", label: "Messages", icon: "chat" },
  { href: "/you", label: "You", icon: "user" },
];
const LINKS = [{ href: "/explore", label: "Explore" }, { href: "/requests", label: "Requests" }, { href: "/lost-found", label: "Lost and found" }];

/** Screens that are not a tab get a back button. [pattern, title shown until the page's own heading is known, where Back goes if there is no history] */
const DEEP: [RegExp, string, string][] = [
  [/^\/listing\/[^/]+\/sold$/, "Mark as sold", "/you"], [/^\/listing\//, "Listing", "/"], [/^\/sell\//, "Edit listing", "/you"],
  [/^\/requests\/new$/, "Post a request", "/requests"], [/^\/requests\//, "Request", "/requests"], [/^\/requests$/, "Requests", "/"],
  [/^\/lost-found\/new$/, "Report an item", "/lost-found"], [/^\/lost-found\//, "Lost and found", "/lost-found"], [/^\/lost-found$/, "Lost and found", "/"],
  [/^\/messages\//, "Conversation", "/messages"], [/^\/profile\//, "Profile", "/"],
  [/^\/you\/settings\/danger$/, "Delete account", "/you/settings"], [/^\/you\/settings$/, "Settings", "/you"],
  [/^\/admin/, "Moderation", "/you"], [/^\/review\//, "Leave a review", "/you"],
];
/** Full-screen screens with their own bottom action bar hide the tab bar. */
const IMMERSIVE = /^\/(messages|listing)\/[^/]+$/;

function Badge({ n }: { n: number }) {
  return (
    <span className="absolute -right-2 -top-1.5 grid min-w-[1.125rem] place-items-center rounded-full bg-hl px-1 text-[0.6875rem] font-extrabold leading-[1.125rem] text-ink">
      <span className="sr-only">Unread: </span>{n > 99 ? "99+" : n}
    </span>
  );
}

export function AppNav({ unread = 0 }: { unread?: number }) {
  const path = usePathname();
  const router = useRouter();
  const on = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  const deep = DEEP.find(([re]) => re.test(path));
  const immersive = IMMERSIVE.test(path);

  // Back: real history if we've moved inside the app, otherwise the logical parent (a cold launch has no history).
  const moves = useRef(0);
  useEffect(() => { moves.current += 1; }, [path]);
  const back = () => { tap(); if (moves.current > 1) router.back(); else router.push(deep?.[2] ?? "/"); };

  // Title collapses into the bar once the page's own heading scrolls away, like a native large title.
  const [title, setTitle] = useState(""), [showTitle, setShowTitle] = useState(false);
  useEffect(() => {
    setShowTitle(false); setTitle(deep?.[1] ?? "");
    if (!deep) return;
    let obs: IntersectionObserver | undefined, timer: ReturnType<typeof setTimeout>, tries = 0;
    const find = () => {
      const h = document.querySelector("[data-page-title], main h1");
      if (h) {
        setTitle(h.textContent?.trim() || deep[1]);
        obs = new IntersectionObserver(([e]) => { if (e) setShowTitle(!e.isIntersecting && e.boundingClientRect.top < 0); }, { rootMargin: "-56px 0px 0px 0px" });
        obs.observe(h);
      } else if (tries++ < 8) timer = setTimeout(find, 60); else setShowTitle(true);
    };
    find();
    return () => { obs?.disconnect(); clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        {/* Phone */}
        <div className="flex h-14 items-center px-2 md:hidden">
          {deep ? (<>
            <button type="button" onClick={back} aria-label="Back" className="press grid size-11 place-items-center rounded-full"><Icon name="arrow" size={22} className="rotate-180" /></button>
            <p aria-hidden={!showTitle} className={`min-w-0 flex-1 truncate text-center text-[1.0625rem] font-bold transition-opacity duration-150 ${showTitle ? "opacity-100" : "opacity-0"}`}>{title}</p>
            <span className="size-11" aria-hidden="true" />
          </>) : (<>
            <Link href="/" aria-label="f!nd home" className="press px-2 text-[2rem]"><Wordmark /></Link>
            <Link href="/explore" aria-label="Search" className="press ml-auto grid size-11 place-items-center rounded-full"><Icon name="search" size={22} /></Link>
          </>)}
        </div>
        {/* Desktop */}
        <div className="wrap hidden h-16 items-center gap-6 md:flex">
          <Link href="/" aria-label="f!nd home" className="text-[2.125rem]"><Wordmark /></Link>
          <nav aria-label="Primary" className="flex items-center gap-1">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} aria-current={on(l.href) ? "page" : undefined}
                className="rounded-full px-3.5 py-2 text-[0.9375rem] font-semibold text-muted transition-colors hover:text-ink aria-[current=page]:bg-ink aria-[current=page]:text-white">{l.label}</Link>))}
          </nav>
          <form action="/explore" method="get" role="search" className="ml-auto max-w-sm flex-1">
            <label className="relative block"><span className="sr-only">Search listings</span>
              <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input name="q" type="search" placeholder="Search listings" className="field !min-h-10 !rounded-full !pl-10" /></label>
          </form>
          <div className="flex items-center gap-4">
            <Link href="/messages" aria-label="Messages" className="relative grid size-10 place-items-center"><Icon name="chat" size={22} />{unread > 0 && <Badge n={unread} />}</Link>
            <Link href="/you" aria-label="You" className="grid size-10 place-items-center"><Icon name="user" size={22} /></Link>
            <Link href="/sell" className="btn btn-primary btn-sm"><Icon name="plus" size={18} />Sell</Link>
          </div>
        </div>
      </header>

      <nav aria-label="Primary" className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden ${immersive ? "hidden" : ""}`}>
        <ul className="grid h-[var(--bar-h)] grid-cols-5">
          {TABS.map((t) => {
            const active = on(t.href), sell = t.href === "/sell";
            return (
              <li key={t.href}>
                <Link href={t.href} onClick={() => tap(6)} aria-current={active ? "page" : undefined}
                  className={`press relative flex h-full flex-col items-center justify-center gap-1 text-[0.75rem] font-semibold ${active ? "text-brand" : "text-muted"}`}>
                  {sell
                    ? <span className="grid h-9 w-12 place-items-center rounded-[10px] bg-brand text-white"><Icon name="plus" size={22} /></span>
                    : <span className="relative"><Icon name={t.icon} size={24} filled={false} />{t.href === "/messages" && unread > 0 && <Badge n={unread} />}</span>}
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
