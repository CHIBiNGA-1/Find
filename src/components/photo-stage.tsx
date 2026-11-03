"use client";
import { useState } from "react";
import { Icon } from "@/components/icons";

type Img = { url: string; w: number; h: number; alt: string };

/** One large photo with a thumbnail strip. Fixed proportions, so nothing shifts while images load. */
export function PhotoStage({ images }: { images: Img[] }) {
  const [i, setI] = useState(0);
  const n = images.length, img = images[i];
  if (!img) return <div className="t-label grid aspect-[4/5] place-items-center rounded-[var(--radius-lg)] bg-sunken">No photo</div>;
  const go = (d: number) => setI((x) => (x + d + n) % n);
  const nav = "absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-[0_2px_10px_rgb(14_18_64/0.18)]";
  return (
    <div role="group" aria-roledescription="carousel" aria-label="Photos">
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-sunken">
        <div className="grid aspect-[4/5] place-items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} width={img.w} height={img.h} alt={img.alt} className="max-h-full max-w-full object-contain" />
        </div>
        {n > 1 && (<>
          <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className={`${nav} left-3`}><Icon name="arrow" size={18} className="rotate-180" /></button>
          <button type="button" onClick={() => go(1)} aria-label="Next photo" className={`${nav} right-3`}><Icon name="arrow" size={18} /></button>
          <p aria-hidden="true" className="absolute bottom-3 right-3 rounded-full bg-ink px-2.5 py-1 text-xs font-bold tabular-nums text-white">{i + 1} / {n}</p></>)}
      </div>
      {n > 1 && (
        <ul className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {images.map((m, k) => (
            <li key={k} className="shrink-0">
              <button type="button" onClick={() => setI(k)} aria-label={`Photo ${k + 1} of ${n}`} aria-current={k === i}
                className={`block size-16 overflow-hidden rounded-[var(--radius-sm)] bg-sunken ${k === i ? "ring-2 ring-ink ring-offset-2" : "opacity-70 hover:opacity-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt="" className="size-full object-cover" /></button></li>))}
        </ul>)}
      <p aria-live="polite" className="sr-only">Photo {i + 1} of {n}</p>
    </div>
  );
}
