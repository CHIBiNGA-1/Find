"use client";
import { useRef, useState, useTransition } from "react";

/** A button that asks first. Used for anything that can't be undone. */
export function ConfirmAction({ action, label, title, body, confirmLabel, danger = true, small = true }: { action: () => Promise<unknown>; label: string; title: string; body: string; confirmLabel: string; danger?: boolean; small?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  return (<>
    <button type="button" onClick={() => { setFailed(false); ref.current?.showModal(); }} className={`btn ${danger ? "btn-danger-quiet" : "btn-quiet"} ${small ? "btn-sm" : ""}`}>{label}</button>
    <dialog ref={ref} aria-labelledby="ca-t" className="sheet" onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
      <div className="sheet-grab" aria-hidden="true" />
      <h2 id="ca-t" className="text-[1.5rem]">{title}</h2><p className="mt-2 text-muted">{body}</p>
      {failed && <p role="alert" className="err mt-3">That didn&rsquo;t work. Try again.</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn btn-quiet" onClick={() => ref.current?.close()}>Cancel</button>
        <button type="button" disabled={pending} className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
          onClick={() => start(async () => { try { await action(); ref.current?.close(); } catch { setFailed(true); } })}>{pending ? "Working…" : confirmLabel}</button>
      </div>
    </dialog>
  </>);
}
