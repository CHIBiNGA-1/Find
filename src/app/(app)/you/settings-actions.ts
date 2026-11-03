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

  try {
    await removeStoredFiles(supabase, user.id);
  } catch (error) {
    console.error("[deleteAccount] storage cleanup failed", error instanceof Error ? error.message : "unknown");
    return { error: "We couldn't safely remove all of your uploaded files. Your account has not been deleted. Please try again." };
  }

  const { error } = await supabase.rpc("delete_own_account");
  if (error) {
    return { error: "Account deletion failed. Please try again or contact support." };
  }

  // Session is now orphaned — sign out locally.
  await supabase.auth.signOut();
  redirect("/sign-in?deleted=1");
}

type Client = Awaited<ReturnType<typeof createClient>>;

/** Remove every object below a storage prefix, including arbitrarily nested folders.
 *  Listing is paginated and errors are surfaced so account deletion never reports
 *  success while leaving user-uploaded content behind. */
async function listAll(supabase: Client, bucket: string, prefix: string) {
  const entries: Array<{ name: string; id: string | null }> = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    entries.push(...(data ?? []).map((entry) => ({ name: entry.name, id: entry.id ?? null })));
    if (!data || data.length < pageSize) break;
  }
  return entries;
}

async function removeUnder(supabase: Client, bucket: string, prefix: string): Promise<void> {
  const entries = await listAll(supabase, bucket, prefix);
  const paths: string[] = [];
  for (const entry of entries) {
    const path = `${prefix}/${entry.name}`;
    if (entry.id) paths.push(path);
    else await removeUnder(supabase, bucket, path);
  }
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await supabase.storage.from(bucket).remove(paths.slice(index, index + 100));
    if (error) throw error;
  }
}

async function removeStoredFiles(supabase: Client, userId: string): Promise<void> {
  await removeUnder(supabase, "listing-images", userId);   // {user}/{listing}/{file}
  await removeUnder(supabase, "lostfound-images", userId); // {user}/{file}

  const { data: conversations, error } = await supabase.from("conversations").select("id");
  if (error) throw error;
  for (const conversation of conversations ?? []) {
    await removeUnder(supabase, "message-images", `${conversation.id}/${userId}`);
  }
}
