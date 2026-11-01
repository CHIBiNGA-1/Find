import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { AuthForm } from "@/components/auth-form";
import { signIn } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <main className="mx-auto max-w-sm px-[var(--space-gutter)] py-16">
      <p className="mb-6 text-4xl"><Wordmark /></p>
      <h1 className="font-serif text-3xl tracking-tight">Welcome back</h1>
      <p className="mb-6 mt-2 text-muted">Sign in to buy, sell and message students at your university.</p>
      {error === "link" && <p role="alert" className="mb-4 text-sm text-danger">That confirmation link has expired. Sign in, or create your account again.</p>}
      <AuthForm action={signIn} mode="sign-in" next={next} />
      <p className="mt-6 text-sm text-muted">New here? <Link className="font-medium text-brand underline" href="/sign-up">Create an account</Link></p>
    </main>
  );
}
