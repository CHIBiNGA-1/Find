import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { AuthForm } from "@/components/auth-form";
import { signUp } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create account" };

export default function SignUp() {
  return (
    <main className="mx-auto max-w-sm px-[var(--space-gutter)] py-16">
      <p className="mb-6 text-4xl"><Wordmark /></p>
      <h1 className="font-serif text-3xl tracking-tight">Join your campus</h1>
      <p className="mb-2 mt-2 text-muted">f!nd is for verified university students. After you confirm your email, you choose your university and a moderator confirms your membership. Until then you can't see or post listings.</p>
      <p className="mb-6 text-sm text-muted">We only use your email to sign you in and send account notices. Your phone number is never required.</p>
      <AuthForm action={signUp} mode="sign-up" />
      <p className="mt-6 text-sm text-muted">Already have an account? <Link className="font-medium text-brand underline" href="/sign-in">Sign in</Link></p>
    </main>
  );
}
