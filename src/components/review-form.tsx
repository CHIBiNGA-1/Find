"use client";
import { useActionState } from "react";
import { submitReview, type ReviewState } from "@/app/(app)/exchange-actions";

export function ReviewForm({ exchangeId }: { exchangeId: string }) {
  const [s, action, pending] = useActionState<ReviewState, FormData>(submitReview.bind(null, exchangeId), {});
  return (
    <form action={action} className="max-w-xl space-y-6">
      <fieldset><legend className="label">Rating</legend>
        <div className="mt-2 flex gap-2">{[1, 2, 3, 4, 5].map((n) => <label key={n} className="pick !min-w-14 text-[1.125rem]"><input type="radio" name="rating" value={n} required className="sr-only" />{n}</label>)}</div>
        <p className="t-meta mt-2">1 is poor, 5 is excellent.</p></fieldset>
      <label className="label">Comment (optional)
        <textarea name="comment" rows={4} maxLength={1000} className="field mt-1" /></label>
      {s.message && <p role="alert" className="text-sm text-danger">{s.message}</p>}
      <button disabled={pending} className="btn btn-primary">{pending ? "Saving…" : "Submit review"}</button>
    </form>
  );
}
