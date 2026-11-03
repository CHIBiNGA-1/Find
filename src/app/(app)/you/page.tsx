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
  const btn = "btn btn-quiet btn-sm";
  const name = profile?.display_name ?? "You";
  return (
    <main className="mx-auto max-w-3xl">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-[var(--radius-md)] bg-ink text-[1.75rem] font-extrabold text-white">{name.charAt(0).toUpperCase()}</span>
        <h1 className="text-[clamp(2rem,1.2rem+3vw,3rem)] font-extrabold leading-none [font-stretch:80%]">{name}</h1>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/you/settings" className="btn btn-quiet btn-sm">Settings</Link>
        {mod && <Link href="/admin" className="btn btn-quiet btn-sm">Moderation</Link>}
        <form action={signOut}><button className="btn btn-quiet btn-sm">Sign out</button></form>
      </div>

      {(toConfirm.length > 0 || toReview.length > 0) && (
        <section aria-label="Needs your attention" className="mt-10 space-y-3 border-l-4 border-hl bg-sunken p-5">
          <h2 className="text-[1.375rem]">Needs your attention</h2>
          {toConfirm.map((e) => <div key={e.id} className="flex flex-wrap items-center gap-3"><span>A seller says you bought {title(e)}. Is that right?</span>
            <form action={confirmExchange.bind(null, e.id, true)}><button className="btn btn-primary btn-sm">Yes, confirm</button></form><form action={confirmExchange.bind(null, e.id, false)}><button className={btn}>No</button></form></div>)}
          {toReview.map((e) => <p key={e.id}><Link className="link font-semibold" href={`/review/${e.id}`}>Review your exchange for {title(e)}</Link></p>)}
        </section>)}

      <h2 className="mt-12 text-[1.75rem]">Your listings</h2>
      {GROUPS.map(([status, label]) => {
        const items = (mine ?? []).filter((l) => l.status === status);
        return (
          <section key={status} className="mt-6"><h3 className="t-label">{label} ({items.length})</h3>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {items.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <Link href={status === "draft" ? `/sell/${l.id}` : `/listing/${l.id}`} className="min-w-0 font-semibold hover:underline">{l.title} <span className="price ml-1 font-normal text-muted">{formatMoney(l.price_minor, l.currency_code)}</span></Link>
                  <div className="flex gap-2">
                    {status === "draft" && <form action={deleteDraft.bind(null, l.id)}><button className={btn}>Delete draft</button></form>}
                    {status === "active" && <><Link href={`/listing/${l.id}/sold`} className={btn}>Mark sold</Link><form action={setListingStatus.bind(null, l.id, "archived")}><button className={btn}>Archive</button></form></>}
                    {status === "archived" && <form action={setListingStatus.bind(null, l.id, "active")}><button className={btn}>Relist</button></form>}
                  </div>
                </li>))}
              {!items.length && <li className="py-3.5 text-sm text-muted">Nothing here.</li>}
            </ul></section>);
      })}

      <h2 className="mt-12 text-[1.75rem]">Saved ({saved?.length ?? 0})</h2>
      <ul className="mt-3 divide-y divide-line border-y border-line">{saved?.map((s, n) => { const l = s.listings as unknown as { id: string; title: string; status: string } | null; return l && <li key={n} className="py-3.5"><Link className="font-semibold hover:underline" href={`/listing/${l.id}`}>{l.title}</Link>{l.status !== "active" && <span className="t-meta"> ({l.status})</span>}</li>; })}
        {!saved?.length && <li className="py-3.5 text-sm text-muted">Tap Save on a listing to keep it here.</li>}</ul>
    </main>
  );
}
