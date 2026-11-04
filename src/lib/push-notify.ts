import { buildPayload } from "@/lib/push";

export type Sub = { id: string; endpoint: string; p256dh: string; auth: string };
export type MessageRecord = { id: string; conversation_id: string; sender_id: string; image_path: string | null };
export type Deps = {
  getConversation(id: string): Promise<{ buyer_id: string; seller_id: string } | null>;
  isBlocked(a: string, b: string): Promise<boolean>;                    // either direction
  getDisplayName(userId: string): Promise<string | null>;
  getSubscriptions(userId: string): Promise<Sub[]>;
  send(sub: Sub, payload: string): Promise<{ ok: true } | { ok: false; gone: boolean }>;
  removeSubscription(id: string): Promise<void>;
};
export type Outcome = { sent: number; removed: number; skipped?: "not_participant" | "blocked" | "no_subscriptions" };
const MAX_DEVICES = 10;

/** Decides who (if anyone) is notified about a new message, sends, and prunes endpoints the push service says are dead. */
export async function notifyForMessage(msg: MessageRecord, deps: Deps): Promise<Outcome> {
  const conv = await deps.getConversation(msg.conversation_id);
  if (!conv || (msg.sender_id !== conv.buyer_id && msg.sender_id !== conv.seller_id)) return { sent: 0, removed: 0, skipped: "not_participant" };
  const recipient = msg.sender_id === conv.buyer_id ? conv.seller_id : conv.buyer_id;
  if (await deps.isBlocked(recipient, msg.sender_id)) return { sent: 0, removed: 0, skipped: "blocked" };
  const subs = (await deps.getSubscriptions(recipient)).slice(0, MAX_DEVICES);
  if (!subs.length) return { sent: 0, removed: 0, skipped: "no_subscriptions" };
  const payload = JSON.stringify(buildPayload({ senderName: (await deps.getDisplayName(msg.sender_id)) ?? "", hasImage: !!msg.image_path, conversationId: msg.conversation_id }));
  let sent = 0, removed = 0;
  for (const s of subs) {
    const r = await deps.send(s, payload);
    if (r.ok) sent++; else if (r.gone) { await deps.removeSubscription(s.id); removed++; }
  }
  return { sent, removed };
}
