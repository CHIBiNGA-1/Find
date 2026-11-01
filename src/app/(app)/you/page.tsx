import Link from "next/link";
import { signOut } from "../../(auth)/actions";
import { getContext } from "@/lib/session";
import { formatMoney } from "@/lib/money";
import { confirmExchange } from "../exchange-actions";
import { deleteDraft, setListingStatus } from "../sell/actions";

export const metadata = { title: "You" };
const GROUPS = [["draft", "Drafts"], ["active", "Active"], ["sold", "Sold"], ["archived", "Archived"]] as const;

export default async function You() {
  const { supabase, userId } = await getContext();
  const [{ data: exchanges }, { data: myReviews }, { data: mod }] = await Promise.all([
    supabase.from("exchange_records").select("id, status, seller_id, buyer_id, listings(title)").neq("status", "declined"),
    supabase.from("reviews").select("exchange_id").eq("reviewer_id", userId),
    supabase.from("university_memberships").select("id").eq("status", "verified").in("role", ["moderator", "admin"]).limit(1).maybeSingle(),
  ]);
  const reviewed = new Set((myReviews ?? []).map((r) => r.exchange_id));
  const toConfirm = (exchanges ?? []).filter((e) => e.status === "pending" && e.buyer_id === userId);
  const toReview = (exchanges ?? []).filter((e) => e.status === "confirmed" && !reviewed.has(e.id));
  const title = (e: { listings: unknown }) => (e.listings as { title: string } | null)?.title ?? "an item";
  const [{ data: profile }, { data: mine }, { data: saved }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase.from("listings").select("id, title, price_minor, currency_code, status").eq("seller_id", userId).neq("status", "removed").order("updated_at", { ascending: false }),
    supabase.from("saved_listings").select("listings(id, title, price_minor, currency_code, status)").order("created_at", { ascending: false }),
  ]);
  const btn = "min-h-9 rounded-[var(--radius-sm)] border border-line px-3 text-sm";
  return (
    <main>
      <h1 className="font-serif text-3xl tracking-tight">{profile?.display_name ?? "You"}</h1>
      {(toConfirm.length > 0 || toReview.length > 0) && (
        <section aria-label="Needs your attention" className="mt-6 space-y-2 rounded-[var(--radius-md)] border border-line bg-surface p-4">
          <h2 className="font-semibold">Needs your attention</h2>
          {toConfirm.map((e) => <div key={e.id} className="flex flex-wrap items-center gap-2"><span>A seller says you bought {title(e)}. Is that right?</span>
            <form action={confirmExchange.bind(null, e.id, true)}><button className={btn}>Yes, confirm</button></form><form action={confirmExchange.bind(null, e.id, false)}><button className={btn}>No</button></form></div>)}
          {toReview.map((e) => <p key={e.id}><Link className="underline" href={`/review/${e.id}`}>Review your exchange for {title(e)}</Link></p>)}
        </section>)}
      {mod && <p className="mt-4"><Link className="underline" href="/admin">Moderation</Link></p>}
      {GROUPS.map(([status, label]) => {
        const items = (mine ?? []).filter((l) => l.status === status);
        return (
          <section key={status} className="mt-8"><h2 className="font-semibold">{label} ({items.length})</h2>
            <ul className="mt-2 divide-y divide-line rounded-[var(--radius-md)] border border-line bg-surface">
              {items.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <Link href={status === "draft" ? `/sell/${l.id}` : `/listing/${l.id}`} className="font-medium">{l.title} <span className="price text-muted">{formatMoney(l.price_minor, l.currency_code)}</span></Link>
                  <div className="flex gap-2">
                    {status === "draft" && <form action={deleteDraft.bind(null, l.id)}><button className={btn}>Delete draft</button></form>}
                    {status === "active" && <><Link href={`/listing/${l.id}/sold`} className={`${btn} inline-flex items-center`}>Mark sold</Link><form action={setListingStatus.bind(null, l.id, "archived")}><button className={btn}>Archive</button></form></>}
                    {status === "archived" && <form action={setListingStatus.bind(null, l.id, "active")}><button className={btn}>Relist</button></form>}
                  </div>
                </li>))}
              {!items.length && <li className="p-3 text-sm text-muted">Nothing here.</li>}
            </ul></section>);
      })}
      <section className="mt-8"><h2 className="font-semibold">Saved ({saved?.length ?? 0})</h2>
        <ul className="mt-2 space-y-1">{saved?.map((s, n) => { const l = s.listings as unknown as { id: string; title: string; status: string } | null; return l && <li key={n}><Link className="underline" href={`/listing/${l.id}`}>{l.title}</Link>{l.status !== "active" && <span className="text-sm text-muted"> ({l.status})</span>}</li>; })}</ul></section>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/you/settings" className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-line bg-surface px-4">Settings</Link>
        <form action={signOut}><button className="min-h-11 rounded-[var(--radius-md)] border border-line bg-surface px-4">Sign out</button></form>
      </div>
    </main>
  );
}
