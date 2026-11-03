"use client";
import { useRef, useState, useTransition } from "react";
import { reportContent } from "@/app/(app)/messages/actions";

const REASONS = [["spam", "Spam"], ["scam", "Scam or fraud"], ["prohibited", "Prohibited item"], ["harassment", "Harassment"], ["other", "Something else"]] as const;

export function ReportDialog({ type, targetId, label }: { type: "listing" | "message" | "user" | "request" | "lost_found" | "review"; targetId: string; label: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" onClick={() => { setState("idle"); ref.current?.showModal(); }} className="min-h-9 text-sm font-semibold text-muted underline hover:text-ink">{label}</button>
      <dialog ref={ref} aria-labelledby={`rd-${targetId}`} className="sheet" onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
        <div className="sheet-grab" aria-hidden="true" />
        <form method="dialog" onSubmit={(e) => {
          e.preventDefault(); const f = new FormData(e.currentTarget);
          start(async () => { const r = await reportContent(type, targetId, String(f.get("reason")), String(f.get("details") ?? "")); setState(r.ok ? "sent" : "error"); });
        }}>
          <h2 id={`rd-${targetId}`} className="text-[1.5rem]">{label}</h2>
          {state === "sent" ? <p role="status" className="mt-3 text-sm">Thanks. A moderator will review this report.</p> : (<>
            <label className="label mt-4">Reason
              <select name="reason" required className="field mt-1">{REASONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
            <label className="label mt-4">Details (optional)
              <textarea name="details" maxLength={1000} rows={3} className="field mt-1" /></label>
            {state === "error" && <p role="alert" className="mt-2 text-sm text-danger">We couldn't send your report. Try again.</p>}
          </>)}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => ref.current?.close()} className="btn btn-quiet">{state === "sent" ? "Close" : "Cancel"}</button>
            {state !== "sent" && <button disabled={pending} className="btn btn-primary">Send report</button>}
          </div>
        </form>
      </dialog>
    </>
  );
}
