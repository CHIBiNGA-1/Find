import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export function SiteFooter() {
  const link = "text-[0.9375rem] font-medium text-muted transition-colors hover:text-ink";
  return (
    <footer className="web-only mt-24 hidden border-t border-line pb-12 md:block">
      <div className="wrap flex flex-col gap-8 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <p className="text-[2rem]"><Wordmark /></p>
          <p className="t-meta mt-3 leading-relaxed">Verification confirms someone belongs to the university, not how they behave. Meet in public places. f!nd doesn&rsquo;t handle payments or guarantee any exchange.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3 md:pt-2">
          <Link href="/explore" className={link}>Explore</Link><Link href="/requests" className={link}>Requests</Link>
          <Link href="/lost-found" className={link}>Lost and found</Link><Link href="/you/settings" className={link}>Settings</Link>
        </nav>
      </div>
    </footer>
  );
}
