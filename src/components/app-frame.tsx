"use client";
import { usePathname } from "next/navigation";

/** Page container. Bottom padding clears whatever sits at the bottom of the phone screen. */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const pad = /^\/messages\/[^/]+$/.test(path) ? "pb-0"
    : /^\/listing\/[^/]+$/.test(path) ? "pb-[calc(6rem+env(safe-area-inset-bottom))]"
    : "pb-[calc(var(--bar-h)+env(safe-area-inset-bottom)+1.5rem)]";
  return <div className={`wrap pt-5 md:pb-0 md:pt-10 ${pad}`}>{children}</div>;
}
