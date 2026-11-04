import Link from "next/link";
import { signOut } from "../(auth)/actions";
import { Wordmark } from "@/components/wordmark";

export const metadata = { title: "University closed" };

export default function Closed() {
  return (
    <main className="mx-auto max-w-lg px-[var(--gutter)] py-14">
      <p className="mb-8 text-[3rem] text-brand"><Wordmark /></p>
      <h1 className="t-page">This university has closed.</h1>
      <p className="mt-3 text-muted">A new university on f!nd has a founding period to bring in enough verified students. This one didn&rsquo;t reach its target in time, so its listings, requests and messages are no longer visible to anyone.</p>
      <p className="mt-3 text-muted">Your account is untouched. You can join a different university, or ask a moderator how to start again.</p>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link href="/onboarding" className="btn btn-primary">Choose another university</Link>
        <form action={signOut}><button className="link text-[0.9rem]">Sign out</button></form>
      </div>
    </main>
  );
}
