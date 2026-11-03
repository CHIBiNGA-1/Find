"use client";
import { useRef } from "react";
import { Icon } from "@/components/icons";

/** A chip that opens a bottom sheet. The fields live inside the surrounding GET form, so Apply just submits it. */
export function FilterSheet({ count, children }: { count: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className="chip"><Icon name="sliders" size={18} />Filters
        {count > 0 && <span className="grid size-5 place-items-center rounded-full bg-hl text-[0.6875rem] font-extrabold text-ink"><span className="sr-only">Active: </span>{count}</span>}</button>
      <dialog ref={ref} aria-label="Filters" className="sheet" onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
        <div className="sheet-grab" aria-hidden="true" />
        <div className="flex items-center justify-between"><h2 className="text-[1.75rem]">Filters</h2>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Close filters" className="grid size-10 place-items-center rounded-full"><Icon name="plus" size={24} className="rotate-45" /></button></div>
        <div className="mt-5 space-y-6">{children}</div>
        <button type="submit" className="btn btn-primary mt-8 w-full">Show results</button>
      </dialog>
    </>
  );
}
