import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export const metadata = { title: "Welcome" };

/** One screen: what it is, how to get in, and the three facts a new student needs. No feature tour. */
export default function Welcome() {
  return (
    <div className="grid min-h-dvh md:grid-cols-[1.1fr_1fr]">
      <main className="flex flex-col px-[var(--gutter)] py-6 md:py-10">
        <header className="flex items-center justify-between"><p className="text-[2.5rem]"><Wordmark /></p><Link href="/sign-in" className="btn btn-quiet btn-sm">Sign in</Link></header>
        <div className="my-auto max-w-xl py-12">
          <h1 className="t-page !text-[clamp(2.75rem,2rem+4vw,5rem)]">Find it on campus.</h1>
          <p className="mt-5 max-w-md text-[1.1875rem] leading-snug text-muted">Textbooks, laptops, furniture and favours from verified students at your own university.</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/sign-up" className="btn btn-primary !min-h-14 px-8 text-[1.0625rem]">Join with your university</Link>
            <Link href="/sign-in" className="link">I already have an account</Link>
          </div>
        </div>
        <ul className="grid gap-4 border-t border-line pt-6 text-[0.9375rem] sm:grid-cols-3">
          <li><strong className="block">Verified students</strong><span className="t-meta">A moderator confirms you belong.</span></li>
          <li><strong className="block">Your number stays yours</strong><span className="t-meta">Talk inside f!nd. We never ask for one.</span></li>
          <li><strong className="block">Meet in public</strong><span className="t-meta">Verified isn&rsquo;t a guarantee of behaviour.</span></li>
        </ul>
      </main>
      <aside aria-hidden="true" className="relative hidden bg-brand md:block">
        { }
        <img src="/hero.jpg" alt="" className="absolute inset-0 size-full object-cover object-top" />
        <span className="pricetag absolute bottom-10 left-0">Verified students only</span>
      </aside>
    </div>
  );
}
