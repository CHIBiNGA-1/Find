"use client";
import { useActionState } from "react";
import { createRequest, type CampusState } from "@/app/(app)/campus-actions";

const f = "mt-1 block w-full min-h-11 rounded-[var(--radius-md)] border border-line bg-surface px-3 text-base aria-[invalid=true]:border-danger";

export function RequestForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [s, action, pending] = useActionState<CampusState, FormData>(createRequest, {});
  const err = (k: string) => s.fieldErrors?.[k]?.[0];
  return (
    <form action={action} className="max-w-xl space-y-5" noValidate>
      <label className="block text-sm font-medium">What are you looking for?
        <input name="title" className={f} aria-invalid={!!err("title")} /><span className="text-danger">{err("title")}</span></label>
      <label className="block text-sm font-medium">Details
        <textarea name="description" rows={4} className={f} /><span className="text-danger">{err("description")}</span></label>
      <label className="block text-sm font-medium">Category (optional)
        <select name="categoryId" defaultValue="" className={f}><option value="">Any</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="block text-sm font-medium">Budget in ZMW (optional)
        <input name="budget" inputMode="decimal" className={f} aria-invalid={!!err("budget")} /><span className="text-danger">{err("budget")}</span></label>
      <label className="block text-sm font-medium">Keep this open for
        <select name="days" defaultValue="14" className={f}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label>
      {s.message && <p role="alert" className="text-sm text-danger">{s.message}</p>}
      <button disabled={pending} className="min-h-11 rounded-[var(--radius-md)] bg-brand px-5 font-medium text-white disabled:opacity-60">{pending ? "Posting…" : "Post request"}</button>
    </form>
  );
}
