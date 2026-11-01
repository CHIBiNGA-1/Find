import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { Icon } from "@/components/icons";

export const metadata = { title: "Welcome" };

const STEPS = [
  ["Create an account", "With your email. It takes a minute."],
  ["Choose your university", "A moderator there confirms you belong."],
  ["Buy, sell, message", "Everything unlocks once you are verified."],
] as const;

export default function Welcome() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-[var(--width-content)] items-center justify-between px-[var(--space-gutter)] py-6">
        <p className="text-[1.75rem]"><Wordmark /></p>
        <Link href="/sign-in" className="btn btn-quiet">Sign in</Link>
      </header>

      <main className="mx-auto grid max-w-[var(--width-content)] gap-4 px-[var(--space-gutter)] pb-16 md:grid-cols-12">
        <section className="blk blk-sand flex flex-col justify-between gap-10 md:col-span-7 md:min-h-[30rem]">
          <p className="t-label">For university students</p>
          <div>
            <h1 className="t-display">The campus, in one place.</h1>
            <p className="mt-5 max-w-md text-[1.0625rem] text-muted">Buy what you need, sell what you don&rsquo;t, and ask for what you can&rsquo;t find. Only verified students from the same university.</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/sign-up" className="btn btn-ink">Join with your university<span className="chip"><Icon name="arrow" size={16} /></span></Link>
              <Link href="/sign-in" className="link text-[0.9375rem]">I already have an account</Link>
            </div>
          </div>
        </section>

        <section aria-hidden="true" className="blk blk-sage flex items-end justify-center overflow-hidden !pb-0 md:col-span-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="arch aspect-[3/4] w-full max-w-[19rem]"><img src="/hero.jpg" alt="" className="size-full object-cover" /></div>
        </section>

        <section className="blk blk-white md:col-span-4">
          <h2 className="t-title">Three steps</h2>
          <ol className="mt-6 space-y-5">
            {STEPS.map(([t, d], n) => (
              <li key={t} className="flex gap-4"><span className="tint-green grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold" aria-hidden="true">{n + 1}</span>
                <span><span className="block font-semibold">{t}</span><span className="t-meta">{d}</span></span></li>))}
          </ol>
        </section>

        <section className="blk blk-honey md:col-span-4">
          <Icon name="lock" size={24} />
          <h2 className="t-title mt-8">Your number stays yours.</h2>
          <p className="mt-3 text-[0.9375rem] text-[#3b3012]">Talk inside f!nd. Share a phone number only if you choose to. We never ask for one.</p>
        </section>

        <section className="blk blk-forest md:col-span-4">
          <Icon name="shield" size={24} />
          <h2 className="t-title mt-8">Verified is not a guarantee.</h2>
          <p className="mt-3 text-[0.9375rem] text-white/75">Verification means a moderator confirmed someone belongs to the university. It does not promise how they behave, so meet in public places and report anything that feels wrong.</p>
        </section>

        <section className="blk blk-sand2 md:col-span-12">
          <h2 className="t-label">What you can do</h2>
          <ul className="mt-5 grid gap-6 sm:grid-cols-3">
            {[["Marketplace", "Textbooks, electronics, furniture. Photos, prices and the seller, all in the open."], ["Requests", "Ask for what you need and let other students answer."], ["Lost and found", "Report something lost or found, without publishing anything private."]].map(([t, d]) => (
              <li key={t}><p className="t-title !text-[1.375rem]">{t}</p><p className="t-meta mt-1.5">{d}</p></li>))}
          </ul>
        </section>
      </main>
    </div>
  );
}
