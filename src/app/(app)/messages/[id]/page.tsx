import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/session";
import { formatMoney } from "@/lib/money";
import { Chat, type Msg } from "@/components/chat";
import { ReportDialog } from "@/components/report-dialog";
import { blockUser, unblockUser } from "../actions";

export const metadata = { title: "Conversation" };

export default async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await getContext();
  const { data: c } = await supabase.from("conversations").select("id, buyer_id, seller_id, listing_id, request_id, lost_found_id").eq("id", id).maybeSingle();
  if (!c) notFound();                                   // not a participant == does not exist
  const otherId = c.buyer_id === userId ? c.seller_id : c.buyer_id;
  const [{ data: other }, { data: listing }, { data: recent }, { data: blocked }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", otherId).maybeSingle(),
    c.listing_id ? supabase.from("listings").select("id, title, price_minor, currency_code, status").eq("id", c.listing_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: false }).limit(50),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", userId).eq("blocked_id", otherId).maybeSingle(),
  ]);
  const [{ data: req }, { data: lf }] = await Promise.all([
    c.request_id ? supabase.from("requests").select("id, title").eq("id", c.request_id).maybeSingle() : Promise.resolve({ data: null }),
    c.lost_found_id ? supabase.from("lost_found_reports").select("id, title").eq("id", c.lost_found_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const initial = ((recent ?? []) as Msg[]).reverse();
  const lastOther = [...initial].reverse().find((m) => m.sender_id !== userId);
  return (
    <div>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div>
          <Link href="/messages" className="text-sm text-muted md:hidden">← Messages</Link>
          <h2 className="font-semibold">{other?.display_name ?? "Student"}</h2>
          {req && <Link href={`/requests/${req.id}`} className="text-sm underline">Request: {req.title}</Link>}
          {lf && <Link href={`/lost-found/${lf.id}`} className="text-sm underline">Lost and found: {lf.title}</Link>}
          {listing && <Link href={`/listing/${listing.id}`} className="text-sm underline">{listing.title} · {formatMoney(listing.price_minor, listing.currency_code)}{listing.status !== "active" ? ` (${listing.status})` : ""}</Link>}
        </div>
        <div className="flex items-center gap-3">
          {lastOther && <ReportDialog type="message" targetId={lastOther.id} label="Report last message" />}
          <ReportDialog type="user" targetId={otherId} label="Report user" />
          {blocked
            ? <form action={unblockUser.bind(null, otherId, id)}><button className="min-h-9 text-sm underline">Unblock</button></form>
            : <form action={blockUser.bind(null, otherId, id)}><button className="min-h-9 text-sm underline">Block</button></form>}
        </div>
      </header>
      <p className="mb-3 text-xs text-muted">Messaging isn't an agreement to trade. Meet in a public place on campus and keep your phone number private until you're comfortable sharing it.</p>
      <Chat key={id} conversationId={id} me={userId} initial={initial} canSend={!blocked} />
    </div>
  );
}
