"use server";
import { z } from "zod";
import { headers } from "next/headers";
import { getContext } from "@/lib/session";

const sub = z.object({ endpoint: z.string().url().max(2048).startsWith("https://"), p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(128) });

/** Stores this browser's push subscription for the signed-in person (the database function enforces ownership and https). */
export async function savePushSubscription(raw: unknown): Promise<{ ok: boolean }> {
  const parsed = sub.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const { supabase } = await getContext();
  const ua = (await headers()).get("user-agent");
  const { error } = await supabase.rpc("register_push_subscription", { p_endpoint: parsed.data.endpoint, p_p256dh: parsed.data.p256dh, p_auth: parsed.data.auth, p_user_agent: ua });
  return { ok: !error };
}

export async function removePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  if (typeof endpoint !== "string" || endpoint.length > 2048) return { ok: false };
  const { supabase, userId } = await getContext();
  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
  return { ok: !error };
}
