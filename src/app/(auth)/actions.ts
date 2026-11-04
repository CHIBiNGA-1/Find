"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { safeNext } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export type FormState = { message?: string; fieldErrors?: Record<string, string[]>; ok?: boolean };

const signInSchema = z.object({ email: z.string().trim().email("Enter a valid email address."), password: z.string().min(1, "Enter your password.") });
const signUpSchema = z.object({
  displayName: z.string().trim().min(2, "Use at least 2 characters.").max(60),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(10, "Use at least 10 characters."),
});

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // One message for every failure: no account enumeration.
  if (error) return { message: "That email and password don't match. Check them and try again." };
  const next = String(form.get("next") ?? "/");
  redirect(safeNext(next));
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.displayName }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error && error.status && error.status >= 500) return { message: "We couldn't create your account right now. Try again in a minute." };
  // Same response whether or not the email already exists.
  return { ok: true, message: "Check your email for a confirmation link, then sign in." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
