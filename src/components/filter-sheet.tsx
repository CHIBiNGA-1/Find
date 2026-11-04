"use client";
import { useRef } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { CONDITIONS, CONDITION_LABEL } from "@/lib/listings/schema";
import { SORTS, SORT_LABEL, type Sort } from "@/lib/explore-params";

/** Filters and sort in one sheet. Fields belong to the surrounding GET form (id explore-filters), so "Show results" submits it. */
export function FilterSheet({ count, sort, hasQuery, min, max, conds, currency, resetHref }: { count: number; sort: Sort; hasQuery: boolean; min: string; max: string; conds: string[]; currency: string; resetHref: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (<>
    <button type="button" onClick={() => ref.current?.showModal()} className="chip"><Icon name="sliders" size={18} />Filter and sort
      {count > 0 && <span className="badge"><span className="sr-only">Active: </span>{count}</span>}</button>
    <dialog ref={ref} aria-label="Filter and sort" className="sheet" onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
      <div className="sheet-grab" aria-hidden="true" />
      <div className="flex items-center justify-between"><h2 className="text-[1.6rem]">Filter and sort</h2>
        <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="grid size-10 place-items-center rounded-full"><Icon name="close" size={22} /></button></div>
      <div className="mt-5 space-y-6">
        <fieldset><legend className="label mb-2">Sort by</legend>
          <div className="flex flex-wrap gap-2">{SORTS.filter((s) => s !== "relevant" || hasQuery).map((s) => <label key={s} className="pick"><input form="explore-filters" type="radio" name="sort" value={s} defaultChecked={sort === s} className="sr-only" />{SORT_LABEL[s]}</label>)}</div></fieldset>
        <div><p className="label mb-2" id="price-l">Price ({currency})</p>
          <div className="flex gap-2" role="group" aria-labelledby="price-l">
            <input form="explore-filters" name="min" inputMode="decimal" defaultValue={min} aria-label="Minimum price" placeholder="Min" className="field" />
            <input form="explore-filters" name="max" inputMode="decimal" defaultValue={max} aria-label="Maximum price" placeholder="Max" className="field" /></div></div>
        <fieldset><legend className="label mb-2">Condition</legend>
          <div className="flex flex-wrap gap-2">{CONDITIONS.map((c) => <label key={c} className="pick"><input form="explore-filters" type="checkbox" name="cond" value={c} defaultChecked={conds.includes(c)} className="sr-only" />{CONDITION_LABEL[c]}</label>)}</div></fieldset>
      </div>
      <div className="mt-8 flex gap-3"><Link href={resetHref} className="btn btn-quiet">Reset</Link><button form="explore-filters" type="submit" className="btn btn-primary flex-1">Show results</button></div>
    </dialog>
  </>);
}
