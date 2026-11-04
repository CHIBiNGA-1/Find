import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. SERVER ONLY, and used by exactly one thing: the push webhook, which has to read another person's
 * subscriptions. It bypasses RLS, so never import it from a page, action or component that acts on behalf of a signed-in user.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("push_not_configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
