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
      <h1 className="mb-3 font-serif text-3xl tracking-tight">Messages</h1>
      {!convs?.length ? <p className="text-muted">No conversations yet. Open a listing and choose Message seller.</p> : (
        <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line bg-surface">
          {convs.map((c) => {
            const other = (c.buyer_id === userId ? c.seller : c.buyer) as unknown as { display_name: string } | null;
            const l = c.listings as unknown as { title: string; status: string } | null;
            const topic = (c.requests as unknown as { title: string } | null)?.title ?? (c.lost_found as unknown as { title: string } | null)?.title;
            const n = counts.get(c.id) ?? 0;
            return (
              <li key={c.id}><Link href={`/messages/${c.id}`} className="flex min-h-14 items-center justify-between gap-2 p-3">
                <span className="min-w-0"><span className="block truncate font-medium">{other?.display_name ?? "Student"}</span>
                  <span className="block truncate text-sm text-muted">{l?.title ?? topic ?? "Item removed"}{l && l.status !== "active" ? ` (${l.status})` : ""}</span></span>
                {n > 0 && <span className="rounded-full bg-brand px-2 text-xs font-semibold text-white"><span className="sr-only">Unread: </span>{n}</span>}
              </Link></li>);
          })}
        </ul>)}
    </div>);
  return <MessagesShell list={list}>{children}</MessagesShell>;
}
