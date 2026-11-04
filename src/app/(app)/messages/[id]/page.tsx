import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/session";
import { formatMoney } from "@/lib/money";
import { Chat, type Msg } from "@/components/chat";
import { ConversationMenu } from "@/components/conversation-menu";

export const metadata = { title: "Conversation" };
const PAGE = 40;

export default async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, timezone } = await getContext();
  const { data: c } = await supabase.from("conversations").select("id, buyer_id, seller_id, listing_id, request_id, lost_found_id").eq("id", id).maybeSingle();
  if (!c) notFound();                                   // not a participant == does not exist
  const otherId = c.buyer_id === userId ? c.seller_id : c.buyer_id;
  const [{ data: other }, { data: listing }, { data: recent }, { data: blocked }, { data: peerRead }, { data: req }, { data: lf }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", otherId).maybeSingle(),
    c.listing_id ? supabase.from("listings").select("id, title, price_minor, currency_code, status").eq("id", c.listing_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: false }).limit(PAGE + 1),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", userId).eq("blocked_id", otherId).maybeSingle(),
    supabase.rpc("peer_last_read", { p_conv: id }),
    c.request_id ? supabase.from("requests").select("id, title").eq("id", c.request_id).maybeSingle() : Promise.resolve({ data: null }),
    c.lost_found_id ? supabase.from("lost_found_reports").select("id, title").eq("id", c.lost_found_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const rows = (recent ?? []) as Msg[];
  const hasEarlier = rows.length > PAGE;
  const initial = rows.slice(0, PAGE).reverse();
  const lastOther = [...initial].reverse().find((m) => m.sender_id !== userId);
  const name = other?.display_name ?? "Student";
  return (
    <div>
      <header className="mb-4 flex items-start justify-between gap-3 border-b border-line pb-4">
        <div className="min-w-0">
          <h2 className="truncate text-[1.6rem]">{name}</h2>
          {listing && <Link href={`/listing/${listing.id}`} className="link text-sm">{listing.title}, {formatMoney(listing.price_minor, listing.currency_code)}{listing.status !== "active" ? ` (${listing.status})` : ""}</Link>}
          {req && <Link href={`/requests/${req.id}`} className="link text-sm">Request: {req.title}</Link>}
          {lf && <Link href={`/lost-found/${lf.id}`} className="link text-sm">Lost and found: {lf.title}</Link>}
        </div>
        <ConversationMenu otherId={otherId} conversationId={id} lastOtherMessageId={lastOther?.id} blocked={!!blocked} />
      </header>
      <Chat key={id} conversationId={id} me={userId} initial={initial} hasEarlier={hasEarlier} canSend={!blocked} timezone={timezone} peerReadAt={(peerRead as string | null) ?? null} />
      <p className="t-meta mt-4 text-[0.8125rem]">A message isn&rsquo;t an agreement to trade. Meet in a public place on campus, and share your phone number only when you choose to.</p>
    </div>
  );
}
