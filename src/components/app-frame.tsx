"use client";
import { usePathname } from "next/navigation";

/** Content column. Clears the rail on desktop and the tab bar on phones; chat and listing screens manage their own bottom bar. */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const pad = /^\/messages\/[^/]+$/.test(path) ? "!pb-0 md:!pb-4" : /^\/listing\/[^/]+$/.test(path) ? "!pb-[calc(6rem+env(safe-area-inset-bottom))] md:!pb-16" : "";
  return <div className={`main-col ${pad}`}><div className="wrap">{children}</div></div>;
}
