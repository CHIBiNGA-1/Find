"use client";
import { useActionState } from "react";
import { createRequest, type CampusState } from "@/app/(app)/campus-actions";

const f = "field mt-1";

export function RequestForm({ categories, currency }: { categories: { id: string; name: string }[]; currency: string }) {
  const [s, action, pending] = useActionState<CampusState, FormData>(createRequest, {});
  const err = (k: string) => s.fieldErrors?.[k]?.[0];
  return (
    <form action={action} className="max-w-xl space-y-5" noValidate>
      <label className="label">What are you looking for?
        <input name="title" className={f} aria-invalid={!!err("title")} /><span className="err">{err("title")}</span></label>
      <label className="label">Details
        <textarea name="description" rows={4} className={f} /><span className="err">{err("description")}</span></label>
      <label className="label">Category (optional)
        <select name="categoryId" defaultValue="" className={f}><option value="">Any</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="label">Budget in {currency} (optional)
        <input name="budget" inputMode="decimal" className={f} aria-invalid={!!err("budget")} /><span className="err">{err("budget")}</span></label>
      <label className="label">Keep this open for
        <select name="days" defaultValue="14" className={f}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label>
      {s.message && <p role="alert" className="text-sm text-danger">{s.message}</p>}
      <button disabled={pending} className="btn btn-primary">{pending ? "Posting…" : "Post request"}</button>
    </form>
  );
}
