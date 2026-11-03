import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export const metadata = { title: "Welcome" };

const STEPS = [
  ["Create an account", "Use your email. It takes a minute."],
  ["Choose your university", "A moderator there confirms you belong."],
  ["Buy, sell and message", "Everything unlocks once you are verified."],
] as const;
const DOES = [
  ["Marketplace", "Textbooks, electronics, furniture. Photos, prices and the seller, all in the open.", "Explore listings"],
  ["Requests", "Ask for what you need and let other students answer.", "See requests"],
  ["Lost and found", "Report something lost or found without publishing anything private.", "See reports"],
] as const;

export default function Welcome() {
  return (
    <div className="min-h-dvh">
      <section className="on-brand overflow-hidden bg-brand text-white">
        <header className="wrap flex items-center justify-between py-5">
          <p className="text-[2.25rem]"><Wordmark /></p>
          <Link href="/sign-in" className="btn btn-white btn-sm">Sign in</Link>
        </header>
        <div className="wrap grid items-end gap-10 pt-8 md:grid-cols-[1.25fr_1fr] md:gap-14 md:pt-16">
          <div className="pb-12 md:pb-20">
            <h1 className="t-display">Find it on campus.</h1>
            <p className="mt-6 max-w-lg text-[1.1875rem] leading-snug text-white/90">Textbooks, laptops, furniture and favours, from verified students at your own university.</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link href="/sign-up" className="btn btn-white !min-h-14 px-8 text-[1.0625rem]">Join with your university</Link>
              <Link href="/sign-in" className="font-semibold underline underline-offset-4">I already have an account</Link>
            </div>
          </div>
          <div className="relative -mb-px self-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero.jpg" alt="Four students outside a university building, looking at a phone together." className="aspect-[4/5] w-full rounded-t-[var(--radius-lg)] object-cover object-top md:aspect-[5/6]" />
            <p className="pricetag absolute bottom-6 left-0 !h-10">Verified students only</p>
          </div>
        </div>
      </section>

      <main className="wrap">
        <section className="grid gap-10 py-16 md:grid-cols-[1fr_1.4fr] md:gap-16 md:py-24">
          <h2 className="t-title">Three steps to your first listing.</h2>
          <ol className="divide-y divide-line border-y border-line">
            {STEPS.map(([t, d], n) => (
              <li key={t} className="flex items-baseline gap-5 py-5">
                <span className="w-8 shrink-0 text-[1.75rem] font-extrabold text-brand [font-stretch:80%]" aria-hidden="true">{n + 1}</span>
                <span><span className="block text-[1.1875rem] font-bold">{t}</span><span className="t-meta">{d}</span></span>
              </li>))}
          </ol>
        </section>

        <section aria-label="What you can do" className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] bg-line md:grid-cols-3">
          {DOES.map(([t, d]) => (
            <div key={t} className="bg-white p-7 md:p-9">
              <h3 className="text-[1.75rem] [font-stretch:80%]">{t}</h3>
              <p className="t-meta mt-2 text-[0.9375rem] leading-relaxed">{d}</p>
            </div>))}
        </section>

        <section className="grid gap-8 py-16 md:grid-cols-2 md:gap-16 md:py-24">
          <div><h2 className="t-title">Your number stays yours.</h2>
            <p className="mt-3 max-w-md text-muted">Talk inside f!nd. Share a phone number only if you choose to. We never ask for one.</p></div>
          <div><h2 className="t-title">Verified is not a guarantee.</h2>
            <p className="mt-3 max-w-md text-muted">Verification means a moderator confirmed someone belongs to the university. It does not promise how they behave, so meet in public places and report anything that feels wrong.</p></div>
        </section>
      </main>
    </div>
  );
}
