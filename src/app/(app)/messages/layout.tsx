import Link from "next/link";
import { getContext } from "@/lib/session";
import { MessagesShell } from "@/components/messages-shell";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId } = await getContext();
  const [{ data: convs }, { data: unread }] = await Promise.all([
    supabase.from("conversations").select("id, buyer_id, listings(title, status), requests(title), lost_found:lost_found_reports(title), buyer:profiles!conversations_buyer_id_fkey(display_name), seller:profiles!conversations_seller_id_fkey(display_name)")
      .order("last_message_at", { ascending: false, nullsFirst: false }).limit(50),
    supabase.rpc("unread_counts"),
  ]);
  const counts = new Map(((unread ?? []) as { conversation_id: string; unread: number }[]).map((u) => [u.conversation_id, Number(u.unread)]));
  const list = (
    <div>
      <h1 className="t-page mb-5">Messages</h1>
      {!convs?.length ? (
        <div className="rounded-[var(--radius-lg)] bg-sunken p-6">
          <p className="text-[1.25rem] font-bold [font-stretch:88%]">No conversations yet.</p>
          <p className="t-meta mt-1">Open a listing and choose Message seller.</p>
          <Link href="/explore" className="btn btn-primary btn-sm mt-4">Explore listings</Link>
        </div>) : (
        <ul className="divide-y divide-line border-y border-line">
          {convs.map((c) => {
            const other = (c.buyer_id === userId ? c.seller : c.buyer) as unknown as { display_name: string } | null;
            const l = c.listings as unknown as { title: string; status: string } | null;
            const topic = (c.requests as unknown as { title: string } | null)?.title ?? (c.lost_found as unknown as { title: string } | null)?.title;
            const n = counts.get(c.id) ?? 0;
            const name = other?.display_name ?? "Student";
            return (
              <li key={c.id}><Link href={`/messages/${c.id}`} className="flex min-h-[4.5rem] items-center gap-3 py-3 hover:bg-sunken active:bg-sunken">
                <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-md)] bg-ink text-lg font-extrabold text-white">{name.charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1"><span className={`block truncate ${n > 0 ? "font-extrabold" : "font-semibold"}`}>{name}</span>
                  <span className="t-meta block truncate">{l?.title ?? topic ?? "Item removed"}{l && l.status !== "active" ? ` (${l.status})` : ""}</span></span>
                {n > 0 && <span className="grid min-w-[1.5rem] place-items-center rounded-full bg-hl px-2 text-[0.8125rem] font-extrabold leading-6 text-ink"><span className="sr-only">Unread: </span>{n}</span>}
              </Link></li>);
          })}
        </ul>)}
    </div>);
  return <MessagesShell list={list}>{children}</MessagesShell>;
}
