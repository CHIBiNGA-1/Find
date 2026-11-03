"use client";
import { useActionState } from "react";
import type { FormState } from "@/app/(auth)/actions";

type Props = { action: (s: FormState, f: FormData) => Promise<FormState>; mode: "sign-in" | "sign-up"; next?: string };
const input = "field mt-1";

export function AuthForm({ action, mode, next }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const err = (k: string) => state.fieldErrors?.[k]?.[0];
  if (state.ok) return <p role="status" className="card p-5">{state.message}</p>;
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {mode === "sign-up" && (
        <label className="label">Name
          <input name="displayName" autoComplete="name" required aria-invalid={!!err("displayName")} aria-describedby="displayName-e" className={input} />
          <span id="displayName-e" className="text-danger">{err("displayName")}</span>
        </label>
      )}
      <label className="label">Email
        <input name="email" type="email" autoComplete="email" required aria-invalid={!!err("email")} aria-describedby="email-e" className={input} />
        <span id="email-e" className="text-danger">{err("email")}</span>
      </label>
      <label className="label">Password
        <input name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required aria-invalid={!!err("password")} aria-describedby="password-e" className={input} />
        <span id="password-e" className="text-danger">{err("password")}</span>
      </label>
      {state.message && <p role="alert" className="text-sm text-danger">{state.message}</p>}
      <button disabled={pending} className="btn btn-primary w-full">
        {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
