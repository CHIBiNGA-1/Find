import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPayload, isAuthorizedWebhook, safeNotificationUrl } from "@/lib/push";
import { notifyForMessage, type Deps, type Sub } from "@/lib/push-notify";
import { urlBase64ToUint8Array } from "@/lib/push-client";

describe("buildPayload", () => {
  it("never includes message text, only who and what kind", () => {
    const p = buildPayload({ senderName: "Chanda", hasImage: false, conversationId: "c1" });
    assert.deepEqual(p, { title: "Chanda", body: "Sent you a message", url: "/messages/c1", tag: "conv-c1" });
    assert.equal(buildPayload({ senderName: "Chanda", hasImage: true, conversationId: "c1" }).body, "Sent you a photo");
  });
  it("falls back for empty names and caps long ones", () => {
    assert.equal(buildPayload({ senderName: "  ", hasImage: false, conversationId: "c" }).title, "Someone");
    assert.equal(buildPayload({ senderName: "x".repeat(200), hasImage: false, conversationId: "c" }).title.length, 60);
  });
});
describe("isAuthorizedWebhook", () => {
  it("accepts only the exact bearer secret", () => {
    assert.equal(isAuthorizedWebhook("Bearer s3cret", "s3cret"), true);
    for (const bad of [null, "", "s3cret", "Bearer ", "Bearer s3cre", "Bearer s3crets", "bearer s3cret", "Basic s3cret"]) assert.equal(isAuthorizedWebhook(bad, "s3cret"), false, String(bad));
  });
  it("rejects everything when no secret is configured", () => assert.equal(isAuthorizedWebhook("Bearer ", ""), false));
});
describe("safeNotificationUrl", () => {
  it("allows same-origin paths and falls back otherwise", () => {
    assert.equal(safeNotificationUrl("/messages/abc"), "/messages/abc");
    for (const bad of ["https://evil.test", "//evil.test", "/\\evil", "javascript:1", 5, null, undefined]) assert.equal(safeNotificationUrl(bad), "/messages", String(bad));
  });
});
describe("urlBase64ToUint8Array", () => {
  it("decodes URL-safe base64 without padding", () => {
    assert.deepEqual([...urlBase64ToUint8Array("AQID")], [1, 2, 3]);
    assert.deepEqual([...urlBase64ToUint8Array("-_8")], [251, 255]);        // - and _ map to + and /
  });
});

const sub = (id: string): Sub => ({ id, endpoint: `https://push.test/${id}`, p256dh: "k", auth: "a" });
function fake(over: Partial<Deps> & { subs?: Sub[]; dead?: string[]; blocked?: boolean } = {}) {
  const sent: string[] = [], removed: string[] = [];
  const deps: Deps = {
    getConversation: async () => ({ buyer_id: "buyer", seller_id: "seller" }),
    isBlocked: async () => over.blocked ?? false,
    getDisplayName: async () => "Chanda",
    getSubscriptions: async (u) => { sent.push(`subs-for:${u}`); return over.subs ?? [sub("s1")]; },
    send: async (s) => (over.dead?.includes(s.id) ? { ok: false, gone: true } : { ok: true }),
    removeSubscription: async (id) => { removed.push(id); },
    ...over,
  };
  return { deps, log: sent, removed };
}
const msg = { id: "m", conversation_id: "c", sender_id: "buyer", image_path: null };

describe("notifyForMessage", () => {
  it("notifies the other participant, never the sender", async () => {
    const f = fake(); const r = await notifyForMessage(msg, f.deps);
    assert.equal(r.sent, 1); assert.ok(f.log.includes("subs-for:seller")); assert.ok(!f.log.includes("subs-for:buyer"));
    const f2 = fake(); await notifyForMessage({ ...msg, sender_id: "seller" }, f2.deps); assert.ok(f2.log.includes("subs-for:buyer"));
  });
  it("ignores messages from someone who is not in the conversation", async () => {
    assert.deepEqual(await notifyForMessage({ ...msg, sender_id: "stranger" }, fake().deps), { sent: 0, removed: 0, skipped: "not_participant" });
  });
  it("ignores a conversation that does not exist", async () => {
    assert.equal((await notifyForMessage(msg, fake({ getConversation: async () => null }).deps)).skipped, "not_participant");
  });
  it("sends nothing when either side has blocked the other", async () => {
    const f = fake({ blocked: true }); assert.equal((await notifyForMessage(msg, f.deps)).skipped, "blocked"); assert.equal(f.log.length, 0);
  });
  it("does nothing when the recipient has no subscriptions", async () => assert.equal((await notifyForMessage(msg, fake({ subs: [] }).deps)).skipped, "no_subscriptions"));
  it("removes endpoints the push service reports as gone, and still delivers to the rest", async () => {
    const f = fake({ subs: [sub("live"), sub("dead")], dead: ["dead"] });
    assert.deepEqual(await notifyForMessage(msg, f.deps), { sent: 1, removed: 1 }); assert.deepEqual(f.removed, ["dead"]);
  });
  it("keeps endpoints on transient failures", async () => {
    const f = fake({ send: async () => ({ ok: false, gone: false }) }); assert.deepEqual(await notifyForMessage(msg, f.deps), { sent: 0, removed: 0 }); assert.deepEqual(f.removed, []);
  });
  it("caps how many devices one message fans out to", async () => {
    const many = Array.from({ length: 25 }, (_, i) => sub(`s${i}`)); assert.equal((await notifyForMessage(msg, fake({ subs: many }).deps)).sent, 10);
  });
});
