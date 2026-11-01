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
      <button type="button" onClick={() => { setState("idle"); ref.current?.showModal(); }} className="min-h-9 text-sm text-muted underline">{label}</button>
      <dialog ref={ref} aria-labelledby={`rd-${targetId}`} className="m-auto w-[min(92vw,26rem)] rounded-[var(--radius-lg)] border border-line bg-surface p-5 backdrop:bg-black/40">
        <form method="dialog" onSubmit={(e) => {
          e.preventDefault(); const f = new FormData(e.currentTarget);
          start(async () => { const r = await reportContent(type, targetId, String(f.get("reason")), String(f.get("details") ?? "")); setState(r.ok ? "sent" : "error"); });
        }}>
          <h2 id={`rd-${targetId}`} className="font-semibold">{label}</h2>
          {state === "sent" ? <p role="status" className="mt-3 text-sm">Thanks. A moderator will review this report.</p> : (<>
            <label className="mt-3 block text-sm font-medium">Reason
              <select name="reason" required className="mt-1 block min-h-11 w-full rounded-[var(--radius-md)] border border-line px-3">{REASONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
            <label className="mt-3 block text-sm font-medium">Details (optional)
              <textarea name="details" maxLength={1000} rows={3} className="mt-1 block w-full rounded-[var(--radius-md)] border border-line px-3 py-2" /></label>
            {state === "error" && <p role="alert" className="mt-2 text-sm text-danger">We couldn't send your report. Try again.</p>}
          </>)}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => ref.current?.close()} className="min-h-11 rounded-[var(--radius-md)] border border-line px-4">{state === "sent" ? "Close" : "Cancel"}</button>
            {state !== "sent" && <button disabled={pending} className="min-h-11 rounded-[var(--radius-md)] bg-brand px-4 font-medium text-white disabled:opacity-60">Send report</button>}
          </div>
        </form>
      </dialog>
    </>
  );
}
