"use client";
import { useActionState } from "react";
import { submitReview, type ReviewState } from "@/app/(app)/exchange-actions";

export function ReviewForm({ exchangeId }: { exchangeId: string }) {
  const [s, action, pending] = useActionState<ReviewState, FormData>(submitReview.bind(null, exchangeId), {});
  return (
    <form action={action} className="max-w-xl space-y-4">
      <fieldset><legend className="text-sm font-medium">Rating</legend>
        <div className="mt-1 flex gap-3">{[1, 2, 3, 4, 5].map((n) => <label key={n} className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-[var(--radius-md)] border border-line bg-surface px-3"><input type="radio" name="rating" value={n} required />{n}</label>)}</div>
        <p className="mt-1 text-xs text-muted">1 is poor, 5 is excellent.</p></fieldset>
      <label className="block text-sm font-medium">Comment (optional)
        <textarea name="comment" rows={4} maxLength={1000} className="mt-1 block w-full rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2" /></label>
      {s.message && <p role="alert" className="text-sm text-danger">{s.message}</p>}
      <button disabled={pending} className="min-h-11 rounded-[var(--radius-md)] bg-brand px-5 font-medium text-white disabled:opacity-60">{pending ? "Saving…" : "Submit review"}</button>
    </form>
  );
}
