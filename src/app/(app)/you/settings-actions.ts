"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

// ── Profile update ────────────────────────────────────────────────────────────

const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(60, "Name must be 60 characters or fewer."),
});

export type SettingsState = { fieldErrors?: Record<string, string[]>; message?: string; ok?: boolean };

export async function updateProfile(_: SettingsState, form: FormData): Promise<SettingsState> {
  const p = profileSchema.safeParse({ display_name: form.get("display_name") });
  if (!p.success) return { fieldErrors: p.error.flatten().fieldErrors };

  const { supabase, userId } = await getContext();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: p.data.display_name })
    .eq("id", userId);

  if (error) return { message: "Couldn't save your changes. Please try again." };
  revalidatePath("/you");
  revalidatePath("/you/settings");
  return { ok: true };
}

// ── Account deletion ──────────────────────────────────────────────────────────

/**
 * Hard-deletes the authenticated user's account via the DB function.
 * Signs them out locally then redirects to /sign-in.
 *
 * The confirmation string ("DELETE") must be validated client-side before
 * this action is even called — the DB function is the authoritative gate.
 */
export async function deleteAccount(confirmation: string): Promise<{ error?: string }> {
  if (confirmation !== "DELETE") {
    return { error: "Type DELETE to confirm." };
  }

  // Use a fresh client so we can sign out after the DB row is gone.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  await removeStoredFiles(supabase, user.id);   // best effort; see helper

  const { error } = await supabase.rpc("delete_own_account");
  if (error) {
    return { error: "Account deletion failed. Please try again or contact support." };
  }

  // Session is now orphaned — sign out locally.
  await supabase.auth.signOut();
  redirect("/sign-in?deleted=1");
}

type Client = Awaited<ReturnType<typeof createClient>>;

/** Lists every object under `prefix` (two folder levels) and removes it. Failures are tolerated:
 *  a leftover file is less harmful than blocking a user's right to delete their account. */
async function removeUnder(supabase: Client, bucket: string, prefix: string) {
  const { data } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  const paths: string[] = [];
  for (const entry of data ?? []) {
    if (entry.id) { paths.push(`${prefix}/${entry.name}`); continue; }          // a file
    const { data: inner } = await supabase.storage.from(bucket).list(`${prefix}/${entry.name}`, { limit: 1000 });
    for (const f of inner ?? []) if (f.id) paths.push(`${prefix}/${entry.name}/${f.name}`);
  }
  if (paths.length) await supabase.storage.from(bucket).remove(paths);
}

async function removeStoredFiles(supabase: Client, userId: string) {
  try {
    await removeUnder(supabase, "listing-images", userId);            // {user}/{listing}/{file}
    await removeUnder(supabase, "lostfound-images", userId);          // {user}/{file}
    const { data: convs } = await supabase.from("conversations").select("id");
    for (const c of convs ?? []) await removeUnder(supabase, "message-images", `${c.id}/${userId}`);   // {conversation}/{user}/{file}
  } catch (e) {
    console.error("[deleteAccount] file cleanup failed", e instanceof Error ? e.message : "unknown");
  }
}
