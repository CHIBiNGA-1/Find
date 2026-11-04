import Link from "next/link";
import { getContext } from "@/lib/session";
import { MessagesShell } from "@/components/messages-shell";
import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/empty-state";
import { UnreadBadge } from "@/components/app-nav";
import { timeAgo } from "@/lib/time";

type Conv = { id: string; buyer_id: string; listings: { title: string; status: string } | null; requests: { title: string } | null; lost_found: { title: string } | null; buyer: { display_name: string } | null; seller: { display_name: string } | null };

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId, timezone } = await getContext();
  const [{ data: convRaw }, { data: unread }, { data: previews }] = await Promise.all([
    supabase.from("conversations").select("id, buyer_id, listings(title, status), requests(title), lost_found:lost_found_reports(title), buyer:profiles!conversations_buyer_id_fkey(display_name), seller:profiles!conversations_seller_id_fkey(display_name)")
      .order("last_message_at", { ascending: false, nullsFirst: false }).limit(50),
    supabase.rpc("unread_counts"),
    supabase.rpc("conversation_previews"),
  ]);
  const convs = (convRaw ?? []) as unknown as Conv[];
  const counts = new Map(((unread ?? []) as { conversation_id: string; unread: number }[]).map((u) => [u.conversation_id, Number(u.unread)]));
  const last = new Map(((previews ?? []) as { conversation_id: string; body: string; has_image: boolean; sender_id: string; created_at: string }[]).map((p) => [p.conversation_id, p]));
  const list = (
    <div>
      <h1 className="t-page mb-5">Messages</h1>
      {!convs.length ? <EmptyState title="No conversations yet." hint="Open a listing and choose Message seller." href="/explore" action="Explore listings" /> : (
        <ul className="rows">
          {convs.map((c) => {
            const other = c.buyer_id === userId ? c.seller : c.buyer, name = other?.display_name ?? "Student";
            const topic = c.listings?.title ?? c.requests?.title ?? c.lost_found?.title ?? "Item removed";
            const n = counts.get(c.id) ?? 0, p = last.get(c.id);
            const preview = p ? `${p.sender_id === userId ? "You: " : ""}${p.body || "Photo"}` : "No messages yet";
            return (
              <li key={c.id}><Link href={`/messages/${c.id}`} className="row-link">
                <Avatar name={name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2"><span className={`truncate ${n ? "font-extrabold" : "font-semibold"}`}>{name}</span>
                    {p && <time dateTime={p.created_at} className="t-meta shrink-0 text-[0.75rem]">{timeAgo(p.created_at, Date.now(), timezone)}</time>}</span>
                  <span className="t-meta block truncate text-[0.8125rem]">{topic}{c.listings && c.listings.status !== "active" ? ` (${c.listings.status})` : ""}</span>
                  <span className={`block truncate text-[0.875rem] ${n ? "font-semibold text-ink" : "text-muted"}`}>{preview}</span>
                </span>
                <UnreadBadge n={n} />
              </Link></li>);
          })}
        </ul>)}
    </div>);
  return <MessagesShell list={list}>{children}</MessagesShell>;
}
