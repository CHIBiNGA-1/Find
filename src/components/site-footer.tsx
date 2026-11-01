import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export function SiteFooter() {
  const link = "text-[0.9375rem] text-white/75 transition-colors hover:text-white";
  return (
    <footer className="mt-20 bg-[var(--color-footer)] pb-24 text-white md:pb-0">
      <div className="mx-auto flex max-w-[var(--width-content)] flex-col gap-8 px-[var(--space-gutter)] py-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <p className="text-3xl"><Wordmark accent="text-[#e8b23a]" /></p>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/70">A marketplace for the university community. Verification confirms membership, not conduct. Meet in public places; f!nd doesn&rsquo;t handle payments or guarantee any exchange.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3 md:pt-2">
          <Link href="/explore" className={link}>Explore</Link><Link href="/requests" className={link}>Requests</Link>
          <Link href="/lost-found" className={link}>Lost and found</Link><Link href="/you/settings" className={link}>Settings</Link>
        </nav>
      </div>
    </footer>
  );
}
