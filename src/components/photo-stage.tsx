"use client";
import { useState } from "react";
import { Icon } from "@/components/icons";

type Img = { url: string; w: number; h: number; alt: string };

/** One photograph at a time on a quiet stage. Fixed proportions, so nothing shifts while images load. */
export function PhotoStage({ images }: { images: Img[] }) {
  const [i, setI] = useState(0);
  const n = images.length, img = images[i];
  if (!img) return <div className="t-label grid aspect-[4/5] place-items-center rounded-[28px] bg-[var(--sand-100)]">No photo</div>;
  const go = (d: number) => setI((x) => (x + d + n) % n);
  return (
    <div className="relative rounded-[28px] bg-[var(--sand-100)]" role="group" aria-roledescription="carousel" aria-label="Photos">
      <div className="grid aspect-[4/5] place-items-center p-6 sm:p-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} width={img.w} height={img.h} alt={img.alt} className="max-h-full max-w-full rounded-[10px] object-contain" />
      </div>
      {n > 1 && (<>
        <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 shadow-[var(--shadow-soft)]"><Icon name="arrow" size={18} className="rotate-180" /></button>
        <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 shadow-[var(--shadow-soft)]"><Icon name="arrow" size={18} /></button>
        <ul className="absolute inset-x-0 bottom-3 flex justify-center">
          {images.map((_, k) => (
            <li key={k}><button type="button" onClick={() => setI(k)} aria-label={`Photo ${k + 1} of ${n}`} aria-current={k === i} className="grid size-6 place-items-center">
              <span className={`block rounded-full transition-all ${k === i ? "h-2 w-5 bg-[var(--ink)]" : "size-2 bg-[var(--ink)]/25"}`} /></button></li>))}
        </ul></>)}
      <p aria-live="polite" className="sr-only">Photo {i + 1} of {n}</p>
    </div>
  );
}
