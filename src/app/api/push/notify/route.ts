import webpush from "web-push";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedWebhook } from "@/lib/push";
import { notifyForMessage, type Deps } from "@/lib/push-notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Supabase Database Webhook payload for INSERT on public.messages.
const body = z.object({
  type: z.string(), table: z.string(),
  record: z.object({ id: z.string().uuid(), conversation_id: z.string().uuid(), sender_id: z.string().uuid(), image_path: z.string().nullable().optional() }),
});

export async function POST(req: Request) {
  const { PUSH_WEBHOOK_SECRET: secret, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subject, NEXT_PUBLIC_VAPID_PUBLIC_KEY: pub, SUPABASE_SERVICE_ROLE_KEY: service } = process.env;
  if (!secret || !priv || !subject || !pub || !service) return Response.json({ error: "push_not_configured" }, { status: 503 });
  if (!isAuthorizedWebhook(req.headers.get("authorization"), secret)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (Number(req.headers.get("content-length") ?? 0) > 20_000) return Response.json({ error: "too_large" }, { status: 413 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  if (parsed.data.type !== "INSERT" || parsed.data.table !== "messages") return Response.json({ ignored: true });

  webpush.setVapidDetails(subject, pub, priv);
  const db = createAdminClient();
  const deps: Deps = {
    async getConversation(id) { const { data } = await db.from("conversations").select("buyer_id, seller_id").eq("id", id).maybeSingle(); return data; },
    async isBlocked(a, b) { const { data } = await db.from("blocks").select("blocker_id").or(`and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`).limit(1); return !!data?.length; },
    async getDisplayName(id) { const { data } = await db.from("profiles").select("display_name").eq("id", id).maybeSingle(); return data?.display_name ?? null; },
    async getSubscriptions(userId) { const { data } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId); return data ?? []; },
    async send(sub, payload) {
      try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 3600, urgency: "normal" }); return { ok: true }; }
      catch (e) { const code = (e as { statusCode?: number }).statusCode; return { ok: false, gone: code === 404 || code === 410 }; }
    },
    async removeSubscription(id) { await db.from("push_subscriptions").delete().eq("id", id); },
  };
  const outcome = await notifyForMessage({ ...parsed.data.record, image_path: parsed.data.record.image_path ?? null }, deps);
  return Response.json(outcome);
}
