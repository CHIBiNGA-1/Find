import { timingSafeEqual } from "node:crypto";

/**
 * What a push notification says. Deliberately content-free: lock screens are public, so the message text is never sent,
 * only who it is from and that it is a message or a photo.
 */
export type PushPayload = { title: string; body: string; url: string; tag: string };

export function buildPayload(o: { senderName: string; hasImage: boolean; conversationId: string }): PushPayload {
  const name = o.senderName.trim().slice(0, 60) || "Someone";
  return { title: name, body: o.hasImage ? "Sent you a photo" : "Sent you a message", url: `/messages/${o.conversationId}`, tag: `conv-${o.conversationId}` };
}

/** Constant-time check of "Bearer <secret>". Rejects missing or malformed headers and unequal lengths without leaking timing. */
export function isAuthorizedWebhook(header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const m = /^Bearer (.+)$/.exec(header);
  if (!m) return false;
  const a = Buffer.from(m[1]!), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Only same-origin paths may be opened from a notification click. */
export function safeNotificationUrl(url: unknown): string {
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//") && !/[\\\u0000-\u001f]/.test(url) ? url : "/messages";
}
